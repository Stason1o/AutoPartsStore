package md.sacramento.catalog;

import md.sacramento.common.NotFoundException;
import md.sacramento.common.SlugUtil;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class CategoryService {

    public record CategoryNode(Long id, String name, String slug, int sortOrder,
                               boolean hasImage, List<CategoryNode> children) {
    }

    public record CategoryDto(Long id, String name, String slug, Long parentId,
                              BigDecimal markupPercent, int sortOrder, boolean active,
                              boolean hasImage) {

        static CategoryDto of(Category c) {
            return new CategoryDto(c.getId(), c.getName(), c.getSlug(),
                    c.getParent() != null ? c.getParent().getId() : null,
                    c.getMarkupPercent(), c.getSortOrder(), c.isActive(), c.hasImage());
        }
    }

    private final CategoryRepository categories;
    private final ProductRepository products;

    public CategoryService(CategoryRepository categories, ProductRepository products) {
        this.categories = categories;
        this.products = products;
    }

    /** Дерево активных категорий для витрины. */
    @Transactional(readOnly = true)
    public List<CategoryNode> publicTree() {
        List<Category> all = categories.findAll().stream().filter(Category::isActive).toList();
        return buildTree(all, null);
    }

    private List<CategoryNode> buildTree(List<Category> all, Long parentId) {
        return all.stream()
                .filter(c -> Objects.equals(c.getParent() != null ? c.getParent().getId() : null, parentId))
                .sorted((a, b) -> Integer.compare(a.getSortOrder(), b.getSortOrder()))
                .map(c -> new CategoryNode(c.getId(), c.getName(), c.getSlug(), c.getSortOrder(),
                        c.hasImage(), buildTree(all, c.getId())))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<CategoryDto> adminList() {
        return categories.findAll().stream()
                .sorted((a, b) -> Integer.compare(a.getSortOrder(), b.getSortOrder()))
                .map(CategoryDto::of)
                .toList();
    }

    /** Загрузка/замена фото категории (JPEG/PNG/WebP). */
    @Transactional
    public void setImage(Long id, byte[] data, String contentType) {
        if (contentType == null
                || !java.util.Set.of("image/jpeg", "image/png", "image/webp").contains(contentType)) {
            throw new IllegalArgumentException("Допустимы только изображения JPEG, PNG или WebP");
        }
        Category category = getOrThrow(id);
        category.setImage(data);
        category.setImageContentType(contentType);
        categories.save(category);
    }

    @Transactional
    public void deleteImage(Long id) {
        Category category = getOrThrow(id);
        category.setImage(null);
        category.setImageContentType(null);
        categories.save(category);
    }

    public record ImageContent(byte[] bytes, String contentType) {
    }

    @Transactional(readOnly = true)
    public ImageContent image(Long id) {
        Category category = getOrThrow(id);
        if (!category.hasImage()) {
            throw new NotFoundException("У категории нет фото: " + id);
        }
        return new ImageContent(category.getImage(), category.getImageContentType());
    }

    @Transactional
    public CategoryDto create(String name, Long parentId, BigDecimal markupPercent, int sortOrder) {
        Category category = new Category();
        category.setName(name);
        category.setSlug(uniqueSlug(name));
        category.setMarkupPercent(markupPercent);
        category.setSortOrder(sortOrder);
        if (parentId != null) {
            category.setParent(getOrThrow(parentId));
        }
        return CategoryDto.of(categories.save(category));
    }

    @Transactional
    public CategoryDto update(Long id, String name, Long parentId, BigDecimal markupPercent,
                              int sortOrder, boolean active) {
        Category category = getOrThrow(id);
        category.setName(name);
        category.setMarkupPercent(markupPercent);
        category.setSortOrder(sortOrder);
        category.setActive(active);
        if (parentId == null) {
            category.setParent(null);
        } else {
            if (wouldCreateCycle(id, parentId)) {
                throw new IllegalArgumentException("Категория не может быть вложена в собственного потомка");
            }
            category.setParent(getOrThrow(parentId));
        }
        return CategoryDto.of(categories.save(category));
    }

    @Transactional
    public void delete(Long id) {
        Category category = getOrThrow(id);
        if (categories.existsByParentId(id)) {
            throw new IllegalStateException("Сначала удалите или перенесите подкатегории");
        }
        products.detachCategory(id);
        categories.delete(category);
    }

    /** Id категории и всех её потомков — для фильтра товаров по разделу. */
    @Transactional(readOnly = true)
    public Set<Long> subtreeIds(Long rootId) {
        Map<Long, List<Category>> byParent = categories.findAll().stream()
                .filter(c -> c.getParent() != null)
                .collect(Collectors.groupingBy(c -> c.getParent().getId()));
        Set<Long> result = new HashSet<>();
        List<Long> queue = new ArrayList<>(List.of(rootId));
        while (!queue.isEmpty()) {
            Long current = queue.removeLast();
            if (result.add(current)) {
                byParent.getOrDefault(current, List.of()).forEach(c -> queue.add(c.getId()));
            }
        }
        return result;
    }

    Category getOrThrow(Long id) {
        return categories.findById(id)
                .orElseThrow(() -> new NotFoundException("Категория не найдена: " + id));
    }

    private boolean wouldCreateCycle(Long id, Long newParentId) {
        Long current = newParentId;
        while (current != null) {
            if (current.equals(id)) {
                return true;
            }
            Category parent = categories.findById(current).map(Category::getParent).orElse(null);
            current = parent != null ? parent.getId() : null;
        }
        return false;
    }

    private String uniqueSlug(String name) {
        String base = SlugUtil.slugify(name);
        String slug = base;
        int i = 2;
        while (categories.existsBySlug(slug)) {
            slug = base + "-" + i++;
        }
        return slug;
    }
}
