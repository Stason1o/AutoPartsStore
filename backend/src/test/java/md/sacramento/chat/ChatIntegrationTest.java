package md.sacramento.chat;

import md.sacramento.TestcontainersConfiguration;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

@SpringBootTest
@Import(TestcontainersConfiguration.class)
class ChatIntegrationTest {

    @Autowired
    ChatService chatService;

    @Autowired
    ChatConversationRepository conversations;

    @Autowired
    ChatMessageRepository messages;

    @BeforeEach
    void setUp() {
        messages.deleteAll();
        conversations.deleteAll();
    }

    @Test
    void firstVisitorMessageCreatesConversationAndAdminSeesUnread() {
        var reply = chatService.visitorSend(null, "Ион", "Есть радиатор на Audi A4?");

        assertThat(reply.token()).isNotBlank();
        assertThat(chatService.unreadConversations()).isEqualTo(1);

        var list = chatService.adminList(null, 0, 50).getContent();
        assertThat(list).hasSize(1);
        assertThat(list.getFirst().visitorName()).isEqualTo("Ион");
        assertThat(list.getFirst().unread()).isEqualTo(1);
        assertThat(list.getFirst().lastMessage()).contains("радиатор");
    }

    @Test
    void adminOpeningChatMarksReadAndReplyReachesVisitor() {
        var reply = chatService.visitorSend(null, null, "Здравствуйте!");
        Long conversationId = chatService.adminList(null, 0, 50).getContent().getFirst().id();

        // админ открыл диалог — непрочитанных не осталось
        chatService.adminMessages(conversationId, 0L);
        assertThat(chatService.unreadConversations()).isZero();

        chatService.adminSend(conversationId, "Добрый день, подскажу!");

        // свёрнутый виджет (peek) видит непрочитанное, но не сбрасывает его
        var peek = chatService.visitorPoll(reply.token(), 0L, true);
        assertThat(peek.unread()).isEqualTo(1);
        assertThat(peek.messages()).hasSize(2);

        // открытый виджет читает и сбрасывает счётчик
        var open = chatService.visitorPoll(reply.token(), 0L, false);
        assertThat(open.unread()).isZero();
        assertThat(open.messages().getLast().sender()).isEqualTo(ChatMessage.Sender.ADMIN);
    }

    @Test
    void sameTokenContinuesSameConversation() {
        var first = chatService.visitorSend(null, null, "Первое");
        chatService.visitorSend(first.token(), null, "Второе");

        assertThat(conversations.count()).isEqualTo(1);
        assertThat(chatService.adminList(null, 0, 50).getContent().getFirst().unread()).isEqualTo(2);
    }

    @Test
    void newVisitorMessageReopensClosedConversation() {
        var reply = chatService.visitorSend(null, null, "Вопрос");
        Long id = chatService.adminList(null, 0, 50).getContent().getFirst().id();
        chatService.setStatus(id, ChatConversation.Status.CLOSED);

        chatService.visitorSend(reply.token(), null, "Ещё вопрос");
        assertThat(conversations.findById(id).orElseThrow().getStatus())
                .isEqualTo(ChatConversation.Status.OPEN);
    }

    @Test
    void emptyAndTooLongMessagesAreRejected() {
        assertThrows(IllegalArgumentException.class,
                () -> chatService.visitorSend(null, null, "   "));
        assertThrows(IllegalArgumentException.class,
                () -> chatService.visitorSend(null, null, "x".repeat(2001)));
    }

    @Test
    void afterIdReturnsOnlyNewMessages() {
        var reply = chatService.visitorSend(null, null, "Раз");
        Long lastId = reply.messages().getLast().id();
        chatService.visitorSend(reply.token(), null, "Два");

        var delta = chatService.visitorPoll(reply.token(), lastId, false);
        assertThat(delta.messages()).hasSize(1);
        assertThat(delta.messages().getFirst().body()).isEqualTo("Два");
    }
}
