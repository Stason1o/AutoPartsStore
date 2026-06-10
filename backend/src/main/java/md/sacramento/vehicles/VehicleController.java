package md.sacramento.vehicles;

import md.sacramento.vehicles.vin.VinService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Ручной подбор автомобиля (фолбэк, когда VIN не распознан). */
@RestController
@RequestMapping("/api/vehicles")
public class VehicleController {

    private final VehicleRepository vehicles;

    public VehicleController(VehicleRepository vehicles) {
        this.vehicles = vehicles;
    }

    @GetMapping("/makes")
    public List<String> makes() {
        return vehicles.findDistinctMakes();
    }

    @GetMapping
    public List<VinService.VehicleCandidate> byMake(@RequestParam String make) {
        return vehicles.findByMakeIgnoreCaseOrderByModelAscYearFromAsc(make).stream()
                .map(VinService.VehicleCandidate::of)
                .toList();
    }
}
