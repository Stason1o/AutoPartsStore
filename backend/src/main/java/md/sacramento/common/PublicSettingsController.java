package md.sacramento.common;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/** Публичные настройки для чекаута витрины. */
@RestController
public class PublicSettingsController {

    private final SettingsService settings;

    public PublicSettingsController(SettingsService settings) {
        this.settings = settings;
    }

    @GetMapping("/api/public-settings")
    public Map<String, String> publicSettings() {
        Map<String, String> all = settings.getAll();
        Map<String, String> result = new java.util.LinkedHashMap<>();
        result.put("deliveryFeeMdl", all.get(SettingsService.DELIVERY_FEE_MDL));
        result.put("pickupAddress", all.get(SettingsService.PICKUP_ADDRESS));
        result.put("pickupHours", all.get(SettingsService.PICKUP_HOURS));
        // контакты: пустые значения витрина не показывает
        for (String key : List.of("contact_phone", "contact_email", "contact_viber",
                "contact_whatsapp", "contact_telegram", "contact_instagram")) {
            result.put(key, all.getOrDefault(key, ""));
        }
        return result;
    }
}
