package md.sacramento.vehicles;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface VehicleRepository extends JpaRepository<Vehicle, Long> {

    @Query("select distinct v.make from Vehicle v order by v.make")
    List<String> findDistinctMakes();

    /** Постраничный поиск по справочнику: марка или модель содержит строку. */
    @Query("""
            select v from Vehicle v
            where :q is null or lower(v.make) like :q or lower(v.model) like :q
            order by v.make, v.model, v.yearFrom
            """)
    org.springframework.data.domain.Page<Vehicle> search(@Param("q") String q,
            org.springframework.data.domain.Pageable pageable);

    List<Vehicle> findByMakeIgnoreCaseOrderByModelAscYearFromAsc(String make);

    Optional<Vehicle> findByMakeIgnoreCaseAndModelIgnoreCaseAndYearFromAndYearToAndEngine(
            String make, String model, Integer yearFrom, Integer yearTo, String engine);

    /** Автомобили, привязанные к товару (вкладка «Применимость» в админке). */
    @Query("""
            select v from Vehicle v
            join ProductVehicle pv on pv.id.vehicleId = v.id
            where pv.id.productId = :productId
            order by v.make, v.model, v.yearFrom
            """)
    List<Vehicle> findLinkedToProduct(@Param("productId") Long productId);

    /** Кандидаты под декодированный VIN: марка + пересечение по году (с допуском ±1). */
    @Query("""
            select v from Vehicle v
            where lower(v.make) = lower(:make)
              and (:year is null or v.yearFrom is null or v.yearFrom - 1 <= :year)
              and (:year is null or v.yearTo is null or v.yearTo + 1 >= :year)
            order by v.model, v.yearFrom
            """)
    List<Vehicle> findCandidates(@Param("make") String make, @Param("year") Integer year);
}
