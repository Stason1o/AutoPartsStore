package md.sacramento.importexport;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.List;

@RestController
@RequestMapping("/api/admin")
public class AdminImportExportController {

    private final SnapshotService snapshotService;
    private final ImportService importService;

    public AdminImportExportController(SnapshotService snapshotService, ImportService importService) {
        this.snapshotService = snapshotService;
        this.importService = importService;
    }

    @GetMapping("/export/snapshots")
    public List<SnapshotRepository.SnapshotMeta> history(
            @RequestParam(defaultValue = "30") int limit) {
        return snapshotService.history(limit);
    }

    @PostMapping("/export/run")
    public SnapshotRepository.SnapshotMeta runNow() {
        Snapshot snapshot = snapshotService.export(Snapshot.Trigger.MANUAL);
        return new SnapshotRepository.SnapshotMeta() {
            public Long getId() { return snapshot.getId(); }
            public java.time.Instant getCreatedAt() { return snapshot.getCreatedAt(); }
            public Snapshot.Trigger getTrigger() { return snapshot.getTrigger(); }
            public int getProductCount() { return snapshot.getProductCount(); }
        };
    }

    @GetMapping("/export/snapshots/{id}/{format}")
    public ResponseEntity<byte[]> download(@PathVariable Long id, @PathVariable String format) {
        SnapshotService.FileContent file = snapshotService.download(id, "xlsx".equals(format));
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + file.filename() + "\"")
                .contentType(MediaType.parseMediaType(file.contentType()))
                .body(file.bytes());
    }

    @PostMapping("/import")
    public ImportService.Preview upload(@RequestParam("file") MultipartFile file) {
        try {
            return importService.preview(file.getBytes(), file.getOriginalFilename());
        } catch (IOException e) {
            throw new UncheckedIOException("Не удалось прочитать файл", e);
        }
    }

    @PostMapping("/import/{token}/confirm")
    public ImportService.Report confirm(@PathVariable String token) {
        return importService.confirm(token);
    }
}
