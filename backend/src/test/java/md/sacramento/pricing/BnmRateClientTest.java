package md.sacramento.pricing;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class BnmRateClientTest {

    private static final String FIXTURE = """
            <?xml version="1.0" encoding="UTF-8"?>
            <ValCurs Date="10.06.2026" name="Official exchange rate">
              <Valute ID="47">
                <NumCode>978</NumCode>
                <CharCode>EUR</CharCode>
                <Nominal>1</Nominal>
                <Name>Euro</Name>
                <Value>19.1845</Value>
              </Valute>
              <Valute ID="44">
                <NumCode>840</NumCode>
                <CharCode>USD</CharCode>
                <Nominal>1</Nominal>
                <Name>US Dollar</Name>
                <Value>17.3312</Value>
              </Valute>
              <Valute ID="33">
                <NumCode>348</NumCode>
                <CharCode>HUF</CharCode>
                <Nominal>100</Nominal>
                <Name>Hungarian Forint</Name>
                <Value>4.9105</Value>
              </Valute>
            </ValCurs>
            """;

    @Test
    void parsesUsdRate() {
        assertThat(BnmRateClient.parseRate(FIXTURE, "USD"))
                .hasValueSatisfying(rate -> assertThat(rate)
                        .isEqualByComparingTo(new BigDecimal("17.3312")));
    }

    @Test
    void honorsNominalDivision() {
        // 100 HUF = 4.9105 MDL → 1 HUF = 0.049105
        assertThat(BnmRateClient.parseRate(FIXTURE, "HUF"))
                .hasValueSatisfying(rate -> assertThat(rate)
                        .isEqualByComparingTo(new BigDecimal("0.049105")));
    }

    @Test
    void unknownCurrencyReturnsEmpty() {
        assertThat(BnmRateClient.parseRate(FIXTURE, "GBP")).isEmpty();
    }
}
