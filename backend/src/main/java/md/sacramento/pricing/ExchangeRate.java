package md.sacramento.pricing;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "exchange_rates")
public class ExchangeRate {

    public enum Source { BANK, MANUAL }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 3)
    private String currency;

    /** 1 единица валюты = rate MDL. */
    @Column(nullable = false)
    private BigDecimal rate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Source source;

    @Column(nullable = false)
    private LocalDate rateDate;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    protected ExchangeRate() {
    }

    public ExchangeRate(String currency, BigDecimal rate, Source source, LocalDate rateDate) {
        this.currency = currency;
        this.rate = rate;
        this.source = source;
        this.rateDate = rateDate;
    }

    public Long getId() { return id; }
    public String getCurrency() { return currency; }
    public BigDecimal getRate() { return rate; }
    public Source getSource() { return source; }
    public LocalDate getRateDate() { return rateDate; }
    public Instant getCreatedAt() { return createdAt; }
}
