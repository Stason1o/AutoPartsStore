package md.sacramento.vehicles.vin;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.constraints.NotBlank;
import md.sacramento.common.RateLimiter;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;

@RestController
@RequestMapping("/api/vin")
public class VinController {

    private final VinService service;
    private final RateLimiter rateLimiter;

    public VinController(VinService service, RateLimiter rateLimiter) {
        this.service = service;
        this.rateLimiter = rateLimiter;
    }

    public record DecodeRequest(@NotBlank String vin) {
    }

    @PostMapping("/decode")
    public VinService.DecodeResult decode(@RequestBody DecodeRequest body,
                                          HttpServletRequest request) {
        rateLimiter.check("vin:" + RateLimiter.clientIp(request), 10, Duration.ofMinutes(1));
        return service.decode(body.vin());
    }
}
