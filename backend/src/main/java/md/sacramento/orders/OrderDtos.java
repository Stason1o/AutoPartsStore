package md.sacramento.orders;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public final class OrderDtos {

    private OrderDtos() {
    }

    public record CheckoutItem(@NotNull Long productId, @Min(1) int qty) {
    }

    public record CheckoutRequest(@NotBlank String customerName,
                                  @NotBlank String phone,
                                  String email,
                                  @NotNull DeliveryMethod deliveryMethod,
                                  @NotNull PaymentMethod paymentMethod,
                                  String comment,
                                  @NotEmpty List<@Valid CheckoutItem> items) {
    }

    public record ItemView(Long productId, String sku, String name, int qty,
                           BigDecimal retailPrice, BigDecimal wholesalePrice,
                           BigDecimal appliedPrice) {

        static ItemView of(OrderItem item, boolean admin) {
            return new ItemView(item.getProductId(), item.getSku(), item.getName(), item.getQty(),
                    item.getRetailPrice(), admin ? item.getWholesalePrice() : null,
                    item.getAppliedPrice());
        }
    }

    public record AdminOrderView(Long id, String number, OrderStatus status,
                                 String customerName, String phone, String email,
                                 DeliveryMethod deliveryMethod, PaymentMethod paymentMethod,
                                 String comment, boolean wholesale,
                                 BigDecimal discountPercent, BigDecimal discountAmount,
                                 BigDecimal deliveryFee, BigDecimal itemsTotal, BigDecimal grandTotal,
                                 String cancelReason, boolean viewed, Instant createdAt,
                                 List<ItemView> items) {

        static AdminOrderView of(Order o) {
            return new AdminOrderView(o.getId(), o.getNumber(), o.getStatus(),
                    o.getCustomerName(), o.getPhone(), o.getEmail(),
                    o.getDeliveryMethod(), o.getPaymentMethod(),
                    o.getComment(), o.isWholesale(),
                    o.getDiscountPercent(), o.getDiscountAmount(),
                    o.getDeliveryFee(), o.getItemsTotal(), o.getGrandTotal(),
                    o.getCancelReason(), o.isViewed(), o.getCreatedAt(),
                    o.getItems().stream().map(i -> ItemView.of(i, true)).toList());
        }
    }

    public record CheckoutResponse(String number, BigDecimal grandTotal) {
    }
}
