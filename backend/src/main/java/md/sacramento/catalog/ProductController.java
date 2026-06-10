package md.sacramento.catalog;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.Set;

@RestController
@RequestMapping("/api/products")
public class ProductController {

    static final int MAX_PAGE_SIZE = 100;

    private final ProductService service;
    private final CategoryService categoryService;

    public ProductController(ProductService service, CategoryService categoryService) {
        this.service = service;
        this.categoryService = categoryService;
    }

    @GetMapping
    public Page<ProductDtos.PublicListItem> search(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) Long vehicleId,
            @RequestParam(required = false) String brand,
            @RequestParam(defaultValue = "false") boolean inStock,
            @RequestParam(required = false) BigDecimal priceMin,
            @RequestParam(required = false) BigDecimal priceMax,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "24") int size,
            @RequestParam(defaultValue = "name") String sort,
            @RequestParam(defaultValue = "asc") String dir) {
        Set<Long> categoryIds = categoryId != null ? categoryService.subtreeIds(categoryId) : null;
        ProductFilter filter = new ProductFilter(search, categoryIds, vehicleId, brand,
                inStock, priceMin, priceMax, true);
        return service.publicSearch(filter, pageable(page, size, sort, dir));
    }

    @GetMapping("/{slug}")
    public ProductDtos.PublicDetail detail(@PathVariable String slug) {
        return service.publicDetail(slug);
    }

    static Pageable pageable(int page, int size, String sort, String dir) {
        String property = switch (sort) {
            case "price" -> "retailPrice";
            case "created" -> "createdAt";
            case "sku" -> "sku";
            default -> "name";
        };
        Sort.Direction direction = "desc".equalsIgnoreCase(dir) ? Sort.Direction.DESC : Sort.Direction.ASC;
        return PageRequest.of(Math.max(0, page), Math.clamp(size, 1, MAX_PAGE_SIZE),
                Sort.by(direction, property).and(Sort.by("id")));
    }
}
