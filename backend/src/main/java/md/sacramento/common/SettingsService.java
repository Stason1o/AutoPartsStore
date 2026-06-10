package md.sacramento.common;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Типизированный доступ к таблице settings. Ключи заведены в V2__seed.sql.
 */
@Service
public class SettingsService {

    public static final String GLOBAL_MARKUP_PERCENT = "global_markup_percent";
    public static final String ROUNDING_RULE = "rounding_rule";
    public static final String RATE_MODE = "rate_mode";
    public static final String DELIVERY_FEE_MDL = "delivery_fee_mdl";
    public static final String PICKUP_ADDRESS = "pickup_address";
    public static final String PICKUP_HOURS = "pickup_hours";
    public static final String PHOTO_MAX_SIZE_MB = "photo_max_size_mb";
    public static final String SNAPSHOT_KEEP_COUNT = "snapshot_keep_count";

    private final SettingRepository repository;

    public SettingsService(SettingRepository repository) {
        this.repository = repository;
    }

    public String get(String key) {
        return repository.findById(key)
                .orElseThrow(() -> new IllegalStateException("Настройка не найдена: " + key))
                .getValue();
    }

    public BigDecimal getDecimal(String key) {
        return new BigDecimal(get(key));
    }

    public int getInt(String key) {
        return Integer.parseInt(get(key));
    }

    public Map<String, String> getAll() {
        return repository.findAll().stream()
                .collect(Collectors.toMap(Setting::getKey, Setting::getValue));
    }

    @Transactional
    public void set(String key, String value) {
        Setting setting = repository.findById(key)
                .orElseThrow(() -> new IllegalStateException("Настройка не найдена: " + key));
        setting.setValue(value);
        repository.save(setting);
    }
}
