package in.erandi.kukihabunapi.controller;

import in.erandi.kukihabunapi.config.JwtUtil;
import in.erandi.kukihabunapi.entity.OrderEntity;
import in.erandi.kukihabunapi.entity.PaymentEntity;
import in.erandi.kukihabunapi.entity.UserEntity;
import in.erandi.kukihabunapi.repository.OrderRepository;
import in.erandi.kukihabunapi.repository.PaymentRepository;
import in.erandi.kukihabunapi.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/payments")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5174", "http://localhost:3000"})
public class PaymentController {

    @Value("${payhere.merchant-id}")
    private String merchantId;

    @Value("${payhere.merchant-secret}")
    private String merchantSecret;

    @Value("${payhere.sandbox:true}")
    private boolean sandbox;

    @Value("${payhere.webhook-base-url:}")
    private String webhookBaseUrl;

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

private final PaymentRepository paymentRepository;
    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;

    public PaymentController(PaymentRepository paymentRepository, OrderRepository orderRepository,
                             UserRepository userRepository, JwtUtil jwtUtil) {
        this.paymentRepository = paymentRepository;
        this.orderRepository = orderRepository;
        this.userRepository = userRepository;
        this.jwtUtil = jwtUtil;
    }

    // Generate PayHere hash and return all payment parameters to the frontend
    @PostMapping("/initiate/{orderId}")
    public ResponseEntity<Map<String, Object>> initiate(
            @PathVariable String orderId,
            @RequestHeader("Authorization") String authHeader) {

        String userId = extractUserId(authHeader);
        if (userId == null) return ResponseEntity.status(401).build();

        OrderEntity order = orderRepository.findById(orderId).orElse(null);
        if (order == null) return ResponseEntity.notFound().build();

        if ("PAID".equals(order.getPaymentStatus())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Order is already paid"));
        }

        UserEntity user = userRepository.findById(userId).orElse(null);
        String fullName  = user != null && user.getName() != null ? user.getName() : "Customer";
        String email     = user != null && user.getEmail() != null ? user.getEmail() : "";
        String phone     = order.getMobileNumber() != null ? order.getMobileNumber()
                         : (user != null && user.getPhone() != null ? user.getPhone() : "");
        String address   = order.getDeliveryAddress() != null ? order.getDeliveryAddress() : "Sri Lanka";

        String[] parts     = fullName.split(" ", 2);
        String firstName   = parts[0];
        String lastName    = parts.length > 1 ? parts[1] : ".";

        String amountStr = String.format("%.2f", order.getTotal());
        String currency  = "LKR";

        String hash;
        try {
            hash = generateHash(orderId, amountStr, currency);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Hash generation failed: " + e.getMessage()));
        }

        // Persist a PENDING payment record (idempotent)
        paymentRepository.findByOrderId(orderId).orElseGet(() ->
            paymentRepository.save(PaymentEntity.builder()
                .orderId(orderId)
                .userId(userId)
                .amount(order.getTotal())
                .currency(currency)
                .build())
        );

        String baseUrl   = sandbox ? "https://sandbox.payhere.lk" : "https://www.payhere.lk";
        String notifyBase = (webhookBaseUrl != null && !webhookBaseUrl.isBlank())
                ? webhookBaseUrl.stripTrailing()
                : "http://localhost:8080";
        String notifyUrl = notifyBase + "/api/payments/notify";

        var entries = new java.util.LinkedHashMap<String, Object>();
        entries.put("sandbox",     sandbox);
        entries.put("merchant_id", merchantId);
        entries.put("return_url",  frontendUrl + "/orders");
        entries.put("cancel_url",  frontendUrl + "/cart");
        entries.put("notify_url",  notifyUrl);
        entries.put("order_id",    orderId);
        entries.put("items",       "KukiHabun Food Order");
        entries.put("amount",      amountStr);
        entries.put("currency",    currency);
        entries.put("hash",        hash);
        entries.put("first_name",  firstName);
        entries.put("last_name",   lastName);
        entries.put("email",       email);
        entries.put("phone",       phone);
        entries.put("address",     address);
        entries.put("city",        "Colombo");
        entries.put("country",     "Sri Lanka");
        return ResponseEntity.ok(entries);
    }

    // PayHere server-to-server notification (no auth — PayHere's server calls this)
    @PostMapping("/notify")
    public ResponseEntity<String> notify(@RequestParam Map<String, String> params) {
        String notifyMerchantId = params.get("merchant_id");
        String orderId          = params.get("order_id");
        String payhereAmount    = params.get("payhere_amount");
        String payhereCurrency  = params.get("payhere_currency");
        String statusCode       = params.get("status_code");
        String md5sig           = params.get("md5sig");
        String payherePaymentId = params.get("payment_id");

        if (orderId == null || statusCode == null || md5sig == null) {
            return ResponseEntity.badRequest().body("Missing parameters");
        }

        try {
            String expected = md5(notifyMerchantId + orderId + payhereAmount + payhereCurrency + statusCode + md5(merchantSecret));
            if (!expected.equalsIgnoreCase(md5sig)) {
                return ResponseEntity.status(400).body("Invalid signature");
            }
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Hash verification failed");
        }

        LocalDateTime now = LocalDateTime.now();

        if ("2".equals(statusCode)) {
            orderRepository.findById(orderId).ifPresent(order -> {
                order.setPaymentStatus("PAID");
                order.setPaymentTime(now);
                order.setCancelableUntil(now.plusMinutes(15));
                orderRepository.save(order);
            });
            paymentRepository.findByOrderId(orderId).ifPresent(p -> {
                p.setStatus("SUCCESS");
                p.setPaidAt(now);
                p.setMethod("payhere");
                p.setPayherePaymentId(payherePaymentId);
                paymentRepository.save(p);
            });
        } else if ("-1".equals(statusCode) || "-2".equals(statusCode)) {
            orderRepository.findById(orderId).ifPresent(order -> {
                order.setPaymentStatus("FAILED");
                orderRepository.save(order);
            });
            paymentRepository.findByOrderId(orderId).ifPresent(p -> {
                p.setStatus("FAILED");
                paymentRepository.save(p);
            });
        }

        return ResponseEntity.ok("OK");
    }

    // Cancel a PENDING order — customer provides bank details for the manual refund transfer
    @PostMapping("/cancel/{orderId}")
    public ResponseEntity<Map<String, String>> cancelOrder(
            @PathVariable String orderId,
            @RequestHeader("Authorization") String authHeader,
            @RequestBody(required = false) Map<String, String> body) {

        String userId = extractUserId(authHeader);
        if (userId == null) return ResponseEntity.status(401).build();

        OrderEntity order = orderRepository.findById(orderId).orElse(null);
        if (order == null) return ResponseEntity.notFound().build();
        if (!order.getUserId().equals(userId)) return ResponseEntity.status(403).build();
        if (!"PENDING".equals(order.getStatus()))
            return ResponseEntity.badRequest().body(Map.of("error", "Order can no longer be cancelled"));

        order.setStatus("CANCELLED");
        order.setPaymentStatus("REFUNDED");
        order.setRefundStatus("PENDING_REFUND");

        // Persist the customer's bank details so admin can process the transfer manually
        if (body != null) {
            order.setRefundBankName(body.get("bankName"));
            order.setRefundBankBranch(body.get("bankBranch"));
            order.setRefundAccountNumber(body.get("accountNumber"));
            order.setRefundAccountHolderName(body.get("accountHolderName"));
        }
        order.setUpdatedAt(LocalDateTime.now());
        orderRepository.save(order);

        return ResponseEntity.ok(Map.of("status", "CANCELLED", "paymentStatus", "REFUNDED", "refundStatus", "PENDING_REFUND"));
    }

    // Admin: all payments
    @GetMapping
    public ResponseEntity<List<PaymentEntity>> getAllPayments() {
        return ResponseEntity.ok(paymentRepository.findAllByOrderByCreatedAtDesc());
    }

    // ── Helpers ──────────────────────────────────────────────────────────────────

    private String generateHash(String orderId, String amount, String currency) throws Exception {
        return md5(merchantId + orderId + amount + currency + md5(merchantSecret));
    }

    private String md5(String input) throws Exception {
        MessageDigest md = MessageDigest.getInstance("MD5");
        byte[] hash = md.digest(input.getBytes(StandardCharsets.UTF_8));
        StringBuilder sb = new StringBuilder();
        for (byte b : hash) sb.append(String.format("%02x", b));
        return sb.toString().toUpperCase();
    }

    private String extractUserId(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) return null;
        String token = authHeader.substring(7);
        if (!jwtUtil.validateToken(token)) return null;
        return jwtUtil.extractUserId(token);
    }
}
