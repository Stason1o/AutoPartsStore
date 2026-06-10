package md.sacramento.vehicles;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import md.sacramento.catalog.ProductDtos;
import md.sacramento.catalog.ProductRepository;
import md.sacramento.common.NotFoundException;
import md.sacramento.vehicles.vin.VinService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin/vehicles")
public class AdminVehicleController {

    public record VehicleRequest(@NotBlank String make, @NotBlank String model,
                                 Integer yearFrom, Integer yearTo, String engine) {
    }

    private final VehicleRepository vehicles;
    private final ProductVehicleRepository links;
    private final ProductRepository products;

    public AdminVehicleController(VehicleRepository vehicles, ProductVehicleRepository links,
                                  ProductRepository products) {
        this.vehicles = vehicles;
        this.links = links;
        this.products = products;
    }

    @GetMapping
    public List<VinService.VehicleCandidate> list(@RequestParam(required = false) String make) {
        List<Vehicle> result = make != null
                ? vehicles.findByMakeIgnoreCaseOrderByModelAscYearFromAsc(make)
                : vehicles.findAll();
        return result.stream().map(VinService.VehicleCandidate::of).toList();
    }

    @PostMapping
    public VinService.VehicleCandidate create(@Valid @RequestBody VehicleRequest body) {
        Vehicle vehicle = new Vehicle();
        apply(vehicle, body);
        return VinService.VehicleCandidate.of(vehicles.save(vehicle));
    }

    @PutMapping("/{id}")
    public VinService.VehicleCandidate update(@PathVariable Long id,
                                              @Valid @RequestBody VehicleRequest body) {
        Vehicle vehicle = vehicles.findById(id)
                .orElseThrow(() -> new NotFoundException("Автомобиль не найден: " + id));
        apply(vehicle, body);
        return VinService.VehicleCandidate.of(vehicles.save(vehicle));
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        if (!vehicles.existsById(id)) {
            throw new NotFoundException("Автомобиль не найден: " + id);
        }
        vehicles.deleteById(id);
    }

    /** Привязка «товар подходит к автомобилю». */
    @PostMapping("/{vehicleId}/products/{productId}")
    @Transactional
    public void link(@PathVariable Long vehicleId, @PathVariable Long productId) {
        if (!vehicles.existsById(vehicleId)) {
            throw new NotFoundException("Автомобиль не найден: " + vehicleId);
        }
        if (!products.existsById(productId)) {
            throw new NotFoundException("Товар не найден: " + productId);
        }
        links.save(new ProductVehicle(productId, vehicleId, false));
    }

    @DeleteMapping("/{vehicleId}/products/{productId}")
    public void unlink(@PathVariable Long vehicleId, @PathVariable Long productId) {
        links.deleteById(new ProductVehicle.Key(productId, vehicleId));
    }

    /** Очередь нераспознанных: товары без единой привязки к авто. */
    @GetMapping("/unmatched-products")
    public Page<ProductDtos.AdminProduct> unmatched(@RequestParam(defaultValue = "0") int page,
                                                    @RequestParam(defaultValue = "50") int size) {
        return products.findUnmatched(PageRequest.of(page, Math.clamp(size, 1, 100)))
                .map(ProductDtos.AdminProduct::of);
    }

    private void apply(Vehicle vehicle, VehicleRequest body) {
        if (body.yearFrom() != null && body.yearTo() != null && body.yearFrom() > body.yearTo()) {
            throw new IllegalArgumentException("Год начала выпуска больше года окончания");
        }
        vehicle.setMake(body.make().trim());
        vehicle.setModel(body.model().trim());
        vehicle.setYearFrom(body.yearFrom());
        vehicle.setYearTo(body.yearTo());
        vehicle.setEngine(body.engine() != null && !body.engine().isBlank() ? body.engine().trim() : null);
    }
}
