package in.erandi.kukihabunapi.repository;

import in.erandi.kukihabunapi.entity.OrderEntity;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface OrderRepository extends MongoRepository<OrderEntity, String> {
    List<OrderEntity> findByUserIdOrderByCreatedAtDesc(String userId);
    List<OrderEntity> findAllByOrderByCreatedAtDesc();

    // Count all-time assignments per rider (used for sequential round-robin by registration order)
    long countByDeliveryPersonId(String deliveryPersonId);
}
