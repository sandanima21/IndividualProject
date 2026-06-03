package in.erandi.kukihabunapi.io;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AuthResponse {
    private String token;
    private String id;
    private String name;
    private String email;
    private String picture;
    private String role;
    private String username;
    private boolean passwordSet;
    private boolean mustChangePassword;
    private String phone;
    private boolean phoneVerified;
    private boolean newAccount;
}
