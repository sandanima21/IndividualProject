package in.erandi.kukihabunapi.repository;

import in.erandi.kukihabunapi.entity.EmailOtpEntity;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface EmailOtpRepository extends MongoRepository<EmailOtpEntity, String> {

    /** Most recent pending OTP for this email (not yet used or expired). */
    Optional<EmailOtpEntity> findTopByEmailAndUsedFalseOrderByCreatedAtDesc(String email);

    /** Used by signup to confirm the email was verified before creating an account. */
    Optional<EmailOtpEntity> findTopByEmailAndVerifiedTrueAndUsedFalseOrderByCreatedAtDesc(String email);
}
