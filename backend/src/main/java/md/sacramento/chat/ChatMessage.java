package md.sacramento.chat;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

@Entity
@Table(name = "chat_messages")
public class ChatMessage {

    public enum Sender { VISITOR, ADMIN }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "conversation_id", nullable = false)
    private Long conversationId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Sender sender;

    @Column(nullable = false)
    private String body;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private boolean readByAdmin;

    @Column(nullable = false)
    private boolean readByVisitor;

    public Long getId() { return id; }
    public Long getConversationId() { return conversationId; }
    public void setConversationId(Long conversationId) { this.conversationId = conversationId; }
    public Sender getSender() { return sender; }
    public void setSender(Sender sender) { this.sender = sender; }
    public String getBody() { return body; }
    public void setBody(String body) { this.body = body; }
    public Instant getCreatedAt() { return createdAt; }
    public boolean isReadByAdmin() { return readByAdmin; }
    public void setReadByAdmin(boolean readByAdmin) { this.readByAdmin = readByAdmin; }
    public boolean isReadByVisitor() { return readByVisitor; }
    public void setReadByVisitor(boolean readByVisitor) { this.readByVisitor = readByVisitor; }
}
