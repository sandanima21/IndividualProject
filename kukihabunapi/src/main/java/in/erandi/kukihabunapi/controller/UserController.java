package in.erandi.kukihabunapi.controller;

import in.erandi.kukihabunapi.config.JwtUtil;
import in.erandi.kukihabunapi.entity.UserEntity;
import in.erandi.kukihabunapi.repository.UserRepository;
import in.erandi.kukihabunapi.service.EmailService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5174", "http://localhost:3000"})
public class UserController {

    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final EmailService emailService;
    private final S3Client s3Client;

    @Value("${aws.s3.bucketname}")
    private String bucketName;

    public UserController(UserRepository userRepository, BCryptPasswordEncoder passwordEncoder,
                          JwtUtil jwtUtil, EmailService emailService, S3Client s3Client) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.emailService = emailService;
        this.s3Client = s3Client;
    }

    @PatchMapping("/me/picture")
    public ResponseEntity<Map<String, Object>> uploadPicture(
            @RequestParam MultipartFile file,
            @RequestHeader("Authorization") String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) return ResponseEntity.status(401).build();
        String token = authHeader.substring(7);
        if (!jwtUtil.validateToken(token)) return ResponseEntity.status(401).build();
        String userId = jwtUtil.extractUserId(token);

        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        try {
            String ext = file.getOriginalFilename() != null
                    ? file.getOriginalFilename().substring(file.getOriginalFilename().lastIndexOf('.') + 1)
                    : "jpg";
            String key = "profiles/" + UUID.randomUUID() + "." + ext;
            s3Client.putObject(
                    PutObjectRequest.builder().bucket(bucketName).key(key).contentType(file.getContentType()).build(),
                    software.amazon.awssdk.core.sync.RequestBody.fromBytes(file.getBytes())
            );
            String pictureUrl = "https://" + bucketName + ".s3.amazonaws.com/" + key;
            user.setPicture(pictureUrl);
            userRepository.save(user);
            return ResponseEntity.ok(Map.of("pictureUrl", pictureUrl));
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Upload failed: " + e.getMessage()));
        }
    }

    @PatchMapping("/me/phone")
    public ResponseEntity<Map<String, Object>> updatePhone(
            @RequestBody Map<String, String> body,
            @RequestHeader("Authorization") String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) return ResponseEntity.status(401).build();
        String token = authHeader.substring(7);
        if (!jwtUtil.validateToken(token)) return ResponseEntity.status(401).build();
        String userId = jwtUtil.extractUserId(token);

        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        user.setPhone(body.get("phone"));
        user.setPhoneVerified(true);
        userRepository.save(user);
        return ResponseEntity.ok(Map.of("phone", user.getPhone(), "phoneVerified", true));
    }

    @GetMapping
    public ResponseEntity<List<UserEntity>> getAllUsers() {
        return ResponseEntity.ok(userRepository.findAll());
    }

    @GetMapping("/role/{role}")
    public ResponseEntity<List<UserEntity>> getUsersByRole(@PathVariable String role) {
        return ResponseEntity.ok(userRepository.findByRole(role));
    }

    @PutMapping("/{id}/role")
    public ResponseEntity<UserEntity> updateUserRole(
            @PathVariable String id,
            @RequestBody Map<String, String> body) {
        UserEntity user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        user.setRole(body.get("role"));
        return ResponseEntity.ok(userRepository.save(user));
    }

    @PatchMapping("/{id}/deactivate")
    public ResponseEntity<UserEntity> deactivateUser(@PathVariable String id) {
        UserEntity user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        user.setActive(false);
        return ResponseEntity.ok(userRepository.save(user));
    }

    @PatchMapping("/{id}/activate")
    public ResponseEntity<UserEntity> activateUser(@PathVariable String id) {
        UserEntity user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        user.setActive(true);
        return ResponseEntity.ok(userRepository.save(user));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable String id) {
        if (!userRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found");
        }
        userRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/register-delivery")
    public ResponseEntity<UserEntity> registerDeliveryPerson(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String username = body.get("username");

        if (email != null && userRepository.findByEmail(email).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already registered.");
        }
        if (username != null && userRepository.findByUsername(username).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Username already taken.");
        }

        String rawPassword = body.get("password");
        UserEntity user = UserEntity.builder()
                .name(body.get("name"))
                .email(email)
                .username(username)
                .password(passwordEncoder.encode(rawPassword))
                .role("DELIVERY")
                .passwordSet(true)
                .mustChangePassword(true)
                .build();
        UserEntity saved = userRepository.save(user);
        if (email != null) {
            emailService.sendDeliveryCredentials(email, saved.getName(), username, rawPassword);
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PostMapping("/{id}/change-password")
    public ResponseEntity<Void> changePassword(
            @PathVariable String id,
            @RequestBody Map<String, String> body) {
        UserEntity user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        user.setPassword(passwordEncoder.encode(body.get("password")));
        user.setMustChangePassword(false);
        userRepository.save(user);
        return ResponseEntity.noContent().build();
    }
}
