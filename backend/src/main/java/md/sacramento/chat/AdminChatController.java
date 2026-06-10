package md.sacramento.chat;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/chats")
public class AdminChatController {

    public record SendRequest(@NotBlank String body) {
    }

    private final ChatService service;

    public AdminChatController(ChatService service) {
        this.service = service;
    }

    @GetMapping
    public List<ChatService.ConversationView> list(
            @RequestParam(required = false) ChatConversation.Status status) {
        return service.adminList(status);
    }

    @GetMapping("/{id}/messages")
    public List<ChatService.MessageView> messages(@PathVariable Long id,
                                                  @RequestParam(defaultValue = "0") Long afterId) {
        return service.adminMessages(id, afterId);
    }

    @PostMapping("/{id}/messages")
    public ChatService.MessageView send(@PathVariable Long id, @Valid @RequestBody SendRequest body) {
        return service.adminSend(id, body.body());
    }

    @PostMapping("/{id}/status")
    public Map<String, String> setStatus(@PathVariable Long id,
                                         @RequestBody Map<String, String> body) {
        ChatConversation.Status status = ChatConversation.Status.valueOf(body.get("status"));
        service.setStatus(id, status);
        return Map.of("status", status.name());
    }
}
