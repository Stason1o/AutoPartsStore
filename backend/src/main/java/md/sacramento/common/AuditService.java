package md.sacramento.common;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.Map;

/** Журнал действий админа: кто и что изменил (цены, курс, статусы, импорт). */
@Service
public class AuditService {

    private static final Logger log = LoggerFactory.getLogger(AuditService.class);

    private final AuditLogRepository repository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public AuditService(AuditLogRepository repository) {
        this.repository = repository;
    }

    public void log(String action, Map<String, Object> details) {
        try {
            repository.save(new AuditLog(currentUsername(), action,
                    objectMapper.writeValueAsString(details)));
        } catch (Exception e) {
            // аудит не должен ломать бизнес-операцию
            log.warn("Не удалось записать аудит {}: {}", action, e.getMessage());
        }
    }

    private static String currentUsername() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.isAuthenticated() ? auth.getName() : "system";
    }
}
