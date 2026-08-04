package in.erandi.kukihabunapi.config;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

/**
 * Makes sure a ResponseStatusException's reason text actually reaches the client.
 * Spring Boot's default error body omits "message" unless server.error.include-message
 * is explicitly configured, which would otherwise silently swallow every
 * carefully-worded validation/conflict message thrown via ResponseStatusException
 * across the app (e.g. "Category name already exists", the food/category delete
 * guards) — callers would just see a generic failure with no explanation.
 *
 * Controllers that already catch ResponseStatusException locally (e.g. AuthController's
 * password reset) are unaffected — this only runs for exceptions that propagate
 * uncaught out of a controller method.
 */
@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, String>> handleResponseStatusException(ResponseStatusException ex) {
        HttpStatus status = HttpStatus.resolve(ex.getStatusCode().value());
        String message = ex.getReason() != null ? ex.getReason() : (status != null ? status.getReasonPhrase() : "Error");
        return ResponseEntity.status(ex.getStatusCode()).body(Map.of("message", message));
    }
}
