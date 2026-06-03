package in.erandi.kukihabunapi.io;

import lombok.Data;

/**
 * Request body for POST /api/auth/verify-phone.
 *
 * firebaseToken — the Firebase ID token returned by the client SDK after OTP confirmation.
 *                 In production, this is verified server-side using the firebase-admin SDK.
 * phone         — the E.164-formatted phone number (e.g. +94771234567).
 *                 Used as a fallback in prototype mode; in production the phone is
 *                 extracted directly from the verified Firebase token.
 */
@Data
public class PhoneVerificationRequest {
    private String firebaseToken;
    private String phone;
}
