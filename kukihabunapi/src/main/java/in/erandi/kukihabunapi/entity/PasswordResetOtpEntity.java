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
 * Stores a short-lived OTP sent to an email address for a "forgot password" request.
 * Kept separate from EmailOtpEntity (signup verification) so the two purposes can never
 * be cross-consumed, mirroring this codebase's existing one-entity-per-purpose OTP pattern.
 *
 * Lifecycle:
 *  1. Created when the user requests a reset code → used=false
 *  2. Marked used=true once the code is successfully consumed by /reset-password
 */
@Document(collection = "password_reset_otps")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PasswordResetOtpEntity {

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

    /** Set to true once the code has been consumed to reset a password (prevents replay). */
    @Builder.Default
    private boolean used = false;
}
