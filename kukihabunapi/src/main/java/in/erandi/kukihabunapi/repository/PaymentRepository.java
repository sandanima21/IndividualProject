package in.erandi.kukihabunapi.repository;

import in.erandi.kukihabunapi.entity.PaymentEntity;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface PaymentRepository extends MongoRepository<PaymentEntity, String> {
    Optional<PaymentEntity> findByOrderId(String orderId);
    Optional<PaymentEntity> findByPayherePaymentId(String payherePaymentId);
    List<PaymentEntity> findByUserId(String userId);
    List<PaymentEntity> findAllByOrderByCreatedAtDesc();
}
