package in.erandi.kukihabunapi.controller;

import in.erandi.kukihabunapi.config.JwtUtil;
import in.erandi.kukihabunapi.io.OrderRequest;
import in.erandi.kukihabunapi.io.OrderResponse;
import in.erandi.kukihabunapi.service.OrderService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/orders")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5174", "http://localhost:3000"})
public class OrderController {

    private final OrderService orderService;
    private final JwtUtil jwtUtil;
    private final SimpMessagingTemplate messaging;

    public OrderController(OrderService orderService, JwtUtil jwtUtil, SimpMessagingTemplate messaging) {
        this.orderService = orderService;
        this.jwtUtil = jwtUtil;
        this.messaging = messaging;
    }

    @PostMapping
    public ResponseEntity<OrderResponse> placeOrder(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody OrderRequest request) {
        String userId = extractUserId(authHeader);
        if (userId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        return ResponseEntity.status(HttpStatus.CREATED).body(orderService.placeOrder(userId, request));
    }

    @GetMapping("/my")
    public ResponseEntity<List<OrderResponse>> getMyOrders(
            @RequestHeader("Authorization") String authHeader) {
        String userId = extractUserId(authHeader);
        if (userId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        return ResponseEntity.ok(orderService.getOrdersByUser(userId));
    }

    @GetMapping
    public ResponseEntity<List<OrderResponse>> getAllOrders() {
        return ResponseEntity.ok(orderService.getAllOrders());
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<OrderResponse> updateStatus(
            @PathVariable String id,
            @RequestBody Map<String, String> body) {
        OrderResponse updated = orderService.updateOrderStatus(id, body.get("status"));
        // Push the updated order to the customer in real time
        if (updated.getUserId() != null) {
            messaging.convertAndSend("/topic/order-status/" + updated.getUserId(), updated);
        }
        return ResponseEntity.ok(updated);
    }

    @PostMapping("/{id}/mark-paid")
    public ResponseEntity<OrderResponse> markPaid(
            @PathVariable String id,
            @RequestHeader("Authorization") String authHeader) {
        String userId = extractUserId(authHeader);
        if (userId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        return ResponseEntity.ok(orderService.markPaid(id, userId));
    }

    @PatchMapping("/{id}/refund-status")
    public ResponseEntity<OrderResponse> updateRefundStatus(
            @PathVariable String id,
            @RequestBody Map<String, String> body) {
        OrderResponse updated = orderService.updateRefundStatus(id, body.get("refundStatus"), body.get("refundNotes"));
        // Push refund status update to customer in real time
        if (updated.getUserId() != null) {
            messaging.convertAndSend("/topic/order-status/" + updated.getUserId(), updated);
        }
        return ResponseEntity.ok(updated);
    }

    @PostMapping("/{id}/refund-receipt")
    public ResponseEntity<OrderResponse> uploadRefundReceipt(
            @PathVariable String id,
            @RequestParam("file") MultipartFile file) {
        OrderResponse updated = orderService.uploadRefundReceipt(id, file);
        // Notify the customer in real time so they see the receipt immediately
        if (updated.getUserId() != null) {
            messaging.convertAndSend("/topic/order-status/" + updated.getUserId(), updated);
        }
        return ResponseEntity.ok(updated);
    }

    @PostMapping("/{id}/payhere-refund")
    public ResponseEntity<?> processPayhereRefund(@PathVariable String id) {
        try {
            OrderResponse updated = orderService.processPayhereRefund(id);
            if (updated.getUserId() != null)
                messaging.convertAndSend("/topic/order-status/" + updated.getUserId(), updated);
            return ResponseEntity.ok(updated);
        } catch (org.springframework.web.server.ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(Map.of("error", e.getReason()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}/cancel-pending")
    public ResponseEntity<Void> cancelPending(
            @PathVariable String id,
            @RequestHeader("Authorization") String authHeader) {
        String userId = extractUserId(authHeader);
        if (userId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        orderService.cancelPending(id, userId);
        return ResponseEntity.noContent().build();
    }

    private String extractUserId(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) return null;
        String token = authHeader.substring(7);
        if (!jwtUtil.validateToken(token)) return null;
        return jwtUtil.extractUserId(token);
    }
}
