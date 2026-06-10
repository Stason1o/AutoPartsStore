package md.sacramento.catalog;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

import java.util.Objects;

@Embeddable
public class OemNumber {

    @Column(nullable = false)
    private String oemNumber;

    @Column(nullable = false)
    private String normalized;

    protected OemNumber() {
    }

    public OemNumber(String raw) {
        this.oemNumber = raw.trim();
        this.normalized = normalize(raw);
    }

    /** UPPER + только латиница/цифры — для поиска независимо от пробелов и дефисов. */
    public static String normalize(String raw) {
        return raw.toUpperCase().replaceAll("[^A-Z0-9]", "");
    }

    public String getOemNumber() { return oemNumber; }
    public String getNormalized() { return normalized; }

    @Override
    public boolean equals(Object o) {
        return o instanceof OemNumber other && Objects.equals(normalized, other.normalized);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(normalized);
    }
}
