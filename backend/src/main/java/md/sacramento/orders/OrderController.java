package md.sacramento.orders;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import md.sacramento.common.RateLimiter;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService service;
    private final RateLimiter rateLimiter;

    public OrderController(OrderService service, RateLimiter rateLimiter) {
        this.service = service;
        this.rateLimiter = rateLimiter;
    }

    @PostMapping
    public OrderDtos.CheckoutResponse checkout(@Valid @RequestBody OrderDtos.CheckoutRequest body,
                                               HttpServletRequest request) {
        rateLimiter.check("checkout:" + RateLimiter.clientIp(request), 5, Duration.ofMinutes(1));
        Order order = service.checkout(body);
        return new OrderDtos.CheckoutResponse(order.getNumber(), order.getGrandTotal());
    }
}
