package in.erandi.kukihabunapi.repository;

import in.erandi.kukihabunapi.entity.DeliveryReviewEntity;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface DeliveryReviewRepository extends MongoRepository<DeliveryReviewEntity, String> {
    List<DeliveryReviewEntity> findByDeliveryPersonId(String deliveryPersonId);
    Optional<DeliveryReviewEntity> findByOrderId(String orderId);
}
