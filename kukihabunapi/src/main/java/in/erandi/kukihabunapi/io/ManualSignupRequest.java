package in.erandi.kukihabunapi.io;

import lombok.Data;

@Data
public class ManualSignupRequest {
    private String name;
    private String email;
    private String username;
    private String password;
}
