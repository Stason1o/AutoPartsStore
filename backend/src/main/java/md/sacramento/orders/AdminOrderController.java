package md.sacramento.orders;

import md.sacramento.pricing.PricingService;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class AdminOrderController {

    public record StatusRequest(OrderStatus status, String reason) {
    }

    public record WholesaleRequest(boolean wholesale) {
    }

    public record DiscountRequest(BigDecimal percent, BigDecimal amount) {
    }

    private final OrderService service;
    private final PricingService pricingService;
    private final md.sacramento.chat.ChatService chatService;

    public AdminOrderController(OrderService service, PricingService pricingService,
                                md.sacramento.chat.ChatService chatService) {
        this.service = service;
        this.pricingService = pricingService;
        this.chatService = chatService;
    }

    @GetMapping("/orders")
    @Transactional(readOnly = true)
    public org.springframework.data.domain.Page<OrderDtos.AdminOrderView> list(
            @RequestParam(required = false) OrderStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "30") int size) {
        return service.ordersPage(status, PageRequest.of(page, Math.clamp(size, 1, 100)))
                .map(OrderDtos.AdminOrderView::of);
    }

    @GetMapping("/orders/{id}")
    @Transactional(readOnly = true)
    public OrderDtos.AdminOrderView get(@PathVariable Long id) {
        return OrderDtos.AdminOrderView.of(service.getOrThrow(id));
    }

    @PostMapping("/orders/{id}/status")
    public OrderDtos.AdminOrderView changeStatus(@PathVariable Long id,
                                                 @RequestBody StatusRequest body) {
        return OrderDtos.AdminOrderView.of(service.changeStatus(id, body.status(), body.reason()));
    }

    @PostMapping("/orders/{id}/wholesale")
    public OrderDtos.AdminOrderView setWholesale(@PathVariable Long id,
                                                 @RequestBody WholesaleRequest body) {
        return OrderDtos.AdminOrderView.of(service.setWholesale(id, body.wholesale()));
    }

    @PostMapping("/orders/{id}/discount")
    public OrderDtos.AdminOrderView setDiscount(@PathVariable Long id,
                                                @RequestBody DiscountRequest body) {
        return OrderDtos.AdminOrderView.of(service.setDiscount(id, body.percent(), body.amount()));
    }

    @PostMapping("/orders/{id}/viewed")
    public void markViewed(@PathVariable Long id) {
        service.markViewed(id);
    }

    @GetMapping("/dashboard")
    public Map<String, Object> dashboard() {
        OrderService.DashboardSummary summary = service.dashboard();
        Map<String, Object> result = new HashMap<>();
        result.put("newOrders", summary.newOrders());
        result.put("ordersToday", summary.ordersToday());
        result.put("zeroStockProducts", summary.zeroStockProducts());
        result.put("usdRate", pricingService.currentRate("USD").orElse(null));
        result.put("unreadChats", chatService.unreadConversations());
        return result;
    }
}
