package in.erandi.kukihabunapi.repository;

import in.erandi.kukihabunapi.entity.DeliveryTrackingEntity;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface DeliveryTrackingRepository extends MongoRepository<DeliveryTrackingEntity, String> {
    Optional<DeliveryTrackingEntity> findTopByOrderIdOrderByTimestampDesc(String orderId);
    void deleteByOrderId(String orderId);
}
