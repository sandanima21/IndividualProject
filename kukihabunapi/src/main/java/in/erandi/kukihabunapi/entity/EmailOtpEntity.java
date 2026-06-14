package in.erandi.kukihabunapi.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

/**
 * Stores a short-lived OTP sent to an email address during signup.
 *
 * Lifecycle:
 *  1. Created when user requests an OTP → verified=false, used=false
 *  2. Marked verified=true when the user enters the correct code
 *  3. Marked used=true once the account is actually created (prevents replay)
 */
@Document(collection = "email_otps")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmailOtpEntity {

    @Id
    private String id;

    /** The email address this OTP was issued for. */
    @Indexed
    private String email;

    /** 6-digit numeric OTP code. */
    private String code;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    /** OTP expires 5 minutes after creation. Documents auto-deleted by MongoDB TTL index. */
    @Indexed(expireAfterSeconds = 0)
    private LocalDateTime expiresAt;

    /** Set to true once the user successfully submits the correct OTP. */
    @Builder.Default
    private boolean verified = false;

    /** Set to true once the verified OTP has been consumed to create an account. */
    @Builder.Default
    private boolean used = false;
}
