package in.erandi.kukihabunapi.repository;

import in.erandi.kukihabunapi.entity.OrderEntity;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.util.List;

public interface OrderRepository extends MongoRepository<OrderEntity, String> {
    List<OrderEntity> findByUserIdOrderByCreatedAtDesc(String userId);
    List<OrderEntity> findAllByOrderByCreatedAtDesc();

    // Count all-time assignments per rider (used for sequential round-robin by registration order)
    long countByDeliveryPersonId(String deliveryPersonId);

    // Used to block deleting a food/category while any of its foods are still on an
    // active order — see OrderGuard.
    @Query("{ 'items.foodId': { $in: ?0 }, 'status': { $in: ?1 } }")
    List<OrderEntity> findByItemsFoodIdInAndStatusIn(List<String> foodIds, List<String> statuses);

    // Used to block deleting/deactivating a customer or delivery rider who's still on
    // an active order — see OrderGuard.
    List<OrderEntity> findByUserIdAndStatusIn(String userId, List<String> statuses);
    List<OrderEntity> findByDeliveryPersonIdAndStatusIn(String deliveryPersonId, List<String> statuses);
}
