package in.erandi.kukihabunapi.io;

import lombok.Data;

@Data
public class ManualLoginRequest {
    private String usernameOrEmail;
    private String password;
}
