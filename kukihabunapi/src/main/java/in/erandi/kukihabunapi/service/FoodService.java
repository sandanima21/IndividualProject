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

    boolean deleteFile(String imageUrl);

    void deleteFood(String id);

    void deleteFoodsByCategory(String category);

    // Keeps every food's denormalized `category` string in sync after an admin renames
    // a category — foods reference their category by name, not id, so nothing else
    // would pick up the rename otherwise.
    void renameCategoryForFoods(String oldCategoryName, String newCategoryName);

    FoodResponse updateFood(String id, FoodRequest request, MultipartFile file);

    FoodResponse setAvailability(String id, boolean available);
}
