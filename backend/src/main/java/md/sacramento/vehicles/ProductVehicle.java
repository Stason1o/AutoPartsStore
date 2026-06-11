package md.sacramento.vehicles;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

import java.io.Serializable;
import java.util.Objects;

@Entity
@Table(name = "product_vehicles")
public class ProductVehicle implements org.springframework.data.domain.Persistable<ProductVehicle.Key> {

    @Embeddable
    public static class Key implements Serializable {
        @Column(name = "product_id")
        private Long productId;

        @Column(name = "vehicle_id")
        private Long vehicleId;

        protected Key() {
        }

        public Key(Long productId, Long vehicleId) {
            this.productId = productId;
            this.vehicleId = vehicleId;
        }

        public Long getProductId() { return productId; }
        public Long getVehicleId() { return vehicleId; }

        @Override
        public boolean equals(Object o) {
            return o instanceof Key k
                && Objects.equals(productId, k.productId)
                && Objects.equals(vehicleId, k.vehicleId);
        }

        @Override
        public int hashCode() {
            return Objects.hash(productId, vehicleId);
        }
    }

    @EmbeddedId
    private Key id;

    @Column(nullable = false)
    private boolean autoMatched;

    /** Составной ключ известен до вставки — без isNew() save() уходит в merge с SELECT на строку. */
    @jakarta.persistence.Transient
    private boolean isNew = false;

    protected ProductVehicle() {
    }

    public ProductVehicle(Long productId, Long vehicleId, boolean autoMatched) {
        this.id = new Key(productId, vehicleId);
        this.autoMatched = autoMatched;
        this.isNew = true;
    }

    @Override
    public boolean isNew() {
        return isNew;
    }

    @jakarta.persistence.PostPersist
    @jakarta.persistence.PostLoad
    void markNotNew() {
        this.isNew = false;
    }

    public Key getId() { return id; }
    public boolean isAutoMatched() { return autoMatched; }
    public void setAutoMatched(boolean autoMatched) { this.autoMatched = autoMatched; }
}
