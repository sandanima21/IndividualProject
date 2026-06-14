package in.erandi.kukihabunapi.controller;

import in.erandi.kukihabunapi.config.JwtUtil;
import in.erandi.kukihabunapi.entity.DeliveryReviewEntity;
import in.erandi.kukihabunapi.entity.OrderEntity;
import in.erandi.kukihabunapi.entity.UserEntity;
import in.erandi.kukihabunapi.repository.DeliveryReviewRepository;
import in.erandi.kukihabunapi.repository.OrderRepository;
import in.erandi.kukihabunapi.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/delivery-reviews")
public class DeliveryReviewController {

    private final DeliveryReviewRepository reviewRepository;
    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;

    public DeliveryReviewController(DeliveryReviewRepository reviewRepository,
                                    OrderRepository orderRepository,
                                    UserRepository userRepository,
                                    JwtUtil jwtUtil) {
        this.reviewRepository = reviewRepository;
        this.orderRepository = orderRepository;
        this.userRepository = userRepository;
        this.jwtUtil = jwtUtil;
    }

    private String extractUserId(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) return null;
        String token = authHeader.substring(7);
        return jwtUtil.validateToken(token) ? jwtUtil.extractUserId(token) : null;
    }

    /** Customer submits a review for their delivered order. One review per order. */
    @PostMapping
    public ResponseEntity<DeliveryReviewEntity> submitReview(
            @RequestBody Map<String, Object> body,
            @RequestHeader("Authorization") String authHeader) {

        String customerId = extractUserId(authHeader);
        if (customerId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        String orderId = (String) body.get("orderId");
        if (orderId == null) return ResponseEntity.badRequest().build();

        // Prevent duplicate reviews
        if (reviewRepository.findByOrderId(orderId).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }

        OrderEntity order = orderRepository.findById(orderId).orElse(null);
        if (order == null || !customerId.equals(order.getUserId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        if (!"DELIVERED".equals(order.getStatus())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }

        UserEntity customer = userRepository.findById(customerId).orElse(null);
        int rating = body.get("rating") instanceof Number ? ((Number) body.get("rating")).intValue() : 0;
        String comment = (String) body.getOrDefault("comment", "");

        DeliveryReviewEntity review = DeliveryReviewEntity.builder()
                .orderId(orderId)
                .deliveryPersonId(order.getDeliveryPersonId())
                .customerId(customerId)
                .customerName(customer != null ? customer.getName() : "Customer")
                .rating(rating)
                .comment(comment)
                .build();

        return ResponseEntity.status(HttpStatus.CREATED).body(reviewRepository.save(review));
    }

    /** Check if a review already exists for an order (customer UI gate). */
    @GetMapping("/order/{orderId}")
    public ResponseEntity<DeliveryReviewEntity> getByOrder(@PathVariable String orderId) {
        return reviewRepository.findByOrderId(orderId)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    /** Admin: get all delivery reviews. */
    @GetMapping
    public ResponseEntity<List<DeliveryReviewEntity>> getAll() {
        List<DeliveryReviewEntity> all = reviewRepository.findAll();
        all.sort((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()));
        return ResponseEntity.ok(all);
    }

    /** Rider: get reviews for the calling delivery person. */
    @GetMapping("/mine")
    public ResponseEntity<List<DeliveryReviewEntity>> getMine(
            @RequestHeader("Authorization") String authHeader) {
        String riderId = extractUserId(authHeader);
        if (riderId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        List<DeliveryReviewEntity> reviews = reviewRepository.findByDeliveryPersonId(riderId);
        reviews.sort((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()));
        return ResponseEntity.ok(reviews);
    }
}
