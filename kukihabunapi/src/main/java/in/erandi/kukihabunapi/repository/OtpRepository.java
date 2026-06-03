package in.erandi.kukihabunapi.repository;

import in.erandi.kukihabunapi.entity.OtpEntity;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface OtpRepository extends MongoRepository<OtpEntity, String> {
    Optional<OtpEntity> findTopByPhoneAndUsedFalseOrderByCreatedAtDesc(String phone);
}
