package md.sacramento.vehicles;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "vehicles")
public class Vehicle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String make;

    @Column(nullable = false)
    private String model;

    private Integer yearFrom;

    private Integer yearTo;

    private String engine;

    /** Человекочитаемое описание: «Audi A4 1997–2001 1.9 TDI». */
    public String display() {
        StringBuilder sb = new StringBuilder(make).append(' ').append(model);
        if (yearFrom != null || yearTo != null) {
            sb.append(' ')
              .append(yearFrom != null ? yearFrom : "…")
              .append('–')
              .append(yearTo != null ? yearTo : "…");
        }
        if (engine != null) {
            sb.append(' ').append(engine);
        }
        return sb.toString();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getMake() { return make; }
    public void setMake(String make) { this.make = make; }
    public String getModel() { return model; }
    public void setModel(String model) { this.model = model; }
    public Integer getYearFrom() { return yearFrom; }
    public void setYearFrom(Integer yearFrom) { this.yearFrom = yearFrom; }
    public Integer getYearTo() { return yearTo; }
    public void setYearTo(Integer yearTo) { this.yearTo = yearTo; }
    public String getEngine() { return engine; }
    public void setEngine(String engine) { this.engine = engine; }
}
