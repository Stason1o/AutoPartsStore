package md.sacramento.catalog;

import md.sacramento.common.NotFoundException;
import md.sacramento.common.SlugUtil;
import md.sacramento.media.ProductPhotoRepository;
import md.sacramento.pricing.PricingService;
import md.sacramento.vehicles.ProductVehicle;
import md.sacramento.vehicles.ProductVehicleRepository;
import md.sacramento.vehicles.Vehicle;
import md.sacramento.vehicles.VehicleRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
public class ProductService {

    private final ProductRepository products;
    private final CategoryRepository categories;
    private final ProductPhotoRepository photos;
    private final ProductVehicleRepository productVehicles;
    private final VehicleRepository vehicles;
    private final PricingService pricingService;

    public ProductService(ProductRepository products, CategoryRepository categories,
                          ProductPhotoRepository photos, ProductVehicleRepository productVehicles,
                          VehicleRepository vehicles, PricingService pricingService) {
        this.products = products;
        this.categories = categories;
        this.photos = photos;
        this.productVehicles = productVehicles;
        this.vehicles = vehicles;
        this.pricingService = pricingService;
    }

    @Transactional(readOnly = true)
    public Page<ProductDtos.PublicListItem> publicSearch(ProductFilter filter, Pageable pageable) {
        Page<Product> page = products.findAll(ProductSpecifications.matches(filter), pageable);
        Map<Long, Long> mainPhotos = mainPhotoIds(page.getContent());
        return page.map(p -> new ProductDtos.PublicListItem(
                p.getId(), p.getSku(), p.getName(), p.getSlug(), p.getBrand(),
                p.getRetailPrice(), Math.max(0, p.availableQty()),
                mainPhotos.get(p.getId())));
    }

    @Transactional(readOnly = true)
    public ProductDtos.PublicDetail publicDetail(String slug) {
        Product p = products.findBySlug(slug)
                .filter(Product::isActive)
                .orElseThrow(() -> new NotFoundException("Товар не найден: " + slug));
        List<String> fits = productVehicles.findByIdProductId(p.getId()).stream()
                .map(pv -> pv.getId().getVehicleId())
                .collect(Collectors.collectingAndThen(Collectors.toList(), vehicles::findAllById))
                .stream().map(Vehicle::display).sorted().toList();
        return new ProductDtos.PublicDetail(
                p.getId(), p.getSku(), p.getName(), p.getSlug(), p.getBrand(), p.getDescription(),
                p.getRetailPrice(), Math.max(0, p.availableQty()),
                p.getOemNumbers().stream().map(OemNumber::getOemNumber).toList(),
                photos.findIdsByProductId(p.getId()),
                fits,
                p.getCategory() != null ? p.getCategory().getId() : null,
                p.getCategory() != null ? p.getCategory().getName() : null);
    }

    @Transactional(readOnly = true)
    public Page<ProductDtos.AdminProduct> adminSearch(ProductFilter filter, Pageable pageable) {
        return products.findAll(ProductSpecifications.matches(filter), pageable)
                .map(ProductDtos.AdminProduct::of);
    }

    @Transactional(readOnly = true)
    public ProductDtos.AdminProduct adminGet(Long id) {
        return ProductDtos.AdminProduct.of(getOrThrow(id));
    }

    @Transactional
    public ProductDtos.AdminProduct create(ProductDtos.ProductRequest request) {
        if (products.existsBySku(request.sku().trim())) {
            throw new IllegalStateException("Товар с таким артикулом уже существует: " + request.sku());
        }
        Product p = new Product();
        p.setSku(request.sku().trim());
        p.setSlug(uniqueSlug(request.sku() + "-" + request.name()));
        apply(p, request);
        return ProductDtos.AdminProduct.of(products.save(p));
    }

    @Transactional
    public ProductDtos.AdminProduct update(Long id, ProductDtos.ProductRequest request) {
        Product p = getOrThrow(id);
        if (!p.getSku().equals(request.sku().trim()) && products.existsBySku(request.sku().trim())) {
            throw new IllegalStateException("Товар с таким артикулом уже существует: " + request.sku());
        }
        p.setSku(request.sku().trim());
        apply(p, request);
        return ProductDtos.AdminProduct.of(products.save(p));
    }

    @Transactional
    public void delete(Long id) {
        Product p = getOrThrow(id);
        productVehicles.deleteByIdProductId(id);
        products.delete(p);
    }

    Product getOrThrow(Long id) {
        return products.findById(id)
                .orElseThrow(() -> new NotFoundException("Товар не найден: " + id));
    }

    private void apply(Product p, ProductDtos.ProductRequest r) {
        p.setName(r.name());
        p.setBrand(r.brand());
        p.setDescription(r.description());
        p.setCategory(r.categoryId() != null
                ? categories.findById(r.categoryId())
                    .orElseThrow(() -> new NotFoundException("Категория не найдена: " + r.categoryId()))
                : null);
        p.setPurchasePrice(r.purchasePrice());
        if (r.purchaseCurrency() != null) {
            String currency = r.purchaseCurrency().toUpperCase();
            if (!currency.equals("USD") && !currency.equals("MDL") && !currency.equals("EUR")) {
                throw new IllegalArgumentException("Валюта закупки должна быть USD, EUR или MDL");
            }
            p.setPurchaseCurrency(currency);
        }
        p.setMarkupPercent(r.markupPercent());
        p.setRetailPriceManual(Boolean.TRUE.equals(r.retailPriceManual()));
        if (p.isRetailPriceManual() || r.retailPrice() != null) {
            p.setRetailPrice(r.retailPrice());
        }
        if (!p.isRetailPriceManual()) {
            // автоцена: закупка × курс × наценка; если данных нет — оставляем как было
            pricingService.priceFor(p).ifPresent(p::setRetailPrice);
        }
        p.setWholesalePrice(r.wholesalePrice());
        if (r.stockQty() != null) {
            p.setStockQty(r.stockQty());
        }
        p.setShelf(r.shelf());
        p.setAdminNote(r.adminNote());
        p.setActive(r.active() == null || r.active());
        p.getOemNumbers().clear();
        if (r.oemNumbers() != null) {
            r.oemNumbers().stream()
                    .filter(s -> s != null && !s.isBlank())
                    .map(OemNumber::new)
                    .distinct()
                    .forEach(p.getOemNumbers()::add);
        }
    }

    private Map<Long, Long> mainPhotoIds(List<Product> items) {
        if (items.isEmpty()) {
            return Map.of();
        }
        return photos.findMainPhotoIds(items.stream().map(Product::getId).toList()).stream()
                .collect(Collectors.toMap(
                        ProductPhotoRepository.MainPhotoRow::getProductId,
                        ProductPhotoRepository.MainPhotoRow::getId));
    }

    private String uniqueSlug(String source) {
        String base = SlugUtil.slugify(source);
        String slug = base;
        int i = 2;
        while (products.existsBySlug(slug)) {
            slug = base + "-" + i++;
        }
        return slug;
    }
}
