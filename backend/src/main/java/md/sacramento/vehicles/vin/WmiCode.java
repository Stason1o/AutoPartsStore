package md.sacramento.vehicles.vin;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "wmi_codes")
public class WmiCode {

    @Id
    @Column(length = 6)
    private String wmi;

    @Column(nullable = false)
    private String make;

    protected WmiCode() {
    }

    public WmiCode(String wmi, String make) {
        this.wmi = wmi;
        this.make = make;
    }

    public String getWmi() { return wmi; }
    public String getMake() { return make; }
}
