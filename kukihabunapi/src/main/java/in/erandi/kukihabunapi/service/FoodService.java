package in.erandi.kukihabunapi.service;

import in.erandi.kukihabunapi.io.FoodRequest;
import in.erandi.kukihabunapi.io.FoodResponse;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface FoodService {
    String uploadFile(MultipartFile file);

    FoodResponse addFood(FoodRequest request, MultipartFile file);

    List<FoodResponse> readFoods();

    FoodResponse readFood(String id);

    boolean deleteFile(String filename);

    void deleteFood(String id);

    FoodResponse updateFood(String id, FoodRequest request, MultipartFile file);
}
