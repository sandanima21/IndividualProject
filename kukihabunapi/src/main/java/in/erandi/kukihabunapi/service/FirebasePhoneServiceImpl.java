package in.erandi.kukihabunapi.service;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.FirebaseToken;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * Verifies a Firebase Phone Auth ID token server-side via the Firebase Admin
 * SDK (initialized once at startup by {@link in.erandi.kukihabunapi.config.FirebaseConfig}).
 *
 * Returns the verified E.164 phone number from the token's `phone_number`
 * claim, or {@code null} if the token is missing, invalid, expired, or the
 * Admin SDK failed to initialize (e.g. no service-account file present) — in
 * every {@code null} case, the caller (AuthController.verifyPhone) falls back
 * to the phone number supplied in the request body, same as before this was
 * wired up to a real check.
 */
@Service
public class FirebasePhoneServiceImpl implements FirebasePhoneService {

    private static final Logger log = LoggerFactory.getLogger(FirebasePhoneServiceImpl.class);

    @Override
    public String verifyToken(String idToken) {
        if (idToken == null || idToken.isBlank()) {
            return null;
        }
        try {
            FirebaseToken decoded = FirebaseAuth.getInstance().verifyIdToken(idToken);
            Object phone = decoded.getClaims().get("phone_number");
            return phone != null ? phone.toString() : null;
        } catch (FirebaseAuthException e) {
            log.warn("Firebase phone token verification failed: {}", e.getMessage());
            return null;
        } catch (IllegalStateException e) {
            // FirebaseApp never initialized — most likely a missing service-account file.
            log.error("Firebase Admin SDK not initialized — cannot verify phone token: {}", e.getMessage());
            return null;
        }
    }
}
