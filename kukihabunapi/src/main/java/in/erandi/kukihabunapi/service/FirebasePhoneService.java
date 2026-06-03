package in.erandi.kukihabunapi.service;

/**
 * Abstracts Firebase Phone Auth token verification.
 *
 * Prototype: {@link FirebasePhoneServiceImpl} is a mock that trusts the
 * client-verified phone number (safe because Firebase SDK already ran OTP on
 * the client side and we are using Firebase's own test-number sandbox).
 *
 * Production: Swap the implementation to verify the ID token server-side with
 * the firebase-admin SDK. See {@link FirebasePhoneServiceImpl} for the exact
 * code block to uncomment.
 */
public interface FirebasePhoneService {

    /**
     * Validates a Firebase Phone Auth ID token.
     *
     * @param idToken  the JWT returned by {@code user.getIdToken()} on the client
     * @return the E.164 phone number embedded in the token, or {@code null} if
     *         the token could not be verified (prototype: always null — caller
     *         falls back to the phone from the request body)
     */
    String verifyToken(String idToken);
}
