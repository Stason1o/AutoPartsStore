package md.sacramento.importexport;

import jakarta.persistence.Basic;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

@Entity
@Table(name = "snapshots")
public class Snapshot {

    public enum Trigger { SCHEDULED, MANUAL }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "trigger_type", nullable = false)
    private Trigger trigger;

    @Column(nullable = false)
    private int productCount;

    @Basic(fetch = FetchType.LAZY)
    @Column(nullable = false)
    private byte[] csvData;

    @Basic(fetch = FetchType.LAZY)
    @Column(nullable = false)
    private byte[] xlsxData;

    protected Snapshot() {
    }

    public Snapshot(Trigger trigger, int productCount, byte[] csvData, byte[] xlsxData) {
        this.trigger = trigger;
        this.productCount = productCount;
        this.csvData = csvData;
        this.xlsxData = xlsxData;
    }

    public Long getId() { return id; }
    public Instant getCreatedAt() { return createdAt; }
    public Trigger getTrigger() { return trigger; }
    public int getProductCount() { return productCount; }
    public byte[] getCsvData() { return csvData; }
    public byte[] getXlsxData() { return xlsxData; }
}
