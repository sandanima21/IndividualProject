package in.erandi.kukihabunapi.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;

/**
 * Initializes the Firebase Admin SDK once at application startup, using the service-account
 * credentials at {@code firebase.credentials.path}. Locally this defaults to the classpath file
 * at src/main/resources/firebase-service-account.json (gitignored — see .gitignore's "Secrets"
 * section). On Render, the file isn't in the git repo at all (same reason), so it's uploaded as a
 * Render "Secret File" instead and this property is set to file:/etc/secrets/firebase-service-account.json
 * (or wherever it's mounted) via the FIREBASE_CREDENTIALS_PATH env var.
 *
 * This underpins both FirebasePhoneServiceImpl (phone-auth token verification, which falls back
 * to trusting the client-supplied number if Firebase never initialized) and FirebaseStorageService
 * (image uploads, which has no such fallback — an uninitialized FirebaseApp fails those outright).
 */
@Component
public class FirebaseConfig {

    private static final Logger log = LoggerFactory.getLogger(FirebaseConfig.class);

    @Value("${firebase.storage.bucket}")
    private String storageBucket;

    @Value("${firebase.credentials.path:classpath:firebase-service-account.json}")
    private String credentialsPath;

    private final ResourceLoader resourceLoader;

    public FirebaseConfig(ResourceLoader resourceLoader) {
        this.resourceLoader = resourceLoader;
    }

    @PostConstruct
    public void init() {
        if (!FirebaseApp.getApps().isEmpty()) {
            return;
        }
        try (InputStream serviceAccount = resourceLoader.getResource(credentialsPath).getInputStream()) {
            FirebaseOptions options = FirebaseOptions.builder()
                    .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                    .setStorageBucket(storageBucket)
                    .build();
            FirebaseApp.initializeApp(options);
            log.info("Firebase Admin SDK initialized.");
        } catch (IOException e) {
            log.error("Firebase service account file not found or unreadable at '{}' — phone verification will " +
                    "fall back to trusting the client-supplied number, and image uploads will fail: {}",
                    credentialsPath, e.getMessage());
        }
    }
}
