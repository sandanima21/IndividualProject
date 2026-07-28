package in.erandi.kukihabunapi.service;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory per-account brute-force guard for /api/auth/login. Tracks failed attempts by
 * username/email (case-insensitive); after MAX_ATTEMPTS within WINDOW_MS, further attempts
 * are rejected with 429 until the window elapses. Single-instance in-memory state is fine at
 * this app's scale — if it's ever horizontally scaled, this would need to move to a shared
 * store (e.g. Redis) to stay effective across instances.
 */
@Component
public class LoginRateLimiter {

    private static final int MAX_ATTEMPTS = 5;
    private static final long WINDOW_MS = 15 * 60 * 1000L;

    private record Attempt(int count, long windowStart) {}

    private final Map<String, Attempt> attempts = new ConcurrentHashMap<>();

    public void checkAllowed(String identifier) {
        Attempt a = attempts.get(key(identifier));
        if (a != null && a.count() >= MAX_ATTEMPTS && System.currentTimeMillis() - a.windowStart() < WINDOW_MS) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "Too many failed login attempts. Please try again in a few minutes.");
        }
    }

    public void recordFailure(String identifier) {
        attempts.compute(key(identifier), (k, a) -> {
            long now = System.currentTimeMillis();
            if (a == null || now - a.windowStart() > WINDOW_MS) return new Attempt(1, now);
            return new Attempt(a.count() + 1, a.windowStart());
        });
    }

    public void recordSuccess(String identifier) {
        attempts.remove(key(identifier));
    }

    private String key(String identifier) {
        return identifier == null ? "" : identifier.trim().toLowerCase();
    }
}
