package md.sacramento.chat;

import md.sacramento.common.NotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class ChatService {

    public record MessageView(Long id, ChatMessage.Sender sender, String body, Instant createdAt) {
        static MessageView of(ChatMessage m) {
            return new MessageView(m.getId(), m.getSender(), m.getBody(), m.getCreatedAt());
        }
    }

    public record VisitorReply(String token, ChatConversation.Status status,
                               long unread, List<MessageView> messages) {
    }

    public record ConversationView(Long id, String visitorName, ChatConversation.Status status,
                                   Instant lastMessageAt, long unread, String lastMessage) {
    }

    private static final int MAX_BODY = 2000;

    private final ChatConversationRepository conversations;
    private final ChatMessageRepository messages;

    public ChatService(ChatConversationRepository conversations,
                       ChatMessageRepository messages) {
        this.conversations = conversations;
        this.messages = messages;
    }

    // ---------- посетитель ----------

    /** Первое сообщение создаёт диалог; token хранится в браузере посетителя. */
    @Transactional
    public VisitorReply visitorSend(String token, String visitorName, String body) {
        String text = body == null ? "" : body.trim();
        if (text.isEmpty()) {
            throw new IllegalArgumentException("Сообщение пустое");
        }
        if (text.length() > MAX_BODY) {
            throw new IllegalArgumentException("Сообщение слишком длинное (до " + MAX_BODY + " символов)");
        }

        ChatConversation conversation = token == null || token.isBlank()
                ? null
                : conversations.findByVisitorToken(token.trim()).orElse(null);
        if (conversation == null) {
            conversation = new ChatConversation();
            conversation.setVisitorToken(UUID.randomUUID().toString());
            conversations.save(conversation);
        }
        if (visitorName != null && !visitorName.isBlank()) {
            conversation.setVisitorName(visitorName.trim());
        }
        conversation.setStatus(ChatConversation.Status.OPEN); // новое сообщение переоткрывает диалог
        conversation.setLastMessageAt(Instant.now());

        ChatMessage message = new ChatMessage();
        message.setConversationId(conversation.getId());
        message.setSender(ChatMessage.Sender.VISITOR);
        message.setBody(text);
        message.setReadByVisitor(true);
        messages.save(message);

        return visitorPoll(conversation.getVisitorToken(), 0L, false);
    }

    /** Опрос виджетом; peek=true (виджет свёрнут) не помечает сообщения прочитанными. */
    @Transactional
    public VisitorReply visitorPoll(String token, Long afterId, boolean peek) {
        ChatConversation conversation = conversations.findByVisitorToken(token)
                .orElseThrow(() -> new NotFoundException("Диалог не найден"));
        long unread = messages.countByConversationIdAndSenderAndReadByVisitorFalse(
                conversation.getId(), ChatMessage.Sender.ADMIN);
        List<MessageView> list = messages
                .findByConversationIdAndIdGreaterThanOrderByIdAsc(conversation.getId(),
                        afterId == null ? 0L : afterId)
                .stream().map(MessageView::of).toList();
        if (!peek) {
            messages.markReadByVisitor(conversation.getId());
            unread = 0;
        }
        return new VisitorReply(conversation.getVisitorToken(), conversation.getStatus(), unread, list);
    }

    // ---------- админ ----------

    @Transactional(readOnly = true)
    public org.springframework.data.domain.Page<ConversationView> adminList(
            ChatConversation.Status status, int page, int size) {
        var pageable = org.springframework.data.domain.PageRequest.of(
                Math.max(0, page), Math.clamp(size, 1, 100),
                org.springframework.data.domain.Sort.by(
                        org.springframework.data.domain.Sort.Direction.DESC, "lastMessageAt"));
        var result = status != null
                ? conversations.findByStatus(status, pageable)
                : conversations.findAll(pageable);
        return result.map(c -> new ConversationView(
                c.getId(),
                c.getVisitorName(),
                c.getStatus(),
                c.getLastMessageAt(),
                messages.countByConversationIdAndSenderAndReadByAdminFalse(
                        c.getId(), ChatMessage.Sender.VISITOR),
                messages.findFirstByConversationIdOrderByIdDesc(c.getId())
                        .map(m -> m.getBody().length() > 80
                                ? m.getBody().substring(0, 80) + '…' : m.getBody())
                        .orElse("")));
    }

    /** Открытие диалога админом помечает сообщения посетителя прочитанными. */
    @Transactional
    public List<MessageView> adminMessages(Long conversationId, Long afterId) {
        requireConversation(conversationId);
        List<MessageView> list = messages
                .findByConversationIdAndIdGreaterThanOrderByIdAsc(conversationId,
                        afterId == null ? 0L : afterId)
                .stream().map(MessageView::of).toList();
        messages.markReadByAdmin(conversationId);
        return list;
    }

    @Transactional
    public MessageView adminSend(Long conversationId, String body) {
        String text = body == null ? "" : body.trim();
        if (text.isEmpty()) {
            throw new IllegalArgumentException("Сообщение пустое");
        }
        if (text.length() > MAX_BODY) {
            throw new IllegalArgumentException("Сообщение слишком длинное (до " + MAX_BODY + " символов)");
        }
        ChatConversation conversation = requireConversation(conversationId);
        conversation.setStatus(ChatConversation.Status.OPEN);
        conversation.setLastMessageAt(Instant.now());

        ChatMessage message = new ChatMessage();
        message.setConversationId(conversationId);
        message.setSender(ChatMessage.Sender.ADMIN);
        message.setBody(text);
        message.setReadByAdmin(true);
        return MessageView.of(messages.save(message));
    }

    @Transactional
    public void setStatus(Long conversationId, ChatConversation.Status status) {
        requireConversation(conversationId).setStatus(status);
    }

    /** Для колокольчика в шапке админки. */
    @Transactional(readOnly = true)
    public long unreadConversations() {
        return messages.countConversationsUnreadByAdmin();
    }

    private ChatConversation requireConversation(Long id) {
        return conversations.findById(id)
                .orElseThrow(() -> new NotFoundException("Диалог не найден: " + id));
    }
}
