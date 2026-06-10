package md.sacramento.catalog;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;

import java.math.BigDecimal;
import java.util.List;

public final class ProductDtos {

    private ProductDtos() {
    }

    /** Карточка в публичной выдаче — без закупки, опта и складских полей. */
    public record PublicListItem(Long id, String sku, String name, String slug, String brand,
                                 BigDecimal price, int available, Long mainPhotoId) {
    }

    public record PublicDetail(Long id, String sku, String name, String slug, String brand,
                               String description, BigDecimal price, int available,
                               List<String> oemNumbers, List<Long> photoIds,
                               List<String> fitsVehicles, Long categoryId, String categoryName) {
    }

    /** Полный DTO для админки. */
    public record AdminProduct(Long id, String sku, String name, String slug, String brand,
                               String description, Long categoryId,
                               BigDecimal purchasePrice, String purchaseCurrency,
                               BigDecimal markupPercent, BigDecimal retailPrice,
                               boolean retailPriceManual, BigDecimal wholesalePrice,
                               int stockQty, int reservedQty, String shelf, String adminNote,
                               boolean active, List<String> oemNumbers) {

        public static AdminProduct of(Product p) {
            return new AdminProduct(p.getId(), p.getSku(), p.getName(), p.getSlug(), p.getBrand(),
                    p.getDescription(), p.getCategory() != null ? p.getCategory().getId() : null,
                    p.getPurchasePrice(), p.getPurchaseCurrency(),
                    p.getMarkupPercent(), p.getRetailPrice(),
                    p.isRetailPriceManual(), p.getWholesalePrice(),
                    p.getStockQty(), p.getReservedQty(), p.getShelf(), p.getAdminNote(),
                    p.isActive(),
                    p.getOemNumbers().stream().map(OemNumber::getOemNumber).toList());
        }
    }

    public record ProductRequest(@NotBlank String sku, @NotBlank String name, String brand,
                                 String description, Long categoryId,
                                 BigDecimal purchasePrice, String purchaseCurrency,
                                 BigDecimal markupPercent, BigDecimal retailPrice,
                                 Boolean retailPriceManual, BigDecimal wholesalePrice,
                                 @PositiveOrZero Integer stockQty, String shelf, String adminNote,
                                 Boolean active, List<String> oemNumbers) {
    }
}
