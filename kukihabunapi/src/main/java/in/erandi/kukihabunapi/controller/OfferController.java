package in.erandi.kukihabunapi.controller;

import in.erandi.kukihabunapi.entity.OfferEntity;
import in.erandi.kukihabunapi.repository.OfferRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.io.IOException;
import software.amazon.awssdk.core.exception.SdkException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/offers")
@RequiredArgsConstructor
public class OfferController {

    private final OfferRepository offerRepository;
    private final S3Client s3Client;

    @Value("${aws.s3.bucketname}")
    private String bucketName;

    // Customer-facing: only currently active offers
    @GetMapping
    public List<OfferEntity> getActive() {
        LocalDateTime now = LocalDateTime.now();
        return offerRepository.findAll().stream()
                .filter(o -> (o.getStartDate() == null || !o.getStartDate().isAfter(now))
                          && (o.getEndDate()   == null || !o.getEndDate().isBefore(now)))
                .collect(Collectors.toList());
    }

    // Admin-facing: all offers regardless of dates
    @GetMapping("/all")
    public List<OfferEntity> getAll() {
        return offerRepository.findAll();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public OfferEntity create(
            @RequestParam String title,
            @RequestParam String description,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(required = false) Double price,
            @RequestParam(required = false) MultipartFile file
    ) {
        String imageUrl = (file != null && !file.isEmpty()) ? uploadToS3(file) : null;
        return offerRepository.save(OfferEntity.builder()
                .title(title)
                .description(description)
                .startDate(startDate != null ? LocalDateTime.parse(startDate) : null)
                .endDate(endDate != null ? LocalDateTime.parse(endDate) : null)
                .price(price)
                .imageUrl(imageUrl)
                .build());
    }

    @PutMapping("/{id}")
    public OfferEntity update(
            @PathVariable String id,
            @RequestParam String title,
            @RequestParam String description,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(required = false) Double price,
            @RequestParam(required = false) MultipartFile file
    ) {
        OfferEntity offer = offerRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        offer.setTitle(title);
        offer.setDescription(description);
        offer.setStartDate(startDate != null ? LocalDateTime.parse(startDate) : null);
        offer.setEndDate(endDate != null ? LocalDateTime.parse(endDate) : null);
        offer.setPrice(price);
        if (file != null && !file.isEmpty()) {
            if (offer.getImageUrl() != null) deleteFromS3(offer.getImageUrl());
            offer.setImageUrl(uploadToS3(file));
        }
        return offerRepository.save(offer);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String id) {
        OfferEntity offer = offerRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (offer.getImageUrl() != null) deleteFromS3(offer.getImageUrl());
        offerRepository.deleteById(id);
    }

    private String uploadToS3(MultipartFile file) {
        String ext = file.getOriginalFilename().substring(file.getOriginalFilename().lastIndexOf('.') + 1);
        String key = "offers/" + UUID.randomUUID() + "." + ext;
        try {
            s3Client.putObject(
                    PutObjectRequest.builder().bucket(bucketName).key(key).contentType(file.getContentType()).build(),
                    RequestBody.fromBytes(file.getBytes())
            );
        } catch (SdkException | IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Image upload failed: " + e.getMessage());
        }
        return "https://" + bucketName + ".s3.amazonaws.com/" + key;
    }

    private void deleteFromS3(String imageUrl) {
        try {
            String key = imageUrl.substring(imageUrl.lastIndexOf(".amazonaws.com/") + ".amazonaws.com/".length());
            s3Client.deleteObject(DeleteObjectRequest.builder().bucket(bucketName).key(key).build());
        } catch (Exception ignored) {}
    }
}
