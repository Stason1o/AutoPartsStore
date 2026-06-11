package md.sacramento.catalog;

import jakarta.validation.Valid;
import md.sacramento.common.NotFoundException;
import md.sacramento.vehicles.VehicleRepository;
import md.sacramento.vehicles.vin.VinService;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.List;
import java.util.Set;

@RestController
@RequestMapping("/api/admin/products")
public class AdminProductController {

    private final ProductService service;
    private final CategoryService categoryService;
    private final ProductRepository products;
    private final VehicleRepository vehicles;

    public AdminProductController(ProductService service, CategoryService categoryService,
                                  ProductRepository products, VehicleRepository vehicles) {
        this.service = service;
        this.categoryService = categoryService;
        this.products = products;
        this.vehicles = vehicles;
    }

    @GetMapping
    public Page<ProductDtos.AdminProduct> search(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) String brand,
            @RequestParam(defaultValue = "false") boolean inStock,
            @RequestParam(required = false) BigDecimal priceMin,
            @RequestParam(required = false) BigDecimal priceMax,
            @RequestParam(defaultValue = "false") boolean includeInactive,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @RequestParam(defaultValue = "name") String sort,
            @RequestParam(defaultValue = "asc") String dir) {
        Set<Long> categoryIds = categoryId != null ? categoryService.subtreeIds(categoryId) : null;
        ProductFilter filter = new ProductFilter(search, categoryIds, null, brand,
                inStock, priceMin, priceMax, !includeInactive);
        return service.adminSearch(filter, ProductController.pageable(page, size, sort, dir));
    }

    @GetMapping("/{id}")
    public ProductDtos.AdminProduct get(@PathVariable Long id) {
        return service.adminGet(id);
    }

    /** Автомобили, привязанные к товару — для вкладки «Применимость». */
    @GetMapping("/{id}/vehicles")
    public List<VinService.VehicleCandidate> linkedVehicles(@PathVariable Long id) {
        if (!products.existsById(id)) {
            throw new NotFoundException("Товар не найден: " + id);
        }
        return vehicles.findLinkedToProduct(id).stream()
                .map(VinService.VehicleCandidate::of)
                .toList();
    }

    @PostMapping
    public ProductDtos.AdminProduct create(@Valid @RequestBody ProductDtos.ProductRequest body) {
        return service.create(body);
    }

    @PutMapping("/{id}")
    public ProductDtos.AdminProduct update(@PathVariable Long id,
                                           @Valid @RequestBody ProductDtos.ProductRequest body) {
        return service.update(id, body);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}
