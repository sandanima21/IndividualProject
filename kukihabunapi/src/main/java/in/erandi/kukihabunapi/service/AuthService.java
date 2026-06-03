package in.erandi.kukihabunapi.service;

import in.erandi.kukihabunapi.io.AuthResponse;
import in.erandi.kukihabunapi.io.ManualLoginRequest;
import in.erandi.kukihabunapi.io.ManualSignupRequest;
import in.erandi.kukihabunapi.io.SetPasswordRequest;

public interface AuthService {
    AuthResponse authenticateWithGoogle(String idToken) throws Exception;
    AuthResponse signupManual(ManualSignupRequest request);
    AuthResponse loginManual(ManualLoginRequest request);
    AuthResponse setDeliveryPassword(SetPasswordRequest request);
}
