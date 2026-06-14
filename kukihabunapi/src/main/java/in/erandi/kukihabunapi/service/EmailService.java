package in.erandi.kukihabunapi.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromAddress;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    /**
     * Sends a 6-digit signup OTP to the given email address.
     * Uses an HTML email for a polished, professional appearance.
     * Returns true if sent successfully, false on failure (caller decides how to handle).
     */
    public boolean sendSignupOtp(String toEmail, String code) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromAddress, "KukiHabun");
            helper.setTo(toEmail);
            helper.setSubject("KukiHabun — Your Email Verification Code");

            String html = """
                <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;
                            background: #1a1a1a; border-radius: 16px; padding: 40px 36px;
                            border: 1px solid rgba(201,168,76,0.3);">
                  <div style="text-align: center; margin-bottom: 28px;">
                    <span style="font-size: 2.4rem;">🍛</span>
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

            helper.setText(html, true);
            mailSender.send(message);
            return true;

        } catch (Exception e) {
            return false;
        }
    }

    /** Returns true if email was sent successfully, false if it failed. */
    public boolean sendOtp(String toEmail, String phone, String code) {
        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setFrom("KukiHabun <" + fromAddress + ">");
            msg.setTo(toEmail);
            msg.setSubject("KukiHabun — Your verification code");
            msg.setText(
                "Your KukiHabun phone verification code is:\n\n" +
                "  " + code + "\n\n" +
                "This code is valid for 10 minutes.\n" +
                "Phone number being verified: " + phone + "\n\n" +
                "If you did not request this, please ignore this email.\n" +
                "— The KukiHabun Team"
            );
            mailSender.send(msg);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    public void sendDeliveryCredentials(String toEmail, String name, String username, String password) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromAddress, "KukiHabun");
            helper.setTo(toEmail);
            helper.setSubject("KukiHabun — Your Delivery Account Credentials");
            String html = """
                <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;
                            background: #1a1a1a; border-radius: 16px; padding: 40px 36px;
                            border: 1px solid rgba(201,168,76,0.3);">
                  <div style="text-align: center; margin-bottom: 28px;">
                    <span style="font-size: 2.4rem;">🛵</span>
                    <h1 style="color: #c9a84c; font-size: 1.5rem; margin: 8px 0 4px;">KukiHabun</h1>
                    <p style="color: rgba(240,236,224,0.5); font-size: 0.8rem; margin: 0;">Delivery Staff Portal</p>
                  </div>
                  <h2 style="color: #f0ece0; font-size: 1.1rem; font-weight: 700; text-align: center; margin-bottom: 20px;">
                    Welcome aboard, %s!
                  </h2>
                  <p style="color: rgba(240,236,224,0.6); font-size: 0.88rem; text-align: center; line-height: 1.6; margin-bottom: 24px;">
                    Your delivery account has been created. Use the credentials below to sign in.
                    You will be asked to change your password on first login.
                  </p>
                  <div style="background: rgba(201,168,76,0.08); border: 1px solid rgba(201,168,76,0.3); border-radius: 12px; padding: 18px 20px; margin-bottom: 24px;">
                    <div style="margin-bottom: 10px;">
                      <span style="color: rgba(240,236,224,0.45); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.1em;">Username</span>
                      <div style="color: #c9a84c; font-weight: 700; font-size: 1rem; font-family: monospace; margin-top: 2px;">%s</div>
                    </div>
                    <div>
                      <span style="color: rgba(240,236,224,0.45); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.1em;">Temporary Password</span>
                      <div style="color: #c9a84c; font-weight: 700; font-size: 1rem; font-family: monospace; margin-top: 2px;">%s</div>
                    </div>
                  </div>
                  <p style="color: rgba(240,236,224,0.4); font-size: 0.78rem; text-align: center; line-height: 1.6; margin: 0;">
                    Please change your password immediately after first login.<br>
                    &mdash; The KukiHabun Team
                  </p>
                </div>
                """.formatted(name, username, password);
            helper.setText(html, true);
            mailSender.send(message);
        } catch (Exception e) {
            // silent — delivery email failure is non-critical
        }
    }

    public void sendWelcome(String toEmail, String name) {
        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setFrom("KukiHabun <" + fromAddress + ">");
            msg.setTo(toEmail);
            msg.setSubject("Welcome to KukiHabun!");
            msg.setText(
                "Hi " + name + ",\n\n" +
                "Thank you for signing up with KukiHabun!\n" +
                "Your account is now active. You can start ordering delicious food right away.\n\n" +
                "Enjoy your meal!\n" +
                "— The KukiHabun Team"
            );
            mailSender.send(msg);
        } catch (Exception e) {
            // silent — welcome email failure is non-critical
        }
    }
}
