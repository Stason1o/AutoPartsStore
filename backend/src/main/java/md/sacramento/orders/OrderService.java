package md.sacramento.orders;

import md.sacramento.catalog.Product;
import md.sacramento.catalog.ProductRepository;
import md.sacramento.common.NotFoundException;
import md.sacramento.common.SettingsService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

@Service
public class OrderService {

    private final OrderRepository orders;
    private final ProductRepository products;
    private final SettingsService settings;

    public OrderService(OrderRepository orders, ProductRepository products,
                        SettingsService settings) {
        this.orders = orders;
        this.products = products;
        this.settings = settings;
    }

    @Transactional
    public Order checkout(OrderDtos.CheckoutRequest request) {
        if (!PaymentMethod.allowedFor(request.deliveryMethod()).contains(request.paymentMethod())) {
            throw new IllegalArgumentException("Способ оплаты недоступен для выбранного способа получения");
        }

        Order order = new Order();
        order.setCustomerName(request.customerName().trim());
        order.setPhone(request.phone().trim());
        order.setEmail(request.email());
        order.setDeliveryMethod(request.deliveryMethod());
        order.setPaymentMethod(request.paymentMethod());
        order.setComment(request.comment());
        order.setDeliveryFee(request.deliveryMethod() == DeliveryMethod.COURIER
                ? settings.getDecimal(SettingsService.DELIVERY_FEE_MDL)
                : BigDecimal.ZERO);

        for (OrderDtos.CheckoutItem itemRequest : request.items()) {
            Product product = products.findById(itemRequest.productId())
                    .filter(Product::isActive)
                    .orElseThrow(() -> new NotFoundException(
                            "Товар не найден или недоступен: " + itemRequest.productId()));
            if (product.getRetailPrice() == null) {
                throw new IllegalStateException("У товара нет цены: " + product.getSku());
            }
            if (product.availableQty() < itemRequest.qty()) {
                throw new IllegalStateException("Недостаточно на складе: " + product.getSku()
                        + " (доступно " + Math.max(0, product.availableQty()) + ")");
            }
            OrderItem item = new OrderItem();
            item.setProductId(product.getId());
            item.setSku(product.getSku());
            item.setName(product.getName());
            item.setQty(itemRequest.qty());
            item.setRetailPrice(product.getRetailPrice());
            item.setWholesalePrice(product.getWholesalePrice());
            item.setAppliedPrice(product.getRetailPrice());
            order.addItem(item);
        }

        recomputeTotals(order);
        order.setNumber("TMP");
        Order saved = orders.saveAndFlush(order);
        saved.setNumber("S-%06d".formatted(saved.getId()));
        return orders.save(saved);
    }

    @Transactional
    public Order changeStatus(Long orderId, OrderStatus newStatus, String cancelReason) {
        Order order = getOrThrow(orderId);
        OrderStatus current = order.getStatus();
        if (!current.nextStatuses().contains(newStatus)) {
            throw new IllegalArgumentException(
                    "Недопустимый переход статуса: " + current + " → " + newStatus);
        }

        if (newStatus == OrderStatus.CONFIRMED) {
            reserve(order);
        } else if (newStatus == OrderStatus.DONE) {
            shipOut(order);
        } else if (newStatus == OrderStatus.CANCELLED) {
            if (current.holdsReservation()) {
                releaseReservation(order);
            }
            order.setCancelReason(cancelReason != null && !cancelReason.isBlank()
                    ? cancelReason : "Не указана");
        }

        order.setStatus(newStatus);
        return orders.save(order);
    }

    /** Резерв при подтверждении менеджером — единственная точка захвата остатков. */
    private void reserve(Order order) {
        for (OrderItem item : order.getItems()) {
            Product product = productOf(item);
            if (product.availableQty() < item.getQty()) {
                throw new IllegalStateException("Недостаточно на складе для резерва: "
                        + item.getSku() + " (доступно " + Math.max(0, product.availableQty()) + ")");
            }
            product.setReservedQty(product.getReservedQty() + item.getQty());
        }
    }

    private void shipOut(Order order) {
        for (OrderItem item : order.getItems()) {
            Product product = productOf(item);
            product.setStockQty(product.getStockQty() - item.getQty());
            product.setReservedQty(Math.max(0, product.getReservedQty() - item.getQty()));
        }
    }

    private void releaseReservation(Order order) {
        for (OrderItem item : order.getItems()) {
            Product product = productOf(item);
            product.setReservedQty(Math.max(0, product.getReservedQty() - item.getQty()));
        }
    }

    private Product productOf(OrderItem item) {
        if (item.getProductId() == null) {
            throw new IllegalStateException("Товар из заказа уже удалён: " + item.getSku());
        }
        return products.findById(item.getProductId())
                .orElseThrow(() -> new IllegalStateException("Товар из заказа уже удалён: " + item.getSku()));
    }

    /** Опт включает цены wholesale (где они есть); выключение возвращает розницу. */
    @Transactional
    public Order setWholesale(Long orderId, boolean wholesale) {
        Order order = ensureEditable(orderId);
        order.setWholesale(wholesale);
        for (OrderItem item : order.getItems()) {
            item.setAppliedPrice(wholesale && item.getWholesalePrice() != null
                    ? item.getWholesalePrice()
                    : item.getRetailPrice());
        }
        recomputeTotals(order);
        return orders.save(order);
    }

    @Transactional
    public Order setDiscount(Long orderId, BigDecimal percent, BigDecimal amount) {
        if (percent != null && amount != null) {
            throw new IllegalArgumentException("Укажите скидку либо в процентах, либо суммой");
        }
        if ((percent != null && (percent.signum() < 0 || percent.compareTo(new BigDecimal("100")) > 0))
                || (amount != null && amount.signum() < 0)) {
            throw new IllegalArgumentException("Недопустимая скидка");
        }
        Order order = ensureEditable(orderId);
        order.setDiscountPercent(percent);
        order.setDiscountAmount(amount);
        recomputeTotals(order);
        return orders.save(order);
    }

    @Transactional
    public void markViewed(Long orderId) {
        Order order = getOrThrow(orderId);
        order.setViewed(true);
        orders.save(order);
    }

    private Order ensureEditable(Long orderId) {
        Order order = getOrThrow(orderId);
        if (order.getStatus() == OrderStatus.DONE || order.getStatus() == OrderStatus.CANCELLED) {
            throw new IllegalStateException("Завершённый заказ нельзя изменять");
        }
        return order;
    }

    private void recomputeTotals(Order order) {
        BigDecimal itemsTotal = order.getItems().stream()
                .map(i -> i.getAppliedPrice().multiply(BigDecimal.valueOf(i.getQty())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        order.setItemsTotal(itemsTotal);

        BigDecimal discount = BigDecimal.ZERO;
        if (order.getDiscountPercent() != null) {
            discount = itemsTotal.multiply(order.getDiscountPercent())
                    .divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
        } else if (order.getDiscountAmount() != null) {
            discount = order.getDiscountAmount().min(itemsTotal);
        }
        order.setGrandTotal(itemsTotal.subtract(discount).add(order.getDeliveryFee())
                .max(BigDecimal.ZERO));
    }

    Order getOrThrow(Long id) {
        return orders.findById(id)
                .orElseThrow(() -> new NotFoundException("Заказ не найден: " + id));
    }

    public record DashboardSummary(long newOrders, long ordersToday, long zeroStockProducts) {
    }

    @Transactional(readOnly = true)
    public DashboardSummary dashboard() {
        return new DashboardSummary(
                orders.countByViewedFalse(),
                orders.countByCreatedAtAfter(java.time.LocalDate.now(BnmZone.CHISINAU)
                        .atStartOfDay(BnmZone.CHISINAU).toInstant()),
                products.countByStockQtyAndActiveTrue(0));
    }

    /** Локальная константа зоны — чтобы не тянуть pricing в orders. */
    static final class BnmZone {
        static final java.time.ZoneId CHISINAU = java.time.ZoneId.of("Europe/Chisinau");
    }

    public List<Order> ordersPage(OrderStatus status, org.springframework.data.domain.Pageable pageable) {
        return (status != null
                ? orders.findByStatusOrderByCreatedAtDesc(status, pageable)
                : orders.findAllByOrderByCreatedAtDesc(pageable)).getContent();
    }
}
