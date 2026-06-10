package md.sacramento.common;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

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
        return Map.of(
                "deliveryFeeMdl", settings.get(SettingsService.DELIVERY_FEE_MDL),
                "pickupAddress", settings.get(SettingsService.PICKUP_ADDRESS),
                "pickupHours", settings.get(SettingsService.PICKUP_HOURS));
    }
}
