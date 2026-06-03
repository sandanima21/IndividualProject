package in.erandi.kukihabunapi.repository;

import in.erandi.kukihabunapi.entity.ReviewEntity;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface ReviewRepository extends MongoRepository<ReviewEntity, String> {
    List<ReviewEntity> findByFoodIdOrderByCreatedAtDesc(String foodId);
    List<ReviewEntity> findByUserIdOrderByCreatedAtDesc(String userId);
    boolean existsByOrderIdAndFoodId(String orderId, String foodId);
}
