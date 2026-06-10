package md.sacramento.vehicles;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface VehicleRepository extends JpaRepository<Vehicle, Long> {

    @Query("select distinct v.make from Vehicle v order by v.make")
    List<String> findDistinctMakes();

    List<Vehicle> findByMakeIgnoreCaseOrderByModelAscYearFromAsc(String make);

    Optional<Vehicle> findByMakeIgnoreCaseAndModelIgnoreCaseAndYearFromAndYearToAndEngine(
            String make, String model, Integer yearFrom, Integer yearTo, String engine);

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
