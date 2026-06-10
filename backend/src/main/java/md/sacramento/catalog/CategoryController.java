package md.sacramento.catalog;

import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.context.request.WebRequest;

import java.time.Duration;
import java.util.List;

@RestController
@RequestMapping("/api/categories")
public class CategoryController {

    private final CategoryService service;

    public CategoryController(CategoryService service) {
        this.service = service;
    }

    @GetMapping
    public List<CategoryService.CategoryNode> tree() {
        return service.publicTree();
    }

    /** Фото категории для плитки на витрине; ETag меняется при замене картинки. */
    @GetMapping("/{id}/image")
    public ResponseEntity<byte[]> image(@PathVariable Long id, WebRequest request) {
        CategoryService.ImageContent content = service.image(id);
        String etag = "\"cat-img-" + id + "-" + content.bytes().length + "\"";
        if (request.checkNotModified(etag)) {
            return ResponseEntity.status(304).build();
        }
        return ResponseEntity.ok()
                .eTag(etag)
                .cacheControl(CacheControl.maxAge(Duration.ofDays(7)).cachePublic())
                .contentType(MediaType.parseMediaType(content.contentType()))
                .body(content.bytes());
    }
}
