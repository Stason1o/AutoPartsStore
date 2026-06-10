package md.sacramento;

import md.sacramento.auth.AdminUserRepository;
import md.sacramento.common.SettingsService;
import md.sacramento.vehicles.vin.WmiCodeRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Import(TestcontainersConfiguration.class)
class SchemaAndSeedTest {

    @Autowired
    AdminUserRepository adminUsers;

    @Autowired
    WmiCodeRepository wmiCodes;

    @Autowired
    SettingsService settings;

    @Test
    void seedCreatesAdminUser() {
        assertThat(adminUsers.findByUsername("admin")).isPresent();
    }

    @Test
    void seedFillsWmiDictionary() {
        assertThat(wmiCodes.count()).isGreaterThan(100);
        assertThat(wmiCodes.findById("WVW")).hasValueSatisfying(
                wmi -> assertThat(wmi.getMake()).isEqualTo("Volkswagen"));
    }

    @Test
    void seedFillsDefaultSettings() {
        assertThat(settings.getDecimal(SettingsService.GLOBAL_MARKUP_PERCENT))
                .isEqualByComparingTo(new BigDecimal("30"));
        assertThat(settings.get(SettingsService.RATE_MODE)).isEqualTo("BANK");
    }
}
