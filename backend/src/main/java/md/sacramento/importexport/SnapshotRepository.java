package md.sacramento.importexport;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface SnapshotRepository extends JpaRepository<Snapshot, Long> {

    interface SnapshotMeta {
        Long getId();
        java.time.Instant getCreatedAt();
        Snapshot.Trigger getTrigger();
        int getProductCount();
    }

    List<SnapshotMeta> findAllByOrderByCreatedAtDesc(Pageable pageable);

    @Modifying
    @Query(value = "delete from snapshots where id not in (select id from snapshots order by created_at desc limit :keep)",
            nativeQuery = true)
    void deleteOlderThanLast(int keep);
}
