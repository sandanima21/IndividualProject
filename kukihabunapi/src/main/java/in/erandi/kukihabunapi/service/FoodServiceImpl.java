package in.erandi.kukihabunapi.service;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import in.erandi.kukihabunapi.entity.FoodEntity;
import in.erandi.kukihabunapi.entity.OrderEntity;
import in.erandi.kukihabunapi.io.FoodRequest;
import in.erandi.kukihabunapi.io.FoodResponse;
import in.erandi.kukihabunapi.repository.FoodRepository;
import in.erandi.kukihabunapi.repository.OrderRepository;

@Service

public class FoodServiceImpl implements FoodService {

    // Every status except DELIVERED/CANCELLED — an order in one of these is still
    // being worked on, so its foods can't be deleted out from under it.
    private static final List<String> ACTIVE_ORDER_STATUSES =
            List.of("PENDING", "CONFIRMED", "COOKING", "READY", "OUT_FOR_DELIVERY");

    @Autowired
    private FirebaseStorageService storageService;

    @Autowired
    private FoodRepository foodRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Override
    public String uploadFile(MultipartFile file) {
        return storageService.upload(file, "foods");
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
    public boolean deleteFile(String imageUrl) {
        storageService.delete(imageUrl);
        return true;
    }

    @Override
    public void deleteFood(String id) {
        FoodResponse response=readFood(id);
        assertFoodHasNoActiveOrders(id, response.getName());
        boolean isFileDelete=deleteFile(response.getImageUrl());
        if (isFileDelete){
            foodRepository.deleteById(response.getId());
        }
    }

    // Used when a category is deleted — routes every matching food through deleteFood(id)
    // rather than a bulk repository delete, so each food's image is cleaned up too.
    @Override
    public void deleteFoodsByCategory(String category) {
        List<FoodEntity> matching = foodRepository.findByCategoryIgnoreCase(category);
        // Check the whole batch up front so the category delete is all-or-nothing —
        // partially deleting some foods but not others (because one had an active
        // order) would leave a confusing half-deleted category behind.
        assertCategoryHasNoActiveOrders(matching);
        matching.forEach(food -> deleteFood(food.getId()));
    }

    @Override
    public void renameCategoryForFoods(String oldCategoryName, String newCategoryName) {
        if (oldCategoryName.equals(newCategoryName)) return;
        List<FoodEntity> matching = foodRepository.findByCategoryIgnoreCase(oldCategoryName);
        matching.forEach(food -> food.setCategory(newCategoryName));
        foodRepository.saveAll(matching);
    }

    // Orders whose status means they're still being worked on (not delivered/cancelled
    // yet), excluding PENDING+UNPAID orders — those are abandoned/incomplete carts that
    // never became real orders, same convention OrderServiceImpl uses for "active" orders.
    private List<OrderEntity> activeOrdersFor(List<String> foodIds) {
        return orderRepository.findByItemsFoodIdInAndStatusIn(foodIds, ACTIVE_ORDER_STATUSES).stream()
                .filter(o -> !("PENDING".equals(o.getStatus()) && "UNPAID".equals(o.getPaymentStatus())))
                .collect(Collectors.toList());
    }

    private void assertFoodHasNoActiveOrders(String foodId, String foodName) {
        int blocking = activeOrdersFor(List.of(foodId)).size();
        if (blocking > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "\"" + foodName + "\" is in " + blocking + " order(s) customers are still waiting on " +
                    "(pending, confirmed, or being prepared). Please complete or cancel those orders first, then try deleting again.");
        }
    }

    private void assertCategoryHasNoActiveOrders(List<FoodEntity> foods) {
        if (foods.isEmpty()) return;
        List<String> foodIds = foods.stream().map(FoodEntity::getId).collect(Collectors.toList());
        int blocking = activeOrdersFor(foodIds).size();
        if (blocking > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "This category can't be deleted — some of its foods are in " + blocking + " order(s) customers are " +
                    "still waiting on (pending, confirmed, or being prepared). Please complete or cancel those orders first, then try deleting again.");
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
        existing.setPortions(request.getPortions());
        if (file != null && !file.isEmpty()) {
            String oldUrl = existing.getImageUrl();
            if (oldUrl != null && !oldUrl.isBlank()) {
                deleteFile(oldUrl);
            }
            existing.setImageUrl(uploadFile(file));
        }
        return convertToResponse(foodRepository.save(existing));
    }

    @Override
    public FoodResponse setAvailability(String id, boolean available) {
        FoodEntity existing = foodRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Food not found: " + id));
        existing.setAvailable(available);
        return convertToResponse(foodRepository.save(existing));
    }

    private FoodEntity convertToEntity(FoodRequest request){
        return FoodEntity.builder()
                .name(request.getName())
                .description(request.getDescription())
                .category(request.getCategory())
                .price(request.getPrice())
                .customizationOptions(request.getCustomizationOptions())
                .portions(request.getPortions())
                .available(true)
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
                .portions(entity.getPortions())
                .available(!Boolean.FALSE.equals(entity.getAvailable()))
                .build();
    }
}
