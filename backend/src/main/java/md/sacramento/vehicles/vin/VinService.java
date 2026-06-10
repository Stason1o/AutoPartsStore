package md.sacramento.vehicles.vin;

import md.sacramento.vehicles.Vehicle;
import md.sacramento.vehicles.VehicleRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class VinService {

    public record VehicleCandidate(Long id, String make, String model,
                                   Integer yearFrom, Integer yearTo, String engine, String display) {
        public static VehicleCandidate of(Vehicle v) {
            return new VehicleCandidate(v.getId(), v.getMake(), v.getModel(),
                    v.getYearFrom(), v.getYearTo(), v.getEngine(), v.display());
        }
    }

    public record DecodeResult(String vin, String make, String model, Integer modelYear,
                               List<VehicleCandidate> candidates) {
    }

    private final VinCacheRepository cache;
    private final LocalVinDecoder localDecoder;
    private final NhtsaClient nhtsaClient;
    private final VehicleRepository vehicles;

    public VinService(VinCacheRepository cache, LocalVinDecoder localDecoder,
                      NhtsaClient nhtsaClient, VehicleRepository vehicles) {
        this.cache = cache;
        this.localDecoder = localDecoder;
        this.nhtsaClient = nhtsaClient;
        this.vehicles = vehicles;
    }

    @Transactional
    public DecodeResult decode(String rawVin) {
        String vin = VinValidator.normalize(rawVin);

        VinCache cached = cache.findById(vin).orElseGet(() -> cache.save(decodeFresh(vin)));

        List<VehicleCandidate> candidates = cached.getMake() == null
                ? List.of()
                : vehicles.findCandidates(cached.getMake(), cached.getModelYear()).stream()
                        .map(VehicleCandidate::of)
                        .toList();

        return new DecodeResult(vin, cached.getMake(), cached.getModel(),
                cached.getModelYear(), candidates);
    }

    private VinCache decodeFresh(String vin) {
        Optional<String> make = localDecoder.make(vin);
        Optional<Integer> year = localDecoder.modelYear(vin);

        // vPIC обогащает то, чего не знаем сами: модель всегда, марку/год — если нет
        Optional<NhtsaClient.NhtsaResult> nhtsa = nhtsaClient.decode(vin);
        String resolvedMake = make.orElse(nhtsa.map(NhtsaClient.NhtsaResult::make).orElse(null));
        Integer resolvedYear = year.orElse(nhtsa.map(NhtsaClient.NhtsaResult::modelYear).orElse(null));
        String model = nhtsa.map(NhtsaClient.NhtsaResult::model).orElse(null);
        String raw = nhtsa.map(NhtsaClient.NhtsaResult::raw).orElse(null);

        return new VinCache(vin, resolvedMake, model, resolvedYear, raw);
    }
}
