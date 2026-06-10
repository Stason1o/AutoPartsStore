package md.sacramento.catalog;

import java.math.BigDecimal;
import java.util.Set;

/** Параметры поиска по каталогу; categoryIds — категория с потомками. */
public record ProductFilter(String search, Set<Long> categoryIds, Long vehicleId, String brand,
                            boolean inStockOnly, BigDecimal priceMin, BigDecimal priceMax,
                            boolean activeOnly) {
}
