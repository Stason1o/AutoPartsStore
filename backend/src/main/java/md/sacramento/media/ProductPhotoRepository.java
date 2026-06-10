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

    @Modifying
    @Query("update ProductPhoto p set p.isMain = false where p.productId = :productId")
    void clearMain(Long productId);

    long countByProductId(Long productId);
}
