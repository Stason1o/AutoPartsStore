package md.sacramento.chat;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.constraints.NotBlank;
import md.sacramento.common.RateLimiter;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;

/** Публичный чат витрины (без регистрации, токен диалога живёт в браузере). */
@RestController
@RequestMapping("/api/chat")
public class ChatController {

    public record SendRequest(String token, String name, @NotBlank String body) {
    }

    private final ChatService service;
    private final RateLimiter rateLimiter;

    public ChatController(ChatService service, RateLimiter rateLimiter) {
        this.service = service;
        this.rateLimiter = rateLimiter;
    }

    @PostMapping("/messages")
    public ChatService.VisitorReply send(@RequestBody SendRequest body, HttpServletRequest request) {
        rateLimiter.check("chat:" + RateLimiter.clientIp(request), 20, Duration.ofMinutes(1));
        return service.visitorSend(body.token(), body.name(), body.body());
    }

    @GetMapping("/{token}/messages")
    public ChatService.VisitorReply poll(@PathVariable String token,
                                         @RequestParam(defaultValue = "0") Long afterId,
                                         @RequestParam(defaultValue = "false") boolean peek) {
        return service.visitorPoll(token, afterId, peek);
    }
}
