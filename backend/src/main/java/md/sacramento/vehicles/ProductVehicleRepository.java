package md.sacramento.vehicles;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface ProductVehicleRepository extends JpaRepository<ProductVehicle, ProductVehicle.Key> {

    List<ProductVehicle> findByIdProductId(Long productId);

    List<ProductVehicle> findByIdVehicleId(Long vehicleId);

    void deleteByIdProductId(Long productId);

    void deleteByIdProductIdIn(java.util.Collection<Long> productIds);

    @Query("select pv.id.productId from ProductVehicle pv")
    List<Long> findAllLinkedProductIds();

    /** Пары (productId, vehicleId) для экспорта — без загрузки сущностей в persistence context. */
    @Query("select pv.id.productId, pv.id.vehicleId from ProductVehicle pv")
    List<Object[]> findAllLinkPairs();
}
