package md.sacramento.media;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface ProductPhotoRepository extends JpaRepository<ProductPhoto, Long> {

    interface PhotoMeta {
        Long getId();
        Long getProductId();
        String getContentType();
        boolean getIsMain();
        int getSortOrder();
        int getSizeBytes();
    }

    List<PhotoMeta> findByProductIdOrderBySortOrderAsc(Long productId);

    interface MainPhotoRow {
        Long getProductId();
        Long getId();
    }

    /** Главные фото пачкой — против N+1 в списке каталога. */
    @Query("""
            select p.productId as productId, min(p.id) as id from ProductPhoto p
            where p.productId in :productIds and p.isMain = true
            group by p.productId
            """)
    List<MainPhotoRow> findMainPhotoIds(java.util.Collection<Long> productIds);

    @Query("select p.id from ProductPhoto p where p.productId = :productId order by p.sortOrder")
    List<Long> findIdsByProductId(Long productId);

    @Modifying
    @Query("update ProductPhoto p set p.isMain = false where p.productId = :productId")
    void clearMain(Long productId);

    long countByProductId(Long productId);
}
