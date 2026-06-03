package in.erandi.kukihabunapi.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
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
    private String phone;
    private String userId;
    private String code;
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
    private LocalDateTime expiresAt;
    @Builder.Default
    private boolean used = false;
}
