package md.sacramento.media;

import md.sacramento.TestcontainersConfiguration;
import md.sacramento.catalog.ProductDtos;
import md.sacramento.catalog.ProductRepository;
import md.sacramento.catalog.ProductService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.mock.web.MockMultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

@SpringBootTest
@Import(TestcontainersConfiguration.class)
class PhotoIntegrationTest {

    @Autowired
    PhotoService photoService;

    @Autowired
    ProductService productService;

    @Autowired
    ProductRepository productRepository;

    @Autowired
    ProductPhotoRepository photoRepository;

    Long productId;

    @BeforeEach
    void setUp() {
        photoRepository.deleteAll();
        productRepository.deleteAll();
        productId = productService.create(new ProductDtos.ProductRequest(
                "PHOTO-TEST", "Товар с фото", null, null, null,
                null, "USD", null, null, true, null, 1, null, null, true, null)).id();
    }

    private MockMultipartFile pngFile(int width, int height) throws Exception {
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(image, "png", out);
        return new MockMultipartFile("file", "photo.png", "image/png", out.toByteArray());
    }

    @Test
    void uploadCreatesThumbnailAndFirstPhotoBecomesMain() throws Exception {
        Long photoId = photoService.upload(productId, pngFile(1200, 800));

        PhotoService.PhotoContent thumb = photoService.content(photoId, true);
        assertThat(thumb.contentType()).isEqualTo("image/jpeg");
        BufferedImage thumbImage = ImageIO.read(new ByteArrayInputStream(thumb.bytes()));
        assertThat(thumbImage.getWidth()).isLessThanOrEqualTo(PhotoService.THUMBNAIL_SIZE);

        assertThat(photoService.list(productId).getFirst().getIsMain()).isTrue();
    }

    @Test
    void secondPhotoIsNotMainUntilSelected() throws Exception {
        photoService.upload(productId, pngFile(100, 100));
        Long second = photoService.upload(productId, pngFile(200, 200));

        assertThat(photoService.list(productId)).hasSize(2);
        assertThat(photoRepository.findById(second).orElseThrow().isMain()).isFalse();

        photoService.setMain(second);
        assertThat(photoRepository.findById(second).orElseThrow().isMain()).isTrue();
        assertThat(photoService.list(productId).stream()
                .filter(ProductPhotoRepository.PhotoMeta::getIsMain).count()).isEqualTo(1);
    }

    @Test
    void deletingMainPromotesNextPhoto() throws Exception {
        Long first = photoService.upload(productId, pngFile(100, 100));
        Long second = photoService.upload(productId, pngFile(200, 200));

        photoService.delete(first);
        assertThat(photoRepository.findById(second).orElseThrow().isMain()).isTrue();
    }

    @Test
    void nonImageContentTypeIsRejected() {
        MockMultipartFile file = new MockMultipartFile("file", "evil.exe",
                "application/octet-stream", new byte[]{1, 2, 3});
        assertThrows(IllegalArgumentException.class, () -> photoService.upload(productId, file));
    }
}
