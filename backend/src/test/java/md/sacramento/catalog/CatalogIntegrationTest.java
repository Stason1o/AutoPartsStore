package md.sacramento.catalog;

import md.sacramento.TestcontainersConfiguration;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class CatalogIntegrationTest {

    @Autowired
    MockMvc mockMvc;

    @Autowired
    ProductService productService;

    @Autowired
    CategoryService categoryService;

    @Autowired
    ProductRepository productRepository;

    @Autowired
    CategoryRepository categoryRepository;

    Long radiatorsCategoryId;

    @BeforeEach
    void setUp() {
        productRepository.deleteAll();
        categoryRepository.deleteAll();

        radiatorsCategoryId = categoryService.create("Радиаторы", null, null, 0).id();

        productService.create(new ProductDtos.ProductRequest(
                "AU11-009-0", "Audi 100 передняя панель", "OEM", null, radiatorsCategoryId,
                new BigDecimal("18.84"), "USD", null, new BigDecimal("450"), true,
                new BigDecimal("380"), 2, "43*19", "без доков", true,
                List.of("4A0805594", "4A0 805 594A")));

        productService.create(new ProductDtos.ProductRequest(
                "RAP251190", "Q5 обратка бачка радиатора", null, null, radiatorsCategoryId,
                new BigDecimal("312"), "MDL", null, new BigDecimal("390"), true,
                null, 0, null, null, true,
                List.of("8K0121081BF")));

        productService.create(new ProductDtos.ProductRequest(
                "HIDDEN-1", "Неактивный товар", null, null, null,
                null, "USD", null, new BigDecimal("100"), true,
                null, 5, null, null, false, null));
    }

    @Test
    void searchByPartialSkuIsCaseInsensitive() throws Exception {
        mockMvc.perform(get("/api/products").param("search", "au11"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].sku").value("AU11-009-0"));
    }

    @Test
    void searchByOemNumberIgnoresSpacesAndDashes() throws Exception {
        mockMvc.perform(get("/api/products").param("search", "8K0-121 081"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].sku").value("RAP251190"));
    }

    @Test
    void searchByRussianNameFragment() throws Exception {
        mockMvc.perform(get("/api/products").param("search", "радиатор"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1));
    }

    @Test
    void inStockFilterHidesZeroStock() throws Exception {
        mockMvc.perform(get("/api/products").param("inStock", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].sku").value("AU11-009-0"));
    }

    @Test
    void inactiveProductsAreHiddenFromPublic() throws Exception {
        mockMvc.perform(get("/api/products"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(2));
    }

    @Test
    void publicListNeverExposesPurchaseOrWholesalePrice() throws Exception {
        mockMvc.perform(get("/api/products"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].purchasePrice").doesNotExist())
                .andExpect(jsonPath("$.content[0].wholesalePrice").doesNotExist())
                .andExpect(jsonPath("$.content[0].shelf").doesNotExist());
    }

    @Test
    void publicDetailShowsOemNumbersAndCategory() throws Exception {
        String slug = productRepository.findBySku("RAP251190").orElseThrow().getSlug();
        mockMvc.perform(get("/api/products/" + slug))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.oemNumbers[0]").value("8K0121081BF"))
                .andExpect(jsonPath("$.categoryName").value("Радиаторы"));
    }

    @Test
    void deletingCategoryDetachesProducts() {
        categoryService.delete(radiatorsCategoryId);
        assertThat(productRepository.findBySku("AU11-009-0").orElseThrow().getCategory()).isNull();
        assertThat(categoryRepository.findById(radiatorsCategoryId)).isEmpty();
    }

    @Test
    void duplicateSkuIsRejected() {
        var request = new ProductDtos.ProductRequest(
                "AU11-009-0", "Дубль", null, null, null,
                null, "USD", null, null, true, null, 0, null, null, true, null);
        org.junit.jupiter.api.Assertions.assertThrows(IllegalStateException.class,
                () -> productService.create(request));
    }
}
