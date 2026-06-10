package md.sacramento.chat;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ChatConversationRepository extends JpaRepository<ChatConversation, Long> {

    Optional<ChatConversation> findByVisitorToken(String visitorToken);

    List<ChatConversation> findByStatusOrderByLastMessageAtDesc(ChatConversation.Status status);

    List<ChatConversation> findAllByOrderByLastMessageAtDesc();
}
