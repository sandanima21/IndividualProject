package in.erandi.kukihabunapi.repository;

import in.erandi.kukihabunapi.entity.PasswordResetOtpEntity;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface PasswordResetOtpRepository extends MongoRepository<PasswordResetOtpEntity, String> {

    /** Most recent pending reset code for this email (not yet used). */
    Optional<PasswordResetOtpEntity> findTopByEmailAndUsedFalseOrderByCreatedAtDesc(String email);
}
