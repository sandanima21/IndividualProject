package in.erandi.kukihabunapi.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);
    private static final String BREVO_URL = "https://api.brevo.com/v3/smtp/email";

    private final RestTemplate rest = new RestTemplate();

    @Value("${brevo.api.key}")
    private String apiKey;

    @Value("${mail.from.address}")
    private String fromEmail;

    private boolean send(String to, String subject, String html) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("api-key", apiKey);

            Map<String, Object> body = Map.of(
                "sender", Map.of("name", "KukiHabun", "email", fromEmail),
                "to", List.of(Map.of("email", to)),
                "subject", subject,
                "htmlContent", html
            );

            ResponseEntity<String> resp = rest.postForEntity(
                BREVO_URL, new HttpEntity<>(body, headers), String.class);
            return resp.getStatusCode().is2xxSuccessful();
        } catch (Exception e) {
            log.error("Brevo API error sending to {}: {}", to, e.getMessage(), e);
            return false;
        }
    }

    public boolean sendSignupOtp(String toEmail, String code) {
        String html = """
            <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;
                        background: #1a1a1a; border-radius: 16px; padding: 40px 36px;
                        border: 1px solid rgba(201,168,76,0.3);">
              <div style="text-align: center; margin-bottom: 28px;">
                <span style="font-size: 2.4rem;">&#127859;</span>
                <h1 style="color: #c9a84c; font-size: 1.5rem; margin: 8px 0 4px;">KukiHabun</h1>
                <p style="color: rgba(240,236,224,0.5); font-size: 0.8rem; margin: 0;">
                  Authentic Sri Lankan Flavours
                </p>
              </div>
              <h2 style="color: #f0ece0; font-size: 1.15rem; font-weight: 700;
                         text-align: center; margin-bottom: 10px;">
                Verify Your Email Address
              </h2>
              <p style="color: rgba(240,236,224,0.6); font-size: 0.88rem;
                         text-align: center; line-height: 1.6; margin-bottom: 28px;">
                Use the code below to complete your KukiHabun account registration.
                This code expires in <strong style="color: #c9a84c;">5 minutes</strong>.
              </p>
              <div style="background: rgba(201,168,76,0.1); border: 2px solid rgba(201,168,76,0.4);
                          border-radius: 12px; padding: 22px; text-align: center; margin-bottom: 28px;">
                <span style="font-size: 2.8rem; font-weight: 800; letter-spacing: 0.45em;
                             color: #c9a84c; font-family: 'Courier New', monospace;">
                  %s
                </span>
              </div>
              <p style="color: rgba(240,236,224,0.4); font-size: 0.78rem;
                         text-align: center; line-height: 1.6; margin: 0;">
                If you did not request this, you can safely ignore this email.<br>
                &mdash; The KukiHabun Team
              </p>
            </div>
            """.formatted(code);
        return send(toEmail, "KukiHabun — Your Email Verification Code", html);
    }

    public boolean sendOtp(String toEmail, String phone, String code) {
        String html = """
            <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;
                        background: #1a1a1a; border-radius: 16px; padding: 40px 36px;
                        border: 1px solid rgba(201,168,76,0.3);">
              <h2 style="color: #c9a84c; text-align: center; margin-bottom: 10px;">
                Phone Verification
              </h2>
              <p style="color: rgba(240,236,224,0.6); text-align: center; line-height: 1.6;">
                Your KukiHabun phone verification code is:
              </p>
              <div style="background: rgba(201,168,76,0.1); border: 2px solid rgba(201,168,76,0.4);
                          border-radius: 12px; padding: 22px; text-align: center; margin: 20px 0;">
                <span style="font-size: 2.8rem; font-weight: 800; letter-spacing: 0.45em;
                             color: #c9a84c; font-family: 'Courier New', monospace;">%s</span>
              </div>
              <p style="color: rgba(240,236,224,0.45); font-size: 0.85rem; text-align: center;">
                Valid for 10 minutes. Phone number: %s
              </p>
            </div>
            """.formatted(code, phone);
        return send(toEmail, "KukiHabun — Your verification code", html);
    }

    public void sendDeliveryCredentials(String toEmail, String name, String username, String password) {
        String html = """
            <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;
                        background: #1a1a1a; border-radius: 16px; padding: 40px 36px;
                        border: 1px solid rgba(201,168,76,0.3);">
              <div style="text-align: center; margin-bottom: 28px;">
                <span style="font-size: 2.4rem;">&#128757;</span>
                <h1 style="color: #c9a84c; font-size: 1.5rem; margin: 8px 0 4px;">KukiHabun</h1>
                <p style="color: rgba(240,236,224,0.5); font-size: 0.8rem; margin: 0;">Delivery Staff Portal</p>
              </div>
              <h2 style="color: #f0ece0; font-size: 1.1rem; font-weight: 700;
                         text-align: center; margin-bottom: 20px;">
                Welcome aboard, %s!
              </h2>
              <p style="color: rgba(240,236,224,0.6); font-size: 0.88rem;
                         text-align: center; line-height: 1.6; margin-bottom: 24px;">
                Your delivery account has been created. Use the credentials below to sign in.
                You will be asked to change your password on first login.
              </p>
              <div style="background: rgba(201,168,76,0.08); border: 1px solid rgba(201,168,76,0.3);
                          border-radius: 12px; padding: 18px 20px; margin-bottom: 24px;">
                <div style="margin-bottom: 10px;">
                  <span style="color: rgba(240,236,224,0.45); font-size: 0.75rem;
                               text-transform: uppercase; letter-spacing: 0.1em;">Username</span>
                  <div style="color: #c9a84c; font-weight: 700; font-size: 1rem;
                              font-family: monospace; margin-top: 2px;">%s</div>
                </div>
                <div>
                  <span style="color: rgba(240,236,224,0.45); font-size: 0.75rem;
                               text-transform: uppercase; letter-spacing: 0.1em;">Temporary Password</span>
                  <div style="color: #c9a84c; font-weight: 700; font-size: 1rem;
                              font-family: monospace; margin-top: 2px;">%s</div>
                </div>
              </div>
              <p style="color: rgba(240,236,224,0.4); font-size: 0.78rem;
                         text-align: center; line-height: 1.6; margin: 0;">
                Please change your password immediately after first login.<br>
                &mdash; The KukiHabun Team
              </p>
            </div>
            """.formatted(name, username, password);
        send(toEmail, "KukiHabun — Your Delivery Account Credentials", html);
    }

    public void sendWelcome(String toEmail, String name) {
        String html = """
            <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;
                        background: #1a1a1a; border-radius: 16px; padding: 40px 36px;
                        border: 1px solid rgba(201,168,76,0.3);">
              <div style="text-align: center; margin-bottom: 28px;">
                <span style="font-size: 2.4rem;">&#127859;</span>
                <h1 style="color: #c9a84c; font-size: 1.5rem; margin: 8px 0 4px;">KukiHabun</h1>
              </div>
              <h2 style="color: #f0ece0; text-align: center; margin-bottom: 16px;">
                Welcome, %s!
              </h2>
              <p style="color: rgba(240,236,224,0.6); text-align: center; line-height: 1.6; margin-bottom: 8px;">
                Thank you for signing up with KukiHabun!<br>
                Your account is now active. Start ordering delicious Sri Lankan food right away.
              </p>
              <p style="color: rgba(240,236,224,0.4); font-size: 0.78rem;
                         text-align: center; margin-top: 24px;">
                Enjoy your meal!<br>
                &mdash; The KukiHabun Team
              </p>
            </div>
            """.formatted(name);
        send(toEmail, "Welcome to KukiHabun!", html);
    }
}
