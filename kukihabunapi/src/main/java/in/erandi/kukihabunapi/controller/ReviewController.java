package in.erandi.kukihabunapi.controller;

import in.erandi.kukihabunapi.config.JwtUtil;
import in.erandi.kukihabunapi.io.ReviewRequest;
import in.erandi.kukihabunapi.io.ReviewResponse;
import in.erandi.kukihabunapi.repository.UserRepository;
import in.erandi.kukihabunapi.service.ReviewService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/reviews")
public class ReviewController {

    private final ReviewService reviewService;
    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;

    public ReviewController(ReviewService reviewService, JwtUtil jwtUtil, UserRepository userRepository) {
        this.reviewService = reviewService;
        this.jwtUtil = jwtUtil;
        this.userRepository = userRepository;
    }

    @PostMapping
    public ResponseEntity<ReviewResponse> addReview(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody ReviewRequest request) {
        String userId = extractUserId(authHeader);
        if (userId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        return ResponseEntity.status(HttpStatus.CREATED).body(reviewService.addReview(userId, request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ReviewResponse> updateReview(
            @PathVariable String id,
            @RequestHeader("Authorization") String authHeader,
            @RequestBody ReviewRequest request) {
        String userId = extractUserId(authHeader);
        if (userId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        return ResponseEntity.ok(reviewService.updateReview(userId, id, request));
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
    public ResponseEntity<List<ReviewResponse>> getReviewsByUser(
            @PathVariable String userId,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        String callerId = extractUserId(authHeader);
        if (callerId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        boolean isAdmin = userRepository.findById(callerId).map(u -> "ADMIN".equals(u.getRole())).orElse(false);
        if (!callerId.equals(userId) && !isAdmin) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        return ResponseEntity.ok(reviewService.getReviewsByUser(userId));
    }

    private String extractUserId(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) return null;
        String token = authHeader.substring(7);
        if (!jwtUtil.validateToken(token)) return null;
        return jwtUtil.extractUserId(token);
    }
}
