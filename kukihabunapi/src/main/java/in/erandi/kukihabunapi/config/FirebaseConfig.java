package in.erandi.kukihabunapi.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;

/**
 * Initializes the Firebase Admin SDK once at application startup, using the
 * service-account credentials at src/main/resources/firebase-service-account.json
 * (gitignored — see .gitignore's "Secrets" section). This is what lets
 * FirebasePhoneServiceImpl verify phone-auth ID tokens server-side instead of
 * trusting the client.
 *
 * Initialization failure (e.g. the file is missing on a machine that hasn't
 * been given the secret) is logged but does not crash the app — phone
 * verification will simply fall back to trusting the client-supplied phone,
 * same as before this was wired up.
 */
@Component
public class FirebaseConfig {

    private static final Logger log = LoggerFactory.getLogger(FirebaseConfig.class);

    @Value("${firebase.storage.bucket}")
    private String storageBucket;

    @PostConstruct
    public void init() {
        if (!FirebaseApp.getApps().isEmpty()) {
            return;
        }
        try (InputStream serviceAccount = new ClassPathResource("firebase-service-account.json").getInputStream()) {
            FirebaseOptions options = FirebaseOptions.builder()
                    .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                    .setStorageBucket(storageBucket)
                    .build();
            FirebaseApp.initializeApp(options);
            log.info("Firebase Admin SDK initialized.");
        } catch (IOException e) {
            log.error("Firebase service account file not found or unreadable — phone verification will fall back " +
                    "to trusting the client-supplied number: {}", e.getMessage());
        }
    }
}
