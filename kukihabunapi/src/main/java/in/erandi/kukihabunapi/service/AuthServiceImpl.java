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

    public AuthServiceImpl(UserRepository userRepository, EmailOtpRepository emailOtpRepository,
                           JwtUtil jwtUtil, BCryptPasswordEncoder passwordEncoder, EmailService emailService) {
        this.userRepository = userRepository;
        this.emailOtpRepository = emailOtpRepository;
        this.jwtUtil = jwtUtil;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
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
        UserEntity user = userRepository.findByUsername(request.getUsernameOrEmail())
                .or(() -> userRepository.findFirstByEmail(request.getUsernameOrEmail()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found."));

        if (user.getPassword() == null || !user.isPasswordSet()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Password not set. Please set your password first.");
        }
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid password.");
        }

        return buildResponse(user);
    }

    @Override
    public AuthResponse setDeliveryPassword(SetPasswordRequest request) {
        UserEntity user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found."));

        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setPasswordSet(true);
        userRepository.save(user);

        return buildResponse(user);
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
