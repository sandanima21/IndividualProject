package in.erandi.kukihabunapi.controller;

import in.erandi.kukihabunapi.config.JwtUtil;
import in.erandi.kukihabunapi.io.ReviewRequest;
import in.erandi.kukihabunapi.io.ReviewResponse;
import in.erandi.kukihabunapi.service.ReviewService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/reviews")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5174", "http://localhost:3000"})
public class ReviewController {

    private final ReviewService reviewService;
    private final JwtUtil jwtUtil;

    public ReviewController(ReviewService reviewService, JwtUtil jwtUtil) {
        this.reviewService = reviewService;
        this.jwtUtil = jwtUtil;
    }

    @PostMapping
    public ResponseEntity<ReviewResponse> addReview(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody ReviewRequest request) {
        String userId = extractUserId(authHeader);
        if (userId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        return ResponseEntity.status(HttpStatus.CREATED).body(reviewService.addReview(userId, request));
    }

    @GetMapping("/food/{foodId}")
    public ResponseEntity<List<ReviewResponse>> getReviewsByFood(@PathVariable String foodId) {
        return ResponseEntity.ok(reviewService.getReviewsByFood(foodId));
    }

    @GetMapping
    public ResponseEntity<List<ReviewResponse>> getAllReviews() {
        return ResponseEntity.ok(reviewService.getAllReviews());
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<ReviewResponse>> getReviewsByUser(@PathVariable String userId) {
        return ResponseEntity.ok(reviewService.getReviewsByUser(userId));
    }

    private String extractUserId(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) return null;
        String token = authHeader.substring(7);
        if (!jwtUtil.validateToken(token)) return null;
        return jwtUtil.extractUserId(token);
    }
}
