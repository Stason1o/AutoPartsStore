package md.sacramento.vehicles.vin;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;

@Entity
@Table(name = "vin_cache")
public class VinCache {

    @Id
    @Column(length = 17)
    private String vin;

    private String make;

    private String model;

    private Integer modelYear;

    @JdbcTypeCode(SqlTypes.JSON)
    private String rawResponse;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private Instant decodedAt;

    protected VinCache() {
    }

    public VinCache(String vin, String make, String model, Integer modelYear, String rawResponse) {
        this.vin = vin;
        this.make = make;
        this.model = model;
        this.modelYear = modelYear;
        this.rawResponse = rawResponse;
    }

    public String getVin() { return vin; }
    public String getMake() { return make; }
    public String getModel() { return model; }
    public Integer getModelYear() { return modelYear; }
    public String getRawResponse() { return rawResponse; }
    public Instant getDecodedAt() { return decodedAt; }
}
