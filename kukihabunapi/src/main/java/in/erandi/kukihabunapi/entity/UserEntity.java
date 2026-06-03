package in.erandi.kukihabunapi.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "users")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserEntity {
    @Id
    private String id;

    @Indexed(unique = true)
    private String googleId;

    private String email;
    private String name;
    private String picture;

    @Builder.Default
    private String role = "CUSTOMER"; // CUSTOMER | DELIVERY

    private String phone;
    @Builder.Default
    private boolean phoneVerified = false;

    private String username;       // for manual-login users
    private String password;       // BCrypt hashed

    @Builder.Default
    private boolean passwordSet = false; // delivery persons set this after first registration

    @Builder.Default
    private boolean active = true;

    @Builder.Default
    private boolean mustChangePassword = false;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    // Rider real-time state
    @Builder.Default
    private boolean online = false;
    private Double currentLatitude;
    private Double currentLongitude;
    private LocalDateTime lastSeen;
}
