package in.erandi.kukihabunapi.service;

import org.springframework.stereotype.Component;

import java.time.Instant;

/**
 * Thread-safe in-memory cache for the PayHere Merchant API bearer token.
 * Tokens are valid for ~3600 s; we invalidate 60 s early to avoid edge cases.
 * For multi-instance deployments replace this with a Redis-backed cache.
 */
@Component
public class PayHereTokenCache {

    private volatile String token;
    private volatile Instant expiresAt = Instant.EPOCH;

    public synchronized boolean isValid() {
        return token != null && Instant.now().isBefore(expiresAt);
    }

    public synchronized String get() {
        return token;
    }

    public synchronized void store(String accessToken, long expiresInSeconds) {
        this.token = accessToken;
        this.expiresAt = Instant.now().plusSeconds(Math.max(0L, expiresInSeconds - 60));
    }

    public synchronized void invalidate() {
        this.expiresAt = Instant.EPOCH;
    }
}
