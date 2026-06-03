package in.erandi.kukihabunapi.service;

import java.io.IOException;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import in.erandi.kukihabunapi.entity.FoodEntity;
import in.erandi.kukihabunapi.io.FoodRequest;
import in.erandi.kukihabunapi.io.FoodResponse;
import in.erandi.kukihabunapi.repository.FoodRepository;
import software.amazon.awssdk.core.exception.SdkException;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectResponse;

@Service

public class FoodServiceImpl implements FoodService {

    @Autowired
    private S3Client s3Client;

    @Autowired
    private FoodRepository foodRepository;

    @Value("${aws.s3.bucketname}")
    private String bucketName;

    @Override
    public String uploadFile(MultipartFile file) {
        String filenameExtension = file.getOriginalFilename().substring(file.getOriginalFilename().lastIndexOf(".")+1);
        String key = UUID.randomUUID().toString()+"."+filenameExtension;
        try {
            PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(key)
                    .contentType(file.getContentType())
                    .build();
            s3Client.putObject(putObjectRequest, RequestBody.fromBytes(file.getBytes()));
            return "https://" + bucketName + ".s3.amazonaws.com/" + key;
        } catch (SdkException | IOException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "File upload failed: " + ex.getMessage());
        }
    }

    @Override
    public FoodResponse addFood(FoodRequest request, MultipartFile file) {
        FoodEntity newFoodEntity=convertToEntity(request);
        String imageUrl = uploadFile(file);
        newFoodEntity.setImageUrl(imageUrl);
        FoodEntity savedEntity = foodRepository.save(newFoodEntity);
        return convertToResponse(savedEntity);
    }

    @Override
    public List<FoodResponse> readFoods() {
         List<FoodEntity> databaseEntries=foodRepository.findAll();
         return databaseEntries.stream().map(object -> convertToResponse(object)).collect(Collectors.toList());
    }

    @Override
    public FoodResponse readFood(String id) {
        FoodEntity existingFood=foodRepository.findById(id).orElseThrow(() -> new RuntimeException("Food not found for the id:"+id));
        return convertToResponse(existingFood);
    }

    @Override
    public boolean deleteFile(String filename) {
        DeleteObjectRequest deleteObjectRequest = DeleteObjectRequest.builder()
                .bucket(bucketName)
                .key(filename)
                .build();
        s3Client.deleteObject(deleteObjectRequest);
        return true;
    }

    @Override
    public void deleteFood(String id) {
        FoodResponse response=readFood(id);
        String imageUrl=response.getImageUrl();
        String filename=imageUrl.substring(imageUrl.lastIndexOf("/")+1);
        boolean isFileDelete=deleteFile(filename);
        if (isFileDelete){
            foodRepository.deleteById(response.getId());
        }
    }

    @Override
    public FoodResponse updateFood(String id, FoodRequest request, MultipartFile file) {
        FoodEntity existing = foodRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Food not found: " + id));
        existing.setName(request.getName());
        existing.setDescription(request.getDescription());
        existing.setCategory(request.getCategory());
        existing.setPrice(request.getPrice());
        existing.setCustomizationOptions(request.getCustomizationOptions());
        if (file != null && !file.isEmpty()) {
            // Delete old image from S3 then upload new one
            try {
                String oldUrl = existing.getImageUrl();
                if (oldUrl != null && !oldUrl.isBlank()) {
                    String oldKey = oldUrl.substring(oldUrl.lastIndexOf("/") + 1);
                    deleteFile(oldKey);
                }
            } catch (Exception ignored) {}
            existing.setImageUrl(uploadFile(file));
        }
        return convertToResponse(foodRepository.save(existing));
    }

    private FoodEntity convertToEntity(FoodRequest request){
        return FoodEntity.builder()
                .name(request.getName())
                .description(request.getDescription())
                .category(request.getCategory())
                .price(request.getPrice())
                .customizationOptions(request.getCustomizationOptions())
                .build();
    }

    private FoodResponse convertToResponse(FoodEntity entity){
        return FoodResponse.builder()
                .id(entity.getId())
                .name(entity.getName())
                .description(entity.getDescription())
                .category(entity.getCategory())
                .price(entity.getPrice())
                .imageUrl(entity.getImageUrl())
                .customizationOptions(entity.getCustomizationOptions())
                .build();
    }
}
