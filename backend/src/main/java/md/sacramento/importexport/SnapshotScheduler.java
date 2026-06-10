package md.sacramento.importexport;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class SnapshotScheduler {

    private static final Logger log = LoggerFactory.getLogger(SnapshotScheduler.class);

    private final SnapshotService snapshotService;

    public SnapshotScheduler(SnapshotService snapshotService) {
        this.snapshotService = snapshotService;
    }

    /** Ежедневный снэпшот каталога в конце дня. */
    @Scheduled(cron = "0 55 23 * * *", zone = "Europe/Chisinau")
    public void nightlySnapshot() {
        try {
            snapshotService.export(Snapshot.Trigger.SCHEDULED);
        } catch (Exception e) {
            log.error("Не удалось создать ежедневный снэпшот", e);
        }
    }
}
