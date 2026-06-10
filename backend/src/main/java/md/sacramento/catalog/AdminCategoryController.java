package md.sacramento.catalog;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/admin/categories")
public class AdminCategoryController {

    public record CategoryRequest(@NotBlank String name, Long parentId, BigDecimal markupPercent,
                                  Integer sortOrder, Boolean active) {
    }

    private final CategoryService service;

    public AdminCategoryController(CategoryService service) {
        this.service = service;
    }

    @GetMapping
    public List<CategoryService.CategoryDto> list() {
        return service.adminList();
    }

    @PostMapping
    public CategoryService.CategoryDto create(@Valid @RequestBody CategoryRequest body) {
        return service.create(body.name(), body.parentId(), body.markupPercent(),
                body.sortOrder() != null ? body.sortOrder() : 0);
    }

    @PutMapping("/{id}")
    public CategoryService.CategoryDto update(@PathVariable Long id,
                                              @Valid @RequestBody CategoryRequest body) {
        return service.update(id, body.name(), body.parentId(), body.markupPercent(),
                body.sortOrder() != null ? body.sortOrder() : 0,
                body.active() == null || body.active());
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }

    @PostMapping("/{id}/image")
    public void uploadImage(@PathVariable Long id, @RequestParam("file") MultipartFile file) {
        try {
            service.setImage(id, file.getBytes(), file.getContentType());
        } catch (IOException e) {
            throw new UncheckedIOException("Не удалось прочитать файл", e);
        }
    }

    @DeleteMapping("/{id}/image")
    public void deleteImage(@PathVariable Long id) {
        service.deleteImage(id);
    }
}
