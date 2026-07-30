package in.erandi.kukihabunapi.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.Map;

/**
 * Encapsulates all PayHere Merchant API calls related to refunds.
 *
 * Flow:
 *   1. getValidToken()  – returns cached bearer token; fetches a fresh one if expired.
 *   2. requestRefund()  – calls /merchant/v1/payment/refund; retries once on 401.
 *
 * Environment variables (set in application.properties or as OS env):
 *   PAYHERE_APP_ID      – App ID created in PayHere account → Settings → API Keys
 *   PAYHERE_APP_SECRET  – App Secret from the same entry ("View Credentials")
 *   PAYHERE_SANDBOX     – "true" for sandbox, "false" for live (default: true)
 *
 * PayHere issues API Key credentials for sandbox accounts too (contrary to an earlier
 * assumption here) — https://sandbox.payhere.lk/merchant/v1/oauth/token is a real, documented
 * sandbox-scoped OAuth endpoint. Only the "Automatic Charging API" permission is needed for refunds.
 */
@Service
public class PayHereRefundService {

    @Value("${payhere.app-id:}")
    private String appId;

    @Value("${payhere.app-secret:}")
    private String appSecret;

    @Value("${payhere.sandbox:true}")
    private boolean sandbox;

    @Value("${payhere.webhook-base-url:}")
    private String webhookBaseUrl;

    private final PayHereTokenCache tokenCache;
    private final RestTemplate restTemplate = new RestTemplate();

    public PayHereRefundService(PayHereTokenCache tokenCache) {
        this.tokenCache = tokenCache;
    }

    public String getBaseUrl() {
        return sandbox
                ? "https://sandbox.payhere.lk/merchant/v1"
                : "https://www.payhere.lk/merchant/v1";
    }

    // ── Public API ────────────────────────────────────────────────────────────

    /**
     * Submit a refund for the given PayHere payment ID.
     * Automatically manages the OAuth token (cached, auto-renewed on expiry / 401).
     *
     * @return true if a real API call was made to PayHere, false if it was simulated
     *         (sandbox mode with no App credentials configured — see below).
     * @throws ResponseStatusException if credentials are missing, or PayHere returns an error.
     */
    public boolean requestRefund(String payherePaymentId) {
        // Simulate rather than fail outright if this deployment simply hasn't been given
        // App credentials yet (sandbox accounts can generate them same as live — see the
        // class Javadoc — this is just a "not configured" fallback, not a platform limit).
        if (sandbox && (appId == null || appId.isBlank())) {
            return false;
        }
        assertCredentialsPresent();
        String token = getValidToken();
        try {
            doRefund(token, payherePaymentId);
        } catch (HttpClientErrorException.Unauthorized e) {
            // Token was rejected — invalidate and retry once with a fresh one. If the retry
            // *also* gets a 401, doRefund lets it propagate as-is (see its own catch block),
            // so translate it here too instead of leaking a raw exception message. A second
            // straight 401 with a brand-new token isn't an expired-token problem — confirmed
            // in practice this is PayHere's domain-whitelist check: it ties refund eligibility
            // to the domain the original payment was made from, not the caller's domain, and
            // rejects with 401 + a "status":-1 body (e.g. "Access denied for the domain") when
            // that domain isn't on the App Key's allowed list. Surface PayHere's own message
            // rather than guess, since the exact reason varies (could also be a missing
            // permission on the App Key).
            tokenCache.invalidate();
            try {
                doRefund(getValidToken(), payherePaymentId);
            } catch (HttpClientErrorException.Unauthorized e2) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                        "PayHere rejected the refund as unauthorized even with a freshly issued token: "
                                + extractPayhereMessage(e2.getResponseBodyAsString()));
            }
        }
        return true;
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private void assertCredentialsPresent() {
        if (appId == null || appId.isBlank())
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "PayHere App ID not configured — set PAYHERE_APP_ID");
        if (appSecret == null || appSecret.isBlank())
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "PayHere App Secret not configured — set PAYHERE_APP_SECRET");
    }

    /**
     * Returns a valid bearer token, fetching from PayHere OAuth if the cache is empty or expired.
     */
    private String getValidToken() {
        if (tokenCache.isValid()) return tokenCache.get();
        return fetchAndCacheToken();
    }

    @SuppressWarnings("unchecked")
    private String fetchAndCacheToken() {
        // PayHere's OAuth token endpoint authenticates the client via HTTP Basic Auth
        // (base64 of "AppID:AppSecret"), not client_id/client_secret as body fields —
        // sending them as body fields (the previous implementation) gets a silent 401
        // "Authentication error" no matter how correct the credentials are.
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
        headers.setBasicAuth(appId, appSecret);

        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("grant_type", "client_credentials");

        Map<String, Object> response = restTemplate.postForObject(
                getBaseUrl() + "/oauth/token",
                new HttpEntity<>(body, headers),
                Map.class);

        if (response == null || !response.containsKey("access_token"))
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "PayHere OAuth did not return an access token");

        String token = (String) response.get("access_token");
        long expiresIn = ((Number) response.getOrDefault("expires_in", 3600)).longValue();
        tokenCache.store(token, expiresIn);
        return token;
    }

    @SuppressWarnings("unchecked")
    private void doRefund(String token, String payherePaymentId) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(token);

        Map<String, String> payload = new HashMap<>();
        payload.put("payment_id", payherePaymentId);
        if (webhookBaseUrl != null && !webhookBaseUrl.isBlank()) {
            // Tell PayHere where to POST the settlement confirmation
            payload.put("notify_url",
                    webhookBaseUrl.stripTrailing() + "/api/v1/payhere/refund-webhook");
        }

        Map<String, Object> response;
        try {
            response = restTemplate.postForObject(
                    getBaseUrl() + "/payment/refund",
                    new HttpEntity<>(payload, headers),
                    Map.class);
        } catch (HttpClientErrorException.Unauthorized e) {
            throw e; // let requestRefund()'s retry-once-with-a-fresh-token logic handle this
        } catch (HttpStatusCodeException e) {
            // RestTemplate throws (rather than returning the body) for any non-2xx response,
            // so a legitimate PayHere rejection (e.g. already refunded, invalid payment) would
            // otherwise skip the status/msg check below entirely and surface as a raw, opaque
            // Spring exception instead of a clear message — extract PayHere's actual reason.
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "PayHere refund rejected: " + extractPayhereMessage(e.getResponseBodyAsString()));
        }

        if (response == null)
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "No response from PayHere refund API");

        Object status = response.get("status");
        String msg = String.valueOf(response.getOrDefault("msg", ""));

        if (!Integer.valueOf(1).equals(status) && !"1".equals(String.valueOf(status)))
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "PayHere refund rejected: " + msg);
    }

    @SuppressWarnings("unchecked")
    private String extractPayhereMessage(String responseBody) {
        try {
            Map<String, Object> parsed = new ObjectMapper().readValue(responseBody, Map.class);
            Object msg = parsed.get("msg");
            if (msg != null) return String.valueOf(msg);
        } catch (Exception ignored) {
            // Not parseable JSON — fall through to returning the raw body below.
        }
        return responseBody;
    }
}
