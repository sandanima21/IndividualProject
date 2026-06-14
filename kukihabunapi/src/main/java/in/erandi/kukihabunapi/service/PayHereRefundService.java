package in.erandi.kukihabunapi.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpClientErrorException;
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
 *   PAYHERE_APP_ID      – App ID created in PayHere portal → Apps
 *   PAYHERE_APP_SECRET  – App Secret from the same portal entry
 *   PAYHERE_SANDBOX     – "true" for sandbox, "false" for live (default: true)
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
     * @throws ResponseStatusException if credentials are missing, or PayHere returns an error.
     */
    public void requestRefund(String payherePaymentId) {
        // In sandbox mode without API credentials, simulate the submission (sandbox portal
        // does not issue OAuth App credentials — those are only available on live accounts)
        if (sandbox && (appId == null || appId.isBlank())) {
            return;
        }
        assertCredentialsPresent();
        String token = getValidToken();
        try {
            doRefund(token, payherePaymentId);
        } catch (HttpClientErrorException.Unauthorized e) {
            // Token was rejected — invalidate and retry once with a fresh one
            tokenCache.invalidate();
            doRefund(getValidToken(), payherePaymentId);
        }
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
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("grant_type", "client_credentials");
        body.add("client_id", appId);
        body.add("client_secret", appSecret);

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

        Map<String, Object> response = restTemplate.postForObject(
                getBaseUrl() + "/payment/refund",
                new HttpEntity<>(payload, headers),
                Map.class);

        if (response == null)
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "No response from PayHere refund API");

        Object status = response.get("status");
        String msg = String.valueOf(response.getOrDefault("msg", ""));

        if (!Integer.valueOf(1).equals(status) && !"1".equals(String.valueOf(status)))
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "PayHere refund rejected: " + msg);
    }
}
