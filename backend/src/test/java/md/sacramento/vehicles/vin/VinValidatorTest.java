package md.sacramento.vehicles.vin;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

class VinValidatorTest {

    @Test
    void normalizesCaseSpacesAndDashes() {
        assertThat(VinValidator.normalize(" wvwzzz1jzxw000001 "))
                .isEqualTo("WVWZZZ1JZXW000001");
        assertThat(VinValidator.normalize("WVW-ZZZ1J ZXW000001"))
                .isEqualTo("WVWZZZ1JZXW000001");
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "SHORT",                  // мало символов
            "WVWZZZ1JZXW0000011",     // 18 символов
            "WVWZZZ1JZXW00000I",      // запрещённая I
            "WVWZZZ1JZXW00000O",      // запрещённая O
            "WVWZZZ1JZXW00000Q",      // запрещённая Q
            ""
    })
    void rejectsInvalidVin(String vin) {
        assertThrows(IllegalArgumentException.class, () -> VinValidator.normalize(vin));
    }
}
