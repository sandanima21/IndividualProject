package in.erandi.kukihabunapi.config;

import in.erandi.kukihabunapi.entity.UserEntity;
import in.erandi.kukihabunapi.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

import java.security.SecureRandom;

@Component
public class AdminUserSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminUserSeeder.class);
    private static final String PASSWORD_CHARS =
            "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";
    private static final int GENERATED_PASSWORD_LENGTH = 20;

    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder;

    @Value("${app.admin.username}")
    private String adminUsername;

    @Value("${app.admin.email}")
    private String adminEmail;

    @Value("${app.admin.password:}")
    private String adminPassword;

    public AdminUserSeeder(UserRepository userRepository, BCryptPasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (userRepository.findByUsername(adminUsername).isPresent()) {
            return;
        }

        boolean generated = adminPassword == null || adminPassword.isBlank();
        String rawPassword = generated ? generateRandomPassword() : adminPassword;
        if (generated) {
            log.warn("No ADMIN_PASSWORD configured — generated a random password for the initial " +
                            "'{}' account: {}  This is only shown once; store it securely and change it after first login.",
                    adminUsername, rawPassword);
        }

        userRepository.save(UserEntity.builder()
                .username(adminUsername)
                .name("Admin")
                .email(adminEmail)
                .password(passwordEncoder.encode(rawPassword))
                .role("ADMIN")
                .passwordSet(true)
                .mustChangePassword(generated)
                .build());
    }

    private String generateRandomPassword() {
        SecureRandom random = new SecureRandom();
        StringBuilder sb = new StringBuilder(GENERATED_PASSWORD_LENGTH);
        for (int i = 0; i < GENERATED_PASSWORD_LENGTH; i++) {
            sb.append(PASSWORD_CHARS.charAt(random.nextInt(PASSWORD_CHARS.length())));
        }
        return sb.toString();
    }
}
