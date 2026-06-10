package md.sacramento.importexport;

import md.sacramento.TestcontainersConfiguration;
import md.sacramento.catalog.CategoryService;
import md.sacramento.catalog.ProductDtos;
import md.sacramento.catalog.ProductRepository;
import md.sacramento.catalog.ProductService;
import md.sacramento.vehicles.ProductVehicle;
import md.sacramento.vehicles.ProductVehicleRepository;
import md.sacramento.vehicles.Vehicle;
import md.sacramento.vehicles.VehicleRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Import(TestcontainersConfiguration.class)
class ImportExportIntegrationTest {

    @Autowired
    SnapshotService snapshotService;

    @Autowired
    ImportService importService;

    @Autowired
    ProductService productService;

    @Autowired
    ProductRepository productRepository;

    @Autowired
    CategoryService categoryService;

    @Autowired
    VehicleRepository vehicleRepository;

    @Autowired
    ProductVehicleRepository productVehicleRepository;

    @Autowired
    SnapshotRepository snapshotRepository;

    @BeforeEach
    void setUp() {
        snapshotRepository.deleteAll();
        productVehicleRepository.deleteAll();
        productRepository.deleteAll();
        vehicleRepository.deleteAll();

        Long categoryId = categoryService.create("Радиаторы", null, null, 0).id();
        Long productId = productService.create(new ProductDtos.ProductRequest(
                "EXP-1", "Радиатор Audi A4", "Nissens", "Описание", categoryId,
                new BigDecimal("50"), "USD", null, new BigDecimal("999"), true,
                new BigDecimal("850"), 7, "12*3", "заметка", true,
                List.of("8D0121251", "8D0 121 251P"))).id();

        Vehicle a4 = new Vehicle();
        a4.setMake("Audi");
        a4.setModel("A4");
        a4.setYearFrom(1997);
        a4.setYearTo(2001);
        a4 = vehicleRepository.save(a4);
        productVehicleRepository.save(new ProductVehicle(productId, a4.getId(), false));

        productService.create(new ProductDtos.ProductRequest(
                "EXP-2", "Подкрыльник VW", null, null, null,
                null, "MDL", null, new BigDecimal("150"), true,
                null, 3, null, null, true, null));
    }

    @Test
    void exportProducesCsvAndXlsxWithAllProducts() {
        Snapshot snapshot = snapshotService.export(Snapshot.Trigger.MANUAL);

        assertThat(snapshot.getProductCount()).isEqualTo(2);
        String csv = new String(snapshot.getCsvData(), StandardCharsets.UTF_8);
        assertThat(csv).contains("EXP-1", "Радиатор Audi A4", "Audi|A4|1997|2001|", "12*3");
        assertThat(snapshot.getXlsxData().length).isGreaterThan(1000);
    }

    @Test
    @org.springframework.transaction.annotation.Transactional
    void roundTripImportUpdatesEverythingWithoutErrors() {
        Snapshot snapshot = snapshotService.export(Snapshot.Trigger.MANUAL);

        ImportService.Preview preview = importService.preview(snapshot.getCsvData(), "catalog.csv");

        assertThat(preview.errors()).isEmpty();
        assertThat(preview.toCreate()).isZero();
        assertThat(preview.toUpdate()).isEqualTo(2);

        ImportService.Report report = importService.confirm(preview.token());
        assertThat(report.updated()).isEqualTo(2);

        // данные не потерялись при цикле экспорт→импорт
        var product = productRepository.findBySku("EXP-1").orElseThrow();
        assertThat(product.getShelf()).isEqualTo("12*3");
        assertThat(product.getOemNumbers()).hasSize(2);
        assertThat(productVehicleRepository.findByIdProductId(product.getId())).hasSize(1);
        assertThat(product.getRetailPrice()).isEqualByComparingTo(new BigDecimal("999"));
    }

    @Test
    void deletedProductIsRecreatedFromSnapshot() {
        Snapshot snapshot = snapshotService.export(Snapshot.Trigger.MANUAL);
        productService.delete(productRepository.findBySku("EXP-1").orElseThrow().getId());

        ImportService.Preview preview = importService.preview(snapshot.getCsvData(), "catalog.csv");
        assertThat(preview.toCreate()).isEqualTo(1);
        assertThat(preview.toUpdate()).isEqualTo(1);

        importService.confirm(preview.token());
        assertThat(productRepository.findBySku("EXP-1")).isPresent();
    }

    @Test
    void importOfXlsxWorksSameAsCsv() {
        Snapshot snapshot = snapshotService.export(Snapshot.Trigger.MANUAL);

        ImportService.Preview preview = importService.preview(snapshot.getXlsxData(), "catalog.xlsx");

        assertThat(preview.errors()).isEmpty();
        assertThat(preview.toUpdate()).isEqualTo(2);
    }

    @Test
    void rowsWithoutSkuAreReportedAsErrors() {
        String csv = "Артикул;Название\n;Безымянный\nOK-1;Нормальный";
        ImportService.Preview preview = importService.preview(
                csv.getBytes(StandardCharsets.UTF_8), "x.csv");

        assertThat(preview.errors()).hasSize(1);
        assertThat(preview.errors().getFirst().row()).isEqualTo(2);
        assertThat(preview.toCreate()).isEqualTo(1);
    }
}
