package in.erandi.kukihabunapi.controller;

import in.erandi.kukihabunapi.config.JwtUtil;
import in.erandi.kukihabunapi.entity.OtpEntity;
import in.erandi.kukihabunapi.repository.OtpRepository;
import in.erandi.kukihabunapi.repository.UserRepository;
import in.erandi.kukihabunapi.service.EmailService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.Random;

@RestController
@RequestMapping("/api/otp")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5174", "http://localhost:3000"})
public class OtpController {

    private final OtpRepository otpRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;
    private final JwtUtil jwtUtil;

    public OtpController(OtpRepository otpRepository, UserRepository userRepository,
                         EmailService emailService, JwtUtil jwtUtil) {
        this.otpRepository = otpRepository;
        this.userRepository = userRepository;
        this.emailService = emailService;
        this.jwtUtil = jwtUtil;
    }

    @PostMapping("/send")
    public ResponseEntity<Map<String, String>> send(
            @RequestBody Map<String, String> body,
            @RequestHeader("Authorization") String authHeader) {

        String userId = extractUserId(authHeader);
        if (userId == null) return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));

        String phone = body.get("phone");
        if (phone == null || phone.isBlank())
            return ResponseEntity.badRequest().body(Map.of("error", "Phone number required"));

        String userEmail = userRepository.findById(userId)
                .map(u -> u.getEmail())
                .orElse(null);
        if (userEmail == null) return ResponseEntity.status(404).body(Map.of("error", "User not found"));

        // Invalidate any existing unused OTP for this phone
        otpRepository.findTopByPhoneAndUsedFalseOrderByCreatedAtDesc(phone)
                .ifPresent(old -> { old.setUsed(true); otpRepository.save(old); });

        String code = String.format("%06d", new Random().nextInt(1_000_000));
        OtpEntity otp = OtpEntity.builder()
                .phone(phone)
                .userId(userId)
                .code(code)
                .expiresAt(LocalDateTime.now().plusMinutes(10))
                .build();
        otpRepository.save(otp);

        boolean emailSent = emailService.sendOtp(userEmail, phone, code);
        if (emailSent) {
            return ResponseEntity.ok(Map.of("message", "OTP sent to your registered email"));
        } else {
            // Email not configured — return code so dev/test flow still works
            return ResponseEntity.ok(Map.of(
                "message", "Email unavailable — use the code shown on screen",
                "devCode", code
            ));
        }
    }

    @PostMapping("/verify")
    public ResponseEntity<Map<String, String>> verify(
            @RequestBody Map<String, String> body,
            @RequestHeader("Authorization") String authHeader) {

        String userId = extractUserId(authHeader);
        if (userId == null) return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));

        String phone = body.get("phone");
        String code  = body.get("code");
        if (phone == null || code == null)
            return ResponseEntity.badRequest().body(Map.of("error", "Phone and code required"));

        Optional<OtpEntity> otpOpt = otpRepository.findTopByPhoneAndUsedFalseOrderByCreatedAtDesc(phone);
        if (otpOpt.isEmpty())
            return ResponseEntity.status(400).body(Map.of("error", "No OTP found. Please request a new one."));

        OtpEntity otp = otpOpt.get();
        if (otp.getExpiresAt().isBefore(LocalDateTime.now()))
            return ResponseEntity.status(400).body(Map.of("error", "OTP expired. Please request a new one."));

        if (!otp.getCode().equals(code))
            return ResponseEntity.status(400).body(Map.of("error", "Incorrect OTP. Please try again."));

        otp.setUsed(true);
        otpRepository.save(otp);
        return ResponseEntity.ok(Map.of("message", "Phone verified successfully"));
    }

    private String extractUserId(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) return null;
        String token = authHeader.substring(7);
        if (!jwtUtil.validateToken(token)) return null;
        return jwtUtil.extractUserId(token);
    }
}
