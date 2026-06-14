package in.erandi.kukihabunapi.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "otps")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OtpEntity {
    @Id
    private String id;

    @Indexed
    private String phone;

    private String userId;
    private String code;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    /** Documents auto-deleted by MongoDB TTL index when expiresAt is passed. */
    @Indexed(expireAfterSeconds = 0)
    private LocalDateTime expiresAt;

    @Builder.Default
    private boolean used = false;
}
