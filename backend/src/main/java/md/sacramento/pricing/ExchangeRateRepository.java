package md.sacramento.pricing;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ExchangeRateRepository extends JpaRepository<ExchangeRate, Long> {

    Optional<ExchangeRate> findFirstByCurrencyOrderByRateDateDescCreatedAtDesc(String currency);

    Optional<ExchangeRate> findFirstByCurrencyAndSourceOrderByRateDateDescCreatedAtDesc(
            String currency, ExchangeRate.Source source);

    @Query("select r from ExchangeRate r where r.currency = :currency order by r.rateDate desc, r.createdAt desc")
    List<ExchangeRate> findHistory(@Param("currency") String currency, Pageable pageable);

    boolean existsByCurrencyAndRateDateAndSource(String currency, java.time.LocalDate rateDate,
            ExchangeRate.Source source);
}
