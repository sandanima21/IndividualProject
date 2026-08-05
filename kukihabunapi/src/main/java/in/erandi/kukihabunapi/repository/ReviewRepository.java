package in.erandi.kukihabunapi.repository;

import in.erandi.kukihabunapi.entity.ReviewEntity;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface ReviewRepository extends MongoRepository<ReviewEntity, String> {
    List<ReviewEntity> findAllByOrderByCreatedAtDesc();
    List<ReviewEntity> findByFoodIdOrderByCreatedAtDesc(String foodId);
    List<ReviewEntity> findByUserIdOrderByCreatedAtDesc(String userId);
    boolean existsByOrderIdAndFoodId(String orderId, String foodId);

    // Cascade-delete when a food is removed from the menu — see FoodServiceImpl.deleteFood.
    // Deliberately no equivalent by-userId method: a customer's reviews must survive
    // that customer's own account being deleted.
    void deleteByFoodId(String foodId);
}
