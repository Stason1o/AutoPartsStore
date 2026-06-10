package md.sacramento.media;

import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.context.request.WebRequest;

import java.time.Duration;

@RestController
@RequestMapping("/api/photos")
public class PhotoController {

    private final PhotoService service;

    public PhotoController(PhotoService service) {
        this.service = service;
    }

    @GetMapping("/{id}")
    public ResponseEntity<byte[]> photo(@PathVariable Long id,
                                        @RequestParam(defaultValue = "false") boolean thumb,
                                        WebRequest request) {
        // Фото неизменяемы (правка = новая запись), поэтому ETag по id достаточен
        String etag = "\"photo-" + id + (thumb ? "-t" : "") + "\"";
        if (request.checkNotModified(etag)) {
            return ResponseEntity.status(304).build();
        }
        PhotoService.PhotoContent content = service.content(id, thumb);
        return ResponseEntity.ok()
                .eTag(etag)
                .cacheControl(CacheControl.maxAge(Duration.ofDays(30)).cachePublic())
                .contentType(MediaType.parseMediaType(content.contentType()))
                .body(content.bytes());
    }
}
