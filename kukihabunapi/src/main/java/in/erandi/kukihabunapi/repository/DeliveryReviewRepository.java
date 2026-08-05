package in.erandi.kukihabunapi.repository;

import in.erandi.kukihabunapi.entity.DeliveryReviewEntity;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface DeliveryReviewRepository extends MongoRepository<DeliveryReviewEntity, String> {
    List<DeliveryReviewEntity> findByDeliveryPersonId(String deliveryPersonId);
    Optional<DeliveryReviewEntity> findByOrderId(String orderId);

    // Cascade-delete when a delivery rider's account is removed — see
    // UserController.deleteUser. Deliberately no equivalent by-customerId method: a
    // customer's reviews must survive that customer's own account being deleted.
    void deleteByDeliveryPersonId(String deliveryPersonId);
}
