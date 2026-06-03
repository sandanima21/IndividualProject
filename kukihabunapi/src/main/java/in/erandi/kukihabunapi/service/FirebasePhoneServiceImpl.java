package in.erandi.kukihabunapi.service;

import org.springframework.stereotype.Service;

import java.util.Base64;

/**
 * Prototype implementation of {@link FirebasePhoneService}.
 *
 * In sandbox / test-number mode, the Firebase client SDK already verified the
 * OTP before calling our backend, so we log the received token and trust the
 * phone number provided in the request body.
 *
 * ──────────────────────────────────────────────────────────────────────────────
 *  HOW TO UPGRADE TO PRODUCTION (firebase-admin SDK)
 * ──────────────────────────────────────────────────────────────────────────────
 *
 *  1. Add the dependency to pom.xml:
 *
 *       <dependency>
 *           <groupId>com.google.firebase</groupId>
 *           <artifactId>firebase-admin</artifactId>
 *           <version>9.4.1</version>
 *       </dependency>
 *
 *  2. Download your Firebase service-account JSON from:
 *       Firebase Console → Project Settings → Service accounts → Generate new private key
 *     Place the file at: src/main/resources/firebase-service-account.json
 *
 *  3. Initialize the SDK once at application startup (e.g. in a @Configuration class):
 *
 *       @PostConstruct
 *       public void initFirebase() throws IOException {
 *           FileInputStream sa = new FileInputStream(
 *               "src/main/resources/firebase-service-account.json");
 *           FirebaseOptions opts = FirebaseOptions.builder()
 *               .setCredentials(GoogleCredentials.fromStream(sa))
 *               .build();
 *           FirebaseApp.initializeApp(opts);
 *       }
 *
 *  4. Replace the body of verifyToken() with:
 *
 *       try {
 *           FirebaseToken decoded = FirebaseAuth.getInstance().verifyIdToken(idToken);
 *           // phone_number claim is set by Firebase for phone-auth tokens
 *           return (String) decoded.getClaims().get("phone_number");
 *       } catch (FirebaseAuthException e) {
 *           System.err.println("[FIREBASE] Token verification failed: " + e.getMessage());
 *           return null;
 *       }
 *
 * ──────────────────────────────────────────────────────────────────────────────
 */
@Service
public class FirebasePhoneServiceImpl implements FirebasePhoneService {

    @Override
    public String verifyToken(String idToken) {
        if (idToken == null || idToken.isBlank()) {
            System.out.println("[FIREBASE-MOCK] No token received.");
            return null;
        }

        // Attempt to decode the JWT payload (base64url) for logging only.
        // This does NOT verify the signature — it is purely informational in prototype mode.
        try {
            String[] parts = idToken.split("\\.");
            if (parts.length == 3) {
                String payload = new String(Base64.getUrlDecoder().decode(parts[1]));
                System.out.println("[FIREBASE-MOCK] Token payload (unverified): " + payload);
            }
        } catch (Exception ignored) { }

        System.out.println("[FIREBASE-MOCK] Prototype mode — skipping server-side token " +
                           "verification. Trusting client-verified phone from request body.");

        // Return null → controller falls back to the phone from the request body.
        // In production: return the phone extracted from the verified token above.
        return null;
    }
}
