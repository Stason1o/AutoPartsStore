package md.sacramento.chat;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    List<ChatMessage> findByConversationIdAndIdGreaterThanOrderByIdAsc(Long conversationId, Long afterId);

    Optional<ChatMessage> findFirstByConversationIdOrderByIdDesc(Long conversationId);

    long countByConversationIdAndSenderAndReadByAdminFalse(Long conversationId, ChatMessage.Sender sender);

    long countByConversationIdAndSenderAndReadByVisitorFalse(Long conversationId, ChatMessage.Sender sender);

    /** Диалоги, где есть непрочитанные админом сообщения посетителя. */
    @Query("""
            select count(distinct m.conversationId) from ChatMessage m
            where m.sender = 'VISITOR' and m.readByAdmin = false
            """)
    long countConversationsUnreadByAdmin();

    @Modifying
    @Query("""
            update ChatMessage m set m.readByAdmin = true
            where m.conversationId = :conversationId and m.sender = 'VISITOR' and m.readByAdmin = false
            """)
    void markReadByAdmin(Long conversationId);

    @Modifying
    @Query("""
            update ChatMessage m set m.readByVisitor = true
            where m.conversationId = :conversationId and m.sender = 'ADMIN' and m.readByVisitor = false
            """)
    void markReadByVisitor(Long conversationId);
}
