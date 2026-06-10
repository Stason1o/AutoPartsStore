package md.sacramento.media;

import md.sacramento.catalog.ProductRepository;
import md.sacramento.common.NotFoundException;
import md.sacramento.common.SettingsService;
import net.coobird.thumbnailator.Thumbnails;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.List;
import java.util.Set;

@Service
public class PhotoService {

    static final int THUMBNAIL_SIZE = 400;
    private static final Set<String> ALLOWED_TYPES =
            Set.of("image/jpeg", "image/png", "image/webp");

    private final ProductPhotoRepository photos;
    private final ProductRepository products;
    private final SettingsService settings;

    public PhotoService(ProductPhotoRepository photos, ProductRepository products,
                        SettingsService settings) {
        this.photos = photos;
        this.products = products;
        this.settings = settings;
    }

    @Transactional
    public Long upload(Long productId, MultipartFile file) {
        if (!products.existsById(productId)) {
            throw new NotFoundException("Товар не найден: " + productId);
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_TYPES.contains(contentType)) {
            throw new IllegalArgumentException("Допустимы только изображения JPEG, PNG или WebP");
        }
        long maxBytes = settings.getInt(SettingsService.PHOTO_MAX_SIZE_MB) * 1024L * 1024L;
        if (file.getSize() > maxBytes) {
            throw new IllegalArgumentException("Файл больше лимита "
                    + settings.get(SettingsService.PHOTO_MAX_SIZE_MB) + " МБ");
        }

        ProductPhoto photo = new ProductPhoto();
        photo.setProductId(productId);
        photo.setContentType(contentType);
        try {
            byte[] data = file.getBytes();
            photo.setData(data);
            photo.setThumbnail(makeThumbnail(data));
            photo.setSizeBytes(data.length);
        } catch (IOException e) {
            throw new UncheckedIOException("Не удалось прочитать файл", e);
        }
        boolean first = photos.countByProductId(productId) == 0;
        photo.setMain(first);
        photo.setSortOrder((int) photos.countByProductId(productId));
        return photos.save(photo).getId();
    }

    /** Миниатюра — всегда JPEG: компактно и без проблем с native image. */
    private byte[] makeThumbnail(byte[] original) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        Thumbnails.of(new java.io.ByteArrayInputStream(original))
                .size(THUMBNAIL_SIZE, THUMBNAIL_SIZE)
                .outputFormat("jpg")
                .outputQuality(0.85)
                .toOutputStream(out);
        return out.toByteArray();
    }

    public record PhotoContent(byte[] bytes, String contentType) {
    }

    @Transactional(readOnly = true)
    public PhotoContent content(Long photoId, boolean thumbnail) {
        ProductPhoto photo = photos.findById(photoId)
                .orElseThrow(() -> new NotFoundException("Фото не найдено: " + photoId));
        return thumbnail
                ? new PhotoContent(photo.getThumbnail(), "image/jpeg")
                : new PhotoContent(photo.getData(), photo.getContentType());
    }

    @Transactional(readOnly = true)
    public List<ProductPhotoRepository.PhotoMeta> list(Long productId) {
        return photos.findByProductIdOrderBySortOrderAsc(productId);
    }

    @Transactional
    public void setMain(Long photoId) {
        ProductPhoto photo = photos.findById(photoId)
                .orElseThrow(() -> new NotFoundException("Фото не найдено: " + photoId));
        photos.clearMain(photo.getProductId());
        photo.setMain(true);
        photos.save(photo);
    }

    @Transactional
    public void delete(Long photoId) {
        ProductPhoto photo = photos.findById(photoId)
                .orElseThrow(() -> new NotFoundException("Фото не найдено: " + photoId));
        boolean wasMain = photo.isMain();
        Long productId = photo.getProductId();
        photos.delete(photo);
        if (wasMain) {
            photos.findByProductIdOrderBySortOrderAsc(productId).stream()
                    .findFirst()
                    .ifPresent(meta -> setMain(meta.getId()));
        }
    }
}
