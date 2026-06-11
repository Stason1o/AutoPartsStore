package md.sacramento.orders;

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
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class OrderIntegrationTest {

    @Autowired
    MockMvc mockMvc;

    @Autowired
    OrderService orderService;

    @Autowired
    OrderRepository orderRepository;

    @Autowired
    ProductService productService;

    @Autowired
    ProductRepository productRepository;

    Long productId;

    @BeforeEach
    void setUp() {
        orderRepository.deleteAll();
        productRepository.deleteAll();
        // розница 500, опт 400, на складе 10
        productId = productService.create(new ProductDtos.ProductRequest(
                "ORD-1", "Радиатор тестовый", null, null, null,
                null, "MDL", null, new BigDecimal("500"), true,
                new BigDecimal("400"), 10, null, null, true, null)).id();
    }

    private OrderDtos.CheckoutRequest checkoutRequest(int qty, DeliveryMethod delivery,
                                                      PaymentMethod payment) {
        return new OrderDtos.CheckoutRequest("Иван", "+37360000000", null,
                delivery, payment, null, List.of(new OrderDtos.CheckoutItem(productId, qty)));
    }

    @Test
    void checkoutFixesPricesGeneratesNumberAndAddsDeliveryFee() {
        Order order = orderService.checkout(
                checkoutRequest(2, DeliveryMethod.COURIER, PaymentMethod.CASH_COURIER));

        assertThat(order.getNumber()).matches("S-\\d{6}");
        assertThat(order.getItemsTotal()).isEqualByComparingTo(new BigDecimal("1000"));
        // доставка 50 MDL из настроек
        assertThat(order.getGrandTotal()).isEqualByComparingTo(new BigDecimal("1050"));
        // checkout НЕ резервирует — только подтверждение менеджером
        assertThat(productRepository.findById(productId).orElseThrow().getReservedQty()).isZero();
    }

    @Test
    void paymentMethodMustMatchDelivery() {
        assertThrows(IllegalArgumentException.class, () -> orderService.checkout(
                checkoutRequest(1, DeliveryMethod.COURIER, PaymentMethod.CARD_PICKUP)));
    }

    @Test
    void checkoutRejectsInsufficientStock() {
        assertThrows(IllegalStateException.class, () -> orderService.checkout(
                checkoutRequest(11, DeliveryMethod.PICKUP, PaymentMethod.CASH_PICKUP)));
    }

    @Test
    void confirmReservesStockAndCancelReleasesIt() {
        Order order = orderService.checkout(
                checkoutRequest(4, DeliveryMethod.PICKUP, PaymentMethod.CARD_PICKUP));

        orderService.changeStatus(order.getId(), OrderStatus.CONFIRMED, null);
        assertThat(productRepository.findById(productId).orElseThrow().getReservedQty()).isEqualTo(4);

        orderService.changeStatus(order.getId(), OrderStatus.CANCELLED, "клиент передумал");
        var product = productRepository.findById(productId).orElseThrow();
        assertThat(product.getReservedQty()).isZero();
        assertThat(product.getStockQty()).isEqualTo(10);
    }

    @Test
    void confirmFailsWhenReservedByOthers() {
        Order first = orderService.checkout(
                checkoutRequest(8, DeliveryMethod.PICKUP, PaymentMethod.CASH_PICKUP));
        Order second = orderService.checkout(
                checkoutRequest(8, DeliveryMethod.PICKUP, PaymentMethod.CASH_PICKUP));

        orderService.changeStatus(first.getId(), OrderStatus.CONFIRMED, null);
        assertThrows(IllegalStateException.class,
                () -> orderService.changeStatus(second.getId(), OrderStatus.CONFIRMED, null));
    }

    @Test
    @Transactional
    void doneDecrementsPhysicalStock() {
        Order order = orderService.checkout(
                checkoutRequest(3, DeliveryMethod.PICKUP, PaymentMethod.CASH_PICKUP));
        orderService.changeStatus(order.getId(), OrderStatus.CONFIRMED, null);
        orderService.changeStatus(order.getId(), OrderStatus.ASSEMBLING, null);
        orderService.changeStatus(order.getId(), OrderStatus.READY_FOR_PICKUP, null);
        orderService.changeStatus(order.getId(), OrderStatus.DONE, null);

        var product = productRepository.findById(productId).orElseThrow();
        assertThat(product.getStockQty()).isEqualTo(7);
        assertThat(product.getReservedQty()).isZero();
    }

    @Test
    @Transactional
    void wholesaleToggleUsesWholesalePrices() {
        Order order = orderService.checkout(
                checkoutRequest(2, DeliveryMethod.PICKUP, PaymentMethod.CASH_PICKUP));

        Order wholesale = orderService.setWholesale(order.getId(), true);
        assertThat(wholesale.getItemsTotal()).isEqualByComparingTo(new BigDecimal("800"));

        Order retail = orderService.setWholesale(order.getId(), false);
        assertThat(retail.getItemsTotal()).isEqualByComparingTo(new BigDecimal("1000"));
    }

    @Test
    @Transactional
    void percentDiscountReducesGrandTotal() {
        Order order = orderService.checkout(
                checkoutRequest(2, DeliveryMethod.PICKUP, PaymentMethod.CASH_PICKUP));

        Order discounted = orderService.setDiscount(order.getId(), new BigDecimal("10"), null);
        // 1000 − 10% = 900, доставка 0
        assertThat(discounted.getGrandTotal()).isEqualByComparingTo(new BigDecimal("900"));
    }

    private String checkoutJson(String phone, String email) {
        return """
                {"customerName":"Иван","phone":"%s","email":%s,
                 "deliveryMethod":"PICKUP","paymentMethod":"CASH_PICKUP",
                 "items":[{"productId":%d,"qty":1}]}
                """.formatted(phone, email == null ? "null" : "\"" + email + "\"", productId);
    }

    @Test
    void checkoutRejectsMalformedPhone() throws Exception {
        mockMvc.perform(post("/api/orders").contentType(APPLICATION_JSON)
                        .content(checkoutJson("не телефон", null)))
                .andExpect(status().isBadRequest());
        mockMvc.perform(post("/api/orders").contentType(APPLICATION_JSON)
                        .content(checkoutJson("12345", null)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void checkoutRejectsMalformedEmail() throws Exception {
        mockMvc.perform(post("/api/orders").contentType(APPLICATION_JSON)
                        .content(checkoutJson("+37360123456", "не-почта")))
                .andExpect(status().isBadRequest());
    }

    @Test
    void checkoutAcceptsValidPhoneAndEmail() throws Exception {
        mockMvc.perform(post("/api/orders").contentType(APPLICATION_JSON)
                        .content(checkoutJson("+373 60 123 456", "client@mail.md")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.number").isNotEmpty());
    }

    /** Отмена нового заказа по HTTP: items лениво и не загружены внутри транзакции сервиса
     *  (резерв не снимался) — ответ должен сериализоваться без 500. */
    @Test
    @WithMockUser(roles = "ADMIN")
    void cancellingNewOrderViaHttpReturnsCancelledOrder() throws Exception {
        Order order = orderService.checkout(
                checkoutRequest(1, DeliveryMethod.PICKUP, PaymentMethod.CASH_PICKUP));

        mockMvc.perform(post("/api/admin/orders/" + order.getId() + "/status")
                        .with(csrf())
                        .contentType(APPLICATION_JSON)
                        .content("{\"status\":\"CANCELLED\",\"reason\":\"клиент передумал\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"))
                .andExpect(jsonPath("$.cancelReason").value("клиент передумал"))
                .andExpect(jsonPath("$.items[0].sku").value("ORD-1"));
    }

    @Test
    void invalidStatusTransitionIsRejected() {
        Order order = orderService.checkout(
                checkoutRequest(1, DeliveryMethod.PICKUP, PaymentMethod.CASH_PICKUP));
        assertThrows(IllegalArgumentException.class,
                () -> orderService.changeStatus(order.getId(), OrderStatus.DONE, null));
    }
}
