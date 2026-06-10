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

    long countByStockQtyAndActiveTrue(int stockQty);

    @Modifying
    @Query("update Product p set p.category = null where p.category.id = :categoryId")
    void detachCategory(Long categoryId);

    /** Кандидаты на пересчёт цены: автоцена + есть закупка (категория сразу — против N+1). */
    @Query("""
            select p from Product p left join fetch p.category
            where p.retailPriceManual = false and p.purchasePrice is not null
            """)
    java.util.List<Product> findAllForRecalculation();
}
