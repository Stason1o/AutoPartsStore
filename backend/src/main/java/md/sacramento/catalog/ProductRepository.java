package md.sacramento.catalog;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;

public interface ProductRepository extends JpaRepository<Product, Long>, JpaSpecificationExecutor<Product> {

    Optional<Product> findBySku(String sku);

    Optional<Product> findBySlug(String slug);

    boolean existsBySku(String sku);

    boolean existsBySlug(String slug);

    java.util.List<Product> findBySkuIn(java.util.Collection<String> skus);

    @Query("select p.sku from Product p where p.sku in :skus")
    java.util.List<String> findExistingSkus(java.util.Collection<String> skus);

    @Query("select p.slug from Product p")
    java.util.List<String> findAllSlugs();

    /** Пары (productId, oemNumber) для экспорта — без загрузки сущностей и lazy-коллекций. */
    @Query("select p.id, o.oemNumber from Product p join p.oemNumbers o")
    java.util.List<Object[]> findAllOemPairs();

    long countByStockQtyAndActiveTrue(int stockQty);

    @Modifying
    @Query("update Product p set p.category = null where p.category.id = :categoryId")
    void detachCategory(Long categoryId);

    /** Товары без привязки к автомобилям — очередь на ручную привязку в админке. */
    @Query("""
            select p from Product p
            where not exists (select 1 from ProductVehicle pv where pv.id.productId = p.id)
            order by p.name
            """)
    org.springframework.data.domain.Page<Product> findUnmatched(org.springframework.data.domain.Pageable pageable);

    /** Валюты закупки, участвующие в автопересчёте. */
    @Query("""
            select distinct p.purchaseCurrency from Product p
            where p.retailPriceManual = false and p.purchasePrice is not null
            """)
    java.util.List<String> findDistinctPurchaseCurrencies();

    /**
     * Массовый пересчёт розницы одним UPDATE: каскад наценки товар→категория→глобальная,
     * округление по правилу. Дублирует PriceCalculator.retail на SQL — менять синхронно.
     */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query(nativeQuery = true, value = """
            WITH calc AS (
                SELECT p.id,
                       CASE CAST(:rule AS text)
                           WHEN 'NONE' THEN round(p.purchase_price * :rate
                               * (1 + COALESCE(p.markup_percent, c.markup_percent, :globalMarkup) / 100), 2)
                           WHEN 'TO_1' THEN ceil(p.purchase_price * :rate
                               * (1 + COALESCE(p.markup_percent, c.markup_percent, :globalMarkup) / 100))
                           ELSE ceil(p.purchase_price * :rate
                               * (1 + COALESCE(p.markup_percent, c.markup_percent, :globalMarkup) / 100) / 5) * 5
                       END AS new_price
                FROM products p
                LEFT JOIN categories c ON c.id = p.category_id
                WHERE p.retail_price_manual = false
                  AND p.purchase_price IS NOT NULL
                  AND p.purchase_currency = :currency
            )
            UPDATE products SET retail_price = calc.new_price, updated_at = now()
            FROM calc
            WHERE products.id = calc.id
              AND products.retail_price IS DISTINCT FROM calc.new_price
            """)
    int bulkRecalculate(String currency, java.math.BigDecimal rate,
                        java.math.BigDecimal globalMarkup, String rule);
}
