package in.erandi.kukihabunapi.io;

import lombok.Data;

@Data
public class SetPasswordRequest {
    private String userId;
    private String password;
}
