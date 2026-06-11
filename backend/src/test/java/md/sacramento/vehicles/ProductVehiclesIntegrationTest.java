package md.sacramento.vehicles;

import md.sacramento.TestcontainersConfiguration;
import md.sacramento.catalog.ProductDtos;
import md.sacramento.catalog.ProductRepository;
import md.sacramento.catalog.ProductService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class ProductVehiclesIntegrationTest {

    @Autowired
    MockMvc mockMvc;

    @Autowired
    ProductService productService;

    @Autowired
    VehicleRepository vehicleRepository;

    @Autowired
    ProductVehicleRepository productVehicleRepository;

    @Autowired
    ProductRepository productRepository;

    Long productId;
    Long golfId;
    Long audiId;

    @BeforeEach
    void setUp() {
        productVehicleRepository.deleteAll();
        vehicleRepository.deleteAll();
        productRepository.deleteAll();

        productId = productService.create(new ProductDtos.ProductRequest(
                "PV-TEST-1", "Радиатор тестовый", null, null, null,
                null, "USD", null, null, true, null, 1, null, null, true, null)).id();

        golfId = vehicle("Volkswagen", "Golf IV", 1997, 2003, "1.9 TDI");
        audiId = vehicle("Audi", "A4", 1997, 2001, null);
        vehicle("BMW", "E46", 1998, 2005, null); // не привязан

        productVehicleRepository.save(new ProductVehicle(productId, golfId, false));
        productVehicleRepository.save(new ProductVehicle(productId, audiId, true));
    }

    private Long vehicle(String make, String model, Integer from, Integer to, String engine) {
        Vehicle v = new Vehicle();
        v.setMake(make);
        v.setModel(model);
        v.setYearFrom(from);
        v.setYearTo(to);
        v.setEngine(engine);
        return vehicleRepository.save(v).getId();
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void returnsLinkedVehiclesWithIdsSortedByMakeModel() throws Exception {
        mockMvc.perform(get("/api/admin/products/" + productId + "/vehicles"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].id").value(audiId))
                .andExpect(jsonPath("$[0].make").value("Audi"))
                .andExpect(jsonPath("$[0].model").value("A4"))
                .andExpect(jsonPath("$[0].yearFrom").value(1997))
                .andExpect(jsonPath("$[0].yearTo").value(2001))
                .andExpect(jsonPath("$[0].engine").doesNotExist())
                .andExpect(jsonPath("$[0].display").value("Audi A4 1997–2001"))
                .andExpect(jsonPath("$[1].id").value(golfId))
                .andExpect(jsonPath("$[1].engine").value("1.9 TDI"))
                .andExpect(jsonPath("$[1].display").value("Volkswagen Golf IV 1997–2003 1.9 TDI"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void productWithoutLinksReturnsEmptyList() throws Exception {
        Long lonely = productService.create(new ProductDtos.ProductRequest(
                "PV-TEST-2", "Без привязок", null, null, null,
                null, "USD", null, null, true, null, 0, null, null, true, null)).id();

        mockMvc.perform(get("/api/admin/products/" + lonely + "/vehicles"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void unknownProductReturns404() throws Exception {
        mockMvc.perform(get("/api/admin/products/999999/vehicles"))
                .andExpect(status().isNotFound());
    }

    @Test
    void withoutAdminSessionReturns401() throws Exception {
        mockMvc.perform(get("/api/admin/products/" + productId + "/vehicles"))
                .andExpect(status().isUnauthorized());
    }
}
