package in.erandi.kukihabunapi.controller;

import in.erandi.kukihabunapi.config.JwtUtil;
import in.erandi.kukihabunapi.entity.EmailOtpEntity;
import in.erandi.kukihabunapi.entity.UserEntity;
import in.erandi.kukihabunapi.io.*;
import in.erandi.kukihabunapi.repository.EmailOtpRepository;
import in.erandi.kukihabunapi.repository.UserRepository;
import in.erandi.kukihabunapi.service.AuthService;
import in.erandi.kukihabunapi.service.EmailService;
import in.erandi.kukihabunapi.service.FirebasePhoneService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Random;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final UserRepository userRepository;
    private final EmailOtpRepository emailOtpRepository;
    private final EmailService emailService;
    private final FirebasePhoneService firebasePhoneService;
    private final JwtUtil jwtUtil;
    private final BCryptPasswordEncoder passwordEncoder;

    public AuthController(AuthService authService, UserRepository userRepository,
                          EmailOtpRepository emailOtpRepository, EmailService emailService,
                          FirebasePhoneService firebasePhoneService, JwtUtil jwtUtil,
                          BCryptPasswordEncoder passwordEncoder) {
        this.authService = authService;
        this.userRepository = userRepository;
        this.emailOtpRepository = emailOtpRepository;
        this.emailService = emailService;
        this.firebasePhoneService = firebasePhoneService;
        this.jwtUtil = jwtUtil;
        this.passwordEncoder = passwordEncoder;
    }

    /** Extracts userId from the app's own JWT (Authorization: Bearer ...). */
    private String extractUserId(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) return null;
        String token = authHeader.substring(7);
        return jwtUtil.validateToken(token) ? jwtUtil.extractUserId(token) : null;
    }

    // ─── Email OTP Signup ────────────────────────────────────────────────────────

    /**
     * Step 1: Generate a 6-digit OTP and send it to the provided email.
     * Invalidates any previous pending OTP for the same address.
     */
    @PostMapping("/signup-email")
    public ResponseEntity<Map<String, Object>> sendSignupOtp(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email is required."));
        }
        if (userRepository.findFirstByEmail(email).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("error", "This email is already registered. Please sign in."));
        }

        // Invalidate any previous pending OTP for this email
        emailOtpRepository.findTopByEmailAndUsedFalseOrderByCreatedAtDesc(email)
                .ifPresent(old -> { old.setUsed(true); emailOtpRepository.save(old); });

        String code = String.format("%06d", new Random().nextInt(1_000_000));
        emailOtpRepository.save(EmailOtpEntity.builder()
                .email(email)
                .code(code)
                .expiresAt(LocalDateTime.now().plusMinutes(5))
                .build());

        boolean sent = emailService.sendSignupOtp(email, code);
        return ResponseEntity.ok(Map.of(
                "message", sent ? "OTP sent to " + email : "Email unavailable — check server logs.",
                "expiresInSeconds", 300
        ));
    }

    /**
     * Step 2: Verify the OTP entered by the user.
     * Marks the OTP record as verified so the subsequent /signup call can proceed.
     */
    @PostMapping("/verify-email")
    public ResponseEntity<Map<String, Object>> verifySignupOtp(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String code  = body.get("otp");

        if (email == null || code == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email and OTP are required."));
        }

        return emailOtpRepository.findTopByEmailAndUsedFalseOrderByCreatedAtDesc(email)
                .map(otp -> {
                    if (otp.getExpiresAt().isBefore(LocalDateTime.now())) {
                        return ResponseEntity.status(HttpStatus.GONE)
                                .<Map<String, Object>>body(Map.of("error", "OTP expired. Please request a new one."));
                    }
                    if (!otp.getCode().equals(code)) {
                        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
                                .<Map<String, Object>>body(Map.of("error", "Incorrect OTP. Please try again."));
                    }
                    otp.setVerified(true);
                    emailOtpRepository.save(otp);
                    return ResponseEntity.ok(Map.<String, Object>of(
                            "verified", true,
                            "email", email,
                            "message", "Email verified successfully."
                    ));
                })
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "No pending OTP found. Please request a new one.")));
    }

    // ─── Firebase Phone Verification ─────────────────────────────────────────────

    /**
     * POST /api/auth/verify-phone
     *
     * Called after the React client has confirmed the OTP via Firebase SDK.
     * Receives the Firebase ID token (from user.getIdToken()) and the phone number.
     *
     * Prototype flow:
     *   1. FirebasePhoneService.verifyToken() logs the token and returns null.
     *   2. Controller falls back to the phone from the request body.
     *   3. Updates user document in MongoDB: phone + phoneVerified = true.
     *
     * Production: FirebasePhoneService.verifyToken() calls firebase-admin SDK,
     * extracts the phone_number claim, and the request-body phone is ignored.
     */
    @PostMapping("/verify-phone")
    public ResponseEntity<Map<String, Object>> verifyPhone(
            @RequestBody PhoneVerificationRequest request,
            @RequestHeader("Authorization") String authHeader) {

        // Identify the logged-in user from the app's own JWT
        String userId = extractUserId(authHeader);
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized. Please sign in first."));
        }

        // Verify the Firebase ID token (mock in prototype; real in production)
        String verifiedPhone = firebasePhoneService.verifyToken(request.getFirebaseToken());

        // In prototype mode verifiedPhone is null → trust the phone from the request body.
        // In production the phone comes from the verified token and the request-body value is ignored.
        String phone = (verifiedPhone != null) ? verifiedPhone : request.getPhone();

        if (phone == null || phone.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Phone number is required."));
        }

        // Persist the verified phone number to the user document
        return userRepository.findById(userId)
                .map(user -> {
                    user.setPhone(phone);
                    user.setPhoneVerified(true);
                    userRepository.save(user);
                    return ResponseEntity.ok(Map.<String, Object>of(
                            "message", "Phone number verified and saved successfully.",
                            "phone",   phone,
                            "verified", true
                    ));
                })
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "User account not found.")));
    }

    // ─── Existing Auth Endpoints ─────────────────────────────────────────────────

    @PostMapping("/google")
    public ResponseEntity<AuthResponse> googleSignIn(@RequestBody AuthRequest request) {
        try {
            return ResponseEntity.ok(authService.authenticateWithGoogle(request.getAccessToken()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/signup")
    public ResponseEntity<AuthResponse> signupManual(@RequestBody ManualSignupRequest request) {
        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(authService.signupManual(request));
        } catch (org.springframework.web.server.ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).build();
        }
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> loginManual(@RequestBody ManualLoginRequest request) {
        try {
            return ResponseEntity.ok(authService.loginManual(request));
        } catch (org.springframework.web.server.ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).build();
        }
    }

    @PostMapping("/set-password")
    public ResponseEntity<AuthResponse> setPassword(@RequestBody SetPasswordRequest request) {
        try {
            return ResponseEntity.ok(authService.setDeliveryPassword(request));
        } catch (org.springframework.web.server.ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).build();
        }
    }

    // Admin: register a delivery person (creates a user with no password yet)
    @PostMapping("/delivery/register")
    public ResponseEntity<Map<String, Object>> registerDelivery(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String username = body.get("username");
        String name = body.get("name");

        if (userRepository.findFirstByEmail(email).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", "Email already exists."));
        }
        if (userRepository.findByUsername(username).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", "Username already exists."));
        }

        UserEntity user = userRepository.save(UserEntity.builder()
                .name(name)
                .email(email)
                .username(username)
                .role("DELIVERY")
                .passwordSet(false)
                .build());

        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
            "id", user.getId(),
            "name", user.getName(),
            "email", user.getEmail(),
            "username", user.getUsername(),
            "role", user.getRole(),
            "passwordSet", user.isPasswordSet()
        ));
    }

    // Get all delivery personnel
    @GetMapping("/delivery/personnel")
    public ResponseEntity<List<UserEntity>> getDeliveryPersonnel() {
        return ResponseEntity.ok(userRepository.findByRole("DELIVERY"));
    }

    // Change password for the currently authenticated user (used by delivery persons on first login)
    @PostMapping("/change-password")
    public ResponseEntity<Map<String, Object>> changePassword(
            @RequestBody Map<String, String> body,
            @RequestHeader("Authorization") String authHeader) {
        String userId = extractUserId(authHeader);
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized."));
        }
        String newPassword = body.get("newPassword");
        if (newPassword == null || newPassword.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "newPassword is required."));
        }
        return userRepository.findById(userId)
                .map(user -> {
                    user.setPassword(passwordEncoder.encode(newPassword));
                    user.setPasswordSet(true);
                    user.setMustChangePassword(false);
                    userRepository.save(user);
                    return ResponseEntity.ok(Map.<String, Object>of("message", "Password updated successfully."));
                })
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "User not found.")));
    }
}
