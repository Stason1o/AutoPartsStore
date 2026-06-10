package md.sacramento.importexport.legacy;

import md.sacramento.TestcontainersConfiguration;
import md.sacramento.catalog.ProductRepository;
import md.sacramento.importexport.ImportService;
import md.sacramento.pricing.PricingService;
import md.sacramento.vehicles.ProductVehicleRepository;
import md.sacramento.vehicles.VehicleRepository;
import org.apache.poi.hssf.usermodel.HSSFWorkbook;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Import(TestcontainersConfiguration.class)
class LegacyImportIntegrationTest {

    @Autowired
    LegacyXlsImporter legacyImporter;

    @Autowired
    ImportService importService;

    @Autowired
    ProductRepository productRepository;

    @Autowired
    ProductVehicleRepository productVehicleRepository;

    @Autowired
    VehicleRepository vehicleRepository;

    @Autowired
    PricingService pricingService;

    @BeforeEach
    void setUp() {
        productVehicleRepository.deleteAll();
        productRepository.deleteAll();
        vehicleRepository.deleteAll();
        pricingService.saveBankRate("USD", new BigDecimal("17.00"), LocalDate.now());
    }

    /** Мини-копия структуры листа «офис»: шапка + товарные строки. */
    private byte[] legacyXls() throws Exception {
        try (HSSFWorkbook workbook = new HSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("офис");
            Row header = sheet.createRow(3);
            header.createCell(0).setCellValue("DENUMIREA");
            header.createCell(1).setCellValue("n/INV N");
            header.createCell(3).setCellValue("kol-vo");

            Row r1 = sheet.createRow(4);
            r1.createCell(0).setCellValue("Audi A4  8/97>01 kondic. radiator");
            r1.createCell(1).setCellValue("43*19");
            r1.createCell(2).setCellValue("94594");
            r1.createCell(4).setCellValue(24.13);
            r1.createCell(7).setCellValue(3);

            Row r2 = sheet.createRow(5);
            r2.createCell(0).setCellValue("подсветка номера");
            r2.createCell(1).setCellValue("без доков");
            r2.createCell(2).setCellValue("003-07-904");
            r2.createCell(7).setCellValue(1);

            // дубль артикула
            Row r3 = sheet.createRow(6);
            r3.createCell(0).setCellValue("подсветка номера левая");
            r3.createCell(2).setCellValue("003-07-904");
            r3.createCell(7).setCellValue(2);

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            return out.toByteArray();
        }
    }

    @Test
    @Transactional
    void importsLegacyFileWithApplicabilityShelfAndPrices() throws Exception {
        ImportService.Preview preview = legacyImporter.preview(legacyXls());

        assertThat(preview.errors()).isEmpty();
        assertThat(preview.toCreate()).isEqualTo(3);

        importService.confirm(preview.token());

        var radiator = productRepository.findBySku("94594").orElseThrow();
        assertThat(radiator.getShelf()).isEqualTo("43*19");
        assertThat(radiator.getStockQty()).isEqualTo(3);
        assertThat(radiator.getPurchasePrice()).isEqualByComparingTo(new BigDecimal("24.13"));
        // цена посчиталась: 24.13 × 17.00 × 1.30 = 533.27… → 534 (TO_1 вверх)
        assertThat(radiator.getRetailPrice()).isEqualByComparingTo(new BigDecimal("534"));

        // применимость распознана и помечена как auto_matched
        var links = productVehicleRepository.findByIdProductId(radiator.getId());
        assertThat(links).hasSize(1);
        assertThat(links.getFirst().isAutoMatched()).isTrue();
        var vehicle = vehicleRepository.findById(links.getFirst().getId().getVehicleId()).orElseThrow();
        assertThat(vehicle.getMake()).isEqualTo("Audi");
        assertThat(vehicle.getYearFrom()).isEqualTo(1997);
        assertThat(vehicle.getYearTo()).isEqualTo(2001);

        // строка без применимости — без связей, пометка ушла в admin_note
        var lamp = productRepository.findBySku("003-07-904").orElseThrow();
        assertThat(productVehicleRepository.findByIdProductId(lamp.getId())).isEmpty();
        assertThat(lamp.getAdminNote()).isEqualTo("без доков");

        // дубль артикула получил суффикс и пометку
        var duplicate = productRepository.findBySku("003-07-904-2").orElseThrow();
        assertThat(duplicate.getAdminNote()).contains("Дубль артикула");
        assertThat(duplicate.getStockQty()).isEqualTo(2);
    }
}
