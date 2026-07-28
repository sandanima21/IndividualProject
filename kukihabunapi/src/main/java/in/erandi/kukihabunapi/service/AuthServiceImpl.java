package in.erandi.kukihabunapi.service;

import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;
import in.erandi.kukihabunapi.config.JwtUtil;
import in.erandi.kukihabunapi.entity.UserEntity;
import in.erandi.kukihabunapi.io.AuthResponse;
import in.erandi.kukihabunapi.io.ManualLoginRequest;
import in.erandi.kukihabunapi.io.ManualSignupRequest;
import in.erandi.kukihabunapi.io.SetPasswordRequest;
import in.erandi.kukihabunapi.repository.EmailOtpRepository;
import in.erandi.kukihabunapi.repository.UserRepository;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@Service
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final EmailOtpRepository emailOtpRepository;
    private final JwtUtil jwtUtil;
    private final BCryptPasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final LoginRateLimiter loginRateLimiter;

    public AuthServiceImpl(UserRepository userRepository, EmailOtpRepository emailOtpRepository,
                           JwtUtil jwtUtil, BCryptPasswordEncoder passwordEncoder, EmailService emailService,
                           LoginRateLimiter loginRateLimiter) {
        this.userRepository = userRepository;
        this.emailOtpRepository = emailOtpRepository;
        this.jwtUtil = jwtUtil;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
        this.loginRateLimiter = loginRateLimiter;
    }

    @Override
    public AuthResponse authenticateWithGoogle(String accessToken) throws Exception {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        HttpEntity<Void> entity = new HttpEntity<>(headers);

        Map<?, ?> userInfo;
        try {
            userInfo = new RestTemplate().exchange(
                    "https://www.googleapis.com/oauth2/v3/userinfo",
                    HttpMethod.GET, entity, Map.class).getBody();
        } catch (HttpClientErrorException e) {
            throw new IllegalArgumentException("Invalid Google access token");
        }

        if (userInfo == null) throw new IllegalArgumentException("Empty userinfo response");

        String googleId = (String) userInfo.get("sub");
        String email    = (String) userInfo.get("email");
        String name     = (String) userInfo.get("name");
        String picture  = (String) userInfo.get("picture");

        boolean[] isNew = { false };
        UserEntity user = userRepository.findByGoogleId(googleId)
                .map(existing -> {
                    // Known Google account — refresh display fields only
                    existing.setName(name);
                    existing.setPicture(picture);
                    return userRepository.save(existing);
                })
                .orElseGet(() -> {
                    // No document linked to this googleId yet.
                    // Check whether a manual-signup account with the same email exists:
                    // if so, link the Google ID to it instead of creating a duplicate.
                    return userRepository.findFirstByEmail(email)
                            .map(existingEmailUser -> {
                                existingEmailUser.setGoogleId(googleId);
                                existingEmailUser.setPicture(picture);
                                if (existingEmailUser.getName() == null || existingEmailUser.getName().isBlank())
                                    existingEmailUser.setName(name);
                                return userRepository.save(existingEmailUser);
                            })
                            .orElseGet(() -> {
                                // Genuinely new user — create the document
                                isNew[0] = true;
                                return userRepository.save(
                                        UserEntity.builder()
                                                .googleId(googleId)
                                                .email(email)
                                                .name(name)
                                                .picture(picture)
                                                .build()
                                );
                            });
                });

        if (!user.isActive()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This account has been deactivated.");
        }

        if (isNew[0] && email != null) {
            emailService.sendWelcome(email, name);
        }
        AuthResponse response = buildResponse(user);
        response.setNewAccount(isNew[0]);
        return response;
    }

    @Override
    public AuthResponse signupManual(ManualSignupRequest request) {
        if (userRepository.findFirstByEmail(request.getEmail()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already registered.");
        }
        if (userRepository.findByUsername(request.getUsername()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Username already taken.");
        }
        validatePasswordStrength(request.getPassword());

        // Enforce that email was verified via OTP before account creation
        var verifiedOtp = emailOtpRepository
                .findTopByEmailAndVerifiedTrueAndUsedFalseOrderByCreatedAtDesc(request.getEmail())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.FORBIDDEN,
                        "Email not verified. Please complete OTP verification first."
                ));

        UserEntity user = userRepository.save(UserEntity.builder()
                .name(request.getName())
                .email(request.getEmail())
                .username(request.getUsername())
                .password(passwordEncoder.encode(request.getPassword()))
                .passwordSet(true)
                .build());

        // Consume the OTP so it cannot be reused
        verifiedOtp.setUsed(true);
        emailOtpRepository.save(verifiedOtp);

        emailService.sendWelcome(request.getEmail(), request.getName());
        return buildResponse(user);
    }

    @Override
    public AuthResponse loginManual(ManualLoginRequest request) {
        loginRateLimiter.checkAllowed(request.getUsernameOrEmail());

        UserEntity user = userRepository.findByUsername(request.getUsernameOrEmail())
                .or(() -> userRepository.findFirstByEmail(request.getUsernameOrEmail()))
                .orElseGet(() -> null);
        if (user == null) {
            loginRateLimiter.recordFailure(request.getUsernameOrEmail());
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found.");
        }

        if (user.getPassword() == null || !user.isPasswordSet()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Password not set. Please set your password first.");
        }
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            loginRateLimiter.recordFailure(request.getUsernameOrEmail());
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid password.");
        }
        if (!user.isActive()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This account has been deactivated.");
        }

        loginRateLimiter.recordSuccess(request.getUsernameOrEmail());
        return buildResponse(user);
    }

    @Override
    public AuthResponse setDeliveryPassword(SetPasswordRequest request) {
        UserEntity user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found."));

        // This endpoint has no prior JWT to check ownership against — it's the very first
        // credential a newly-provisioned delivery account sets, using the User ID shared by
        // an admin. Restricting it to accounts that haven't set a password yet prevents it
        // from being used as a general-purpose password reset for any account whose id leaks
        // or is guessed (including already-onboarded delivery users, customers, or admins).
        if (user.isPasswordSet()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "This account already has a password set. Please sign in instead.");
        }
        validatePasswordStrength(request.getPassword());

        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setPasswordSet(true);
        user.setMustChangePassword(false);
        userRepository.save(user);

        return buildResponse(user);
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

    private AuthResponse buildResponse(UserEntity user) {
        String token = jwtUtil.generateToken(user.getId(), user.getEmail());
        return AuthResponse.builder()
                .token(token)
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .picture(user.getPicture())
                .role(user.getRole())
                .username(user.getUsername())
                .passwordSet(user.isPasswordSet())
                .mustChangePassword(user.isMustChangePassword())
                .phone(user.getPhone())
                .phoneVerified(user.isPhoneVerified())
                .build();
    }
}
