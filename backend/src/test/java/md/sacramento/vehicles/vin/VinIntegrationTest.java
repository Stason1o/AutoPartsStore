package md.sacramento.vehicles.vin;

import md.sacramento.TestcontainersConfiguration;
import md.sacramento.vehicles.Vehicle;
import md.sacramento.vehicles.VehicleRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@SpringBootTest
@Import(TestcontainersConfiguration.class)
class VinIntegrationTest {

    @Autowired
    VinService vinService;

    @Autowired
    VehicleRepository vehicleRepository;

    @Autowired
    VinCacheRepository vinCacheRepository;

    @MockitoBean
    NhtsaClient nhtsaClient;

    // WVW → Volkswagen, 10-й символ X → 1999 (2029 ещё не наступил)
    static final String VW_VIN_1999 = "WVWZZZ1JZXW000001";

    @BeforeEach
    void setUp() {
        vinCacheRepository.deleteAll();
        vehicleRepository.deleteAll();
        when(nhtsaClient.decode(anyString())).thenReturn(Optional.empty());
    }

    private Long vehicle(String make, String model, Integer from, Integer to) {
        Vehicle v = new Vehicle();
        v.setMake(make);
        v.setModel(model);
        v.setYearFrom(from);
        v.setYearTo(to);
        return vehicleRepository.save(v).getId();
    }

    @Test
    void decodesMakeAndYearLocallyAndFindsCandidates() {
        Long golf4 = vehicle("Volkswagen", "Golf IV", 1997, 2003);
        vehicle("Volkswagen", "Golf VI", 2008, 2012);   // год не подходит
        vehicle("Audi", "A4", 1997, 2001);               // марка не подходит

        VinService.DecodeResult result = vinService.decode(VW_VIN_1999);

        assertThat(result.make()).isEqualTo("Volkswagen");
        assertThat(result.modelYear()).isEqualTo(1999);
        assertThat(result.candidates()).extracting(VinService.VehicleCandidate::id)
                .containsExactly(golf4);
    }

    @Test
    void secondDecodeIsServedFromCache() {
        vinService.decode(VW_VIN_1999);
        vinService.decode(VW_VIN_1999);

        verify(nhtsaClient, times(1)).decode(VW_VIN_1999);
        assertThat(vinCacheRepository.findById(VW_VIN_1999)).isPresent();
    }

    @Test
    void nhtsaEnrichesUnknownWmi() {
        // 5YJ — Tesla есть в WMI; возьмём префикс вне словаря: "ZZZ"
        String unknownVin = "ZZZZZZ1JZXW000001";
        when(nhtsaClient.decode(unknownVin)).thenReturn(Optional.of(
                new NhtsaClient.NhtsaResult("Tesla", "Model 3", 2019, "{}")));

        VinService.DecodeResult result = vinService.decode(unknownVin);

        assertThat(result.make()).isEqualTo("Tesla");
        assertThat(result.model()).isEqualTo("Model 3");
        // локальный год (X→1999) приоритетнее, т.к. он вычислен из самого VIN
        assertThat(result.modelYear()).isEqualTo(1999);
    }

    @Test
    void vehicleWithoutYearsMatchesAnyYear() {
        Long anyYears = vehicle("Volkswagen", "Transporter", null, null);

        VinService.DecodeResult result = vinService.decode(VW_VIN_1999);

        assertThat(result.candidates()).extracting(VinService.VehicleCandidate::id)
                .containsExactly(anyYears);
    }
}
