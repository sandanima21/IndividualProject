package in.erandi.kukihabunapi.config;

import in.erandi.kukihabunapi.entity.UserEntity;
import in.erandi.kukihabunapi.repository.UserRepository;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class AdminUserSeeder implements ApplicationRunner {

    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder;

    public AdminUserSeeder(UserRepository userRepository, BCryptPasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (userRepository.findByUsername("admin").isEmpty()) {
            userRepository.save(UserEntity.builder()
                    .username("admin")
                    .name("Admin")
                    .email("admin@kukihabun.lk")
                    .password(passwordEncoder.encode("admin@1234"))
                    .role("ADMIN")
                    .passwordSet(true)
                    .build());
        }
    }
}
