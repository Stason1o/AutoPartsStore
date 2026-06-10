package md.sacramento.common;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/admin/settings")
public class AdminSettingsController {

    /** Курс/наценка/округление меняются через /api/admin/rates — здесь только «магазинные». */
    private static final Set<String> EDITABLE = Set.of(
            SettingsService.DELIVERY_FEE_MDL,
            SettingsService.PICKUP_ADDRESS,
            SettingsService.PICKUP_HOURS,
            SettingsService.PHOTO_MAX_SIZE_MB,
            SettingsService.SNAPSHOT_KEEP_COUNT);

    private final SettingsService settings;
    private final AuditService audit;

    public AdminSettingsController(SettingsService settings, AuditService audit) {
        this.settings = settings;
        this.audit = audit;
    }

    @GetMapping
    public Map<String, String> all() {
        return settings.getAll();
    }

    @PutMapping
    public Map<String, String> update(@RequestBody Map<String, String> body) {
        for (Map.Entry<String, String> entry : body.entrySet()) {
            if (!EDITABLE.contains(entry.getKey())) {
                throw new IllegalArgumentException("Настройка недоступна для изменения: " + entry.getKey());
            }
            settings.set(entry.getKey(), entry.getValue());
        }
        audit.log("settings.update", Map.copyOf(body));
        return settings.getAll();
    }
}
