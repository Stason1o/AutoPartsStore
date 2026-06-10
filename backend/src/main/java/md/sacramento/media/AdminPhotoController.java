package md.sacramento.media;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class AdminPhotoController {

    private final PhotoService service;

    public AdminPhotoController(PhotoService service) {
        this.service = service;
    }

    @GetMapping("/products/{productId}/photos")
    public List<ProductPhotoRepository.PhotoMeta> list(@PathVariable Long productId) {
        return service.list(productId);
    }

    @PostMapping("/products/{productId}/photos")
    public Map<String, Long> upload(@PathVariable Long productId,
                                    @RequestParam("file") MultipartFile file) {
        return Map.of("id", service.upload(productId, file));
    }

    @PostMapping("/photos/{photoId}/main")
    public void setMain(@PathVariable Long photoId) {
        service.setMain(photoId);
    }

    @DeleteMapping("/photos/{photoId}")
    public void delete(@PathVariable Long photoId) {
        service.delete(photoId);
    }
}
