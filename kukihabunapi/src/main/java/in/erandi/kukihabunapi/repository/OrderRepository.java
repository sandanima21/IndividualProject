package in.erandi.kukihabunapi.repository;

import in.erandi.kukihabunapi.entity.OrderEntity;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface OrderRepository extends MongoRepository<OrderEntity, String> {
    List<OrderEntity> findByUserIdOrderByCreatedAtDesc(String userId);
    List<OrderEntity> findAllByOrderByCreatedAtDesc();
    // Used by the auto-confirm scheduler: PAID+PENDING orders whose 15-min window has closed
    List<OrderEntity> findByStatusAndPaymentStatusAndCancelableUntilBefore(
            String status, String paymentStatus, LocalDateTime cutoff);

    // Count active deliveries per rider (kept for reference)
    long countByDeliveryPersonIdAndStatus(String deliveryPersonId, String status);

    // Count all-time assignments per rider (used for sequential round-robin by registration order)
    long countByDeliveryPersonId(String deliveryPersonId);
}
