package in.erandi.kukihabunapi.controller;

import in.erandi.kukihabunapi.config.JwtUtil;
import in.erandi.kukihabunapi.entity.UserEntity;
import in.erandi.kukihabunapi.repository.UserRepository;
import in.erandi.kukihabunapi.service.EmailService;
import in.erandi.kukihabunapi.service.FirebaseStorageService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final EmailService emailService;
    private final FirebaseStorageService storageService;

    public UserController(UserRepository userRepository, BCryptPasswordEncoder passwordEncoder,
                          JwtUtil jwtUtil, EmailService emailService, FirebaseStorageService storageService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.emailService = emailService;
        this.storageService = storageService;
    }

    /** True only if the Authorization header carries a valid JWT belonging to an ADMIN account. */
    private boolean isAdmin(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) return false;
        String token = authHeader.substring(7);
        if (!jwtUtil.validateToken(token)) return false;
        String userId = jwtUtil.extractUserId(token);
        return userRepository.findById(userId).map(u -> "ADMIN".equals(u.getRole())).orElse(false);
    }

    private <T> ResponseEntity<T> adminOnly() {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
    }

    @PatchMapping("/me/picture")
    public ResponseEntity<Map<String, Object>> uploadPicture(
            @RequestParam MultipartFile file,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) return ResponseEntity.status(401).build();
        String token = authHeader.substring(7);
        if (!jwtUtil.validateToken(token)) return ResponseEntity.status(401).build();
        String userId = jwtUtil.extractUserId(token);

        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        String pictureUrl = storageService.upload(file, "profiles");
        user.setPicture(pictureUrl);
        userRepository.save(user);
        return ResponseEntity.ok(Map.of("pictureUrl", pictureUrl));
    }

    @PatchMapping("/me/phone")
    public ResponseEntity<Map<String, Object>> updatePhone(
            @RequestBody Map<String, String> body,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
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
    public ResponseEntity<List<UserEntity>> getAllUsers(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (!isAdmin(authHeader)) return adminOnly();
        return ResponseEntity.ok(userRepository.findAll());
    }

    @GetMapping("/role/{role}")
    public ResponseEntity<List<UserEntity>> getUsersByRole(
            @PathVariable String role, @RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (!isAdmin(authHeader)) return adminOnly();
        return ResponseEntity.ok(userRepository.findByRole(role));
    }

    @PutMapping("/{id}/role")
    public ResponseEntity<UserEntity> updateUserRole(
            @PathVariable String id,
            @RequestBody Map<String, String> body,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (!isAdmin(authHeader)) return adminOnly();
        UserEntity user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        user.setRole(body.get("role"));
        return ResponseEntity.ok(userRepository.save(user));
    }

    @PatchMapping("/{id}/deactivate")
    public ResponseEntity<UserEntity> deactivateUser(
            @PathVariable String id, @RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (!isAdmin(authHeader)) return adminOnly();
        UserEntity user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        user.setActive(false);
        return ResponseEntity.ok(userRepository.save(user));
    }

    @PatchMapping("/{id}/activate")
    public ResponseEntity<UserEntity> activateUser(
            @PathVariable String id, @RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (!isAdmin(authHeader)) return adminOnly();
        UserEntity user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        user.setActive(true);
        return ResponseEntity.ok(userRepository.save(user));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(
            @PathVariable String id, @RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (!isAdmin(authHeader)) return adminOnly();
        if (!userRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found");
        }
        userRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/register-delivery")
    public ResponseEntity<UserEntity> registerDeliveryPerson(
            @RequestBody Map<String, String> body, @RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (!isAdmin(authHeader)) return adminOnly();
        String email = body.get("email");
        String username = body.get("username");

        if (email != null && userRepository.findFirstByEmail(email).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already registered.");
        }
        if (username != null && userRepository.findFirstByUsername(username).isPresent()) {
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
        UserEntity saved;
        try {
            saved = userRepository.save(user);
        } catch (org.springframework.dao.DuplicateKeyException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email or username already exists.");
        }
        // Only email out credentials for an account that was actually created — a losing race
        // above must not send a password for a user that never got persisted.
        if (email != null) {
            emailService.sendDeliveryCredentials(email, saved.getName(), username, rawPassword);
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PostMapping("/{id}/change-password")
    public ResponseEntity<Void> changePassword(
            @PathVariable String id,
            @RequestBody Map<String, String> body,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) return ResponseEntity.status(401).build();
        String token = authHeader.substring(7);
        if (!jwtUtil.validateToken(token)) return ResponseEntity.status(401).build();
        // Only the account owner may change their own password through this endpoint —
        // nothing else ties the caller to {id}, so without this check anyone with a valid
        // JWT (for any account) could reset any other user's password.
        if (!jwtUtil.extractUserId(token).equals(id)) return ResponseEntity.status(403).build();

        String password = body.get("password");
        validatePasswordStrength(password);

        UserEntity user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        user.setPassword(passwordEncoder.encode(password));
        user.setMustChangePassword(false);
        userRepository.save(user);
        return ResponseEntity.noContent().build();
    }

    /** Mirrors the frontend's password rule (8+ chars, upper, lower, number, special char) so
     *  a raw API call bypassing the UI can't set a weak password. */
    private void validatePasswordStrength(String password) {
        if (password == null || password.length() < 8)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password must be at least 8 characters.");
        if (!password.matches(".*[A-Z].*"))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password must include an uppercase letter.");
        if (!password.matches(".*[a-z].*"))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password must include a lowercase letter.");
        if (!password.matches(".*[0-9].*"))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password must include a number.");
        if (!password.matches(".*[^A-Za-z0-9].*"))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password must include a special character.");
    }
}
