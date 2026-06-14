package in.erandi.kukihabunapi.controller;

import in.erandi.kukihabunapi.io.OrderResponse;
import in.erandi.kukihabunapi.repository.OrderRepository;
import in.erandi.kukihabunapi.repository.PaymentRepository;
import in.erandi.kukihabunapi.service.OrderService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.Map;

/**
 * Receives PayHere's automated refund-status callback and automatically
 * transitions the order to REFUNDED in the database.
 *
 * Configure this URL in the PayHere merchant portal (Merchant API → Webhooks):
 *   Production : https://yoursite.com/api/v1/payhere/refund-webhook
 *   Sandbox    : https://yoursite.com/api/v1/payhere/refund-webhook  (same path)
 *
 * PayHere sends HTTP POST with application/x-www-form-urlencoded params.
 * Expected params (subset):
 *   merchant_id, order_id, payment_id, payhere_amount, payhere_currency,
 *   status_code, md5sig
 *
 * Signature verification (same algorithm as payment notify):
 *   MD5( merchant_id + order_id + payhere_amount + payhere_currency
 *        + status_code + MD5(merchantSecret).toUpperCase() ).toUpperCase()
 *
 * Status codes (PayHere):
 *   Positive (≥1) → refund was processed successfully → REFUNDED
 *   Negative      → refund failed; logged, status stays at REFUND_INITIATED
 *
 * Note: PayHere may also send refund callbacks to your original notify_url
 * (with a refund-specific status_code). Duplicate calls are idempotent because
 * we only transition REFUND_INITIATED → REFUNDED (already-REFUNDED orders are skipped).
 */
@RestController
@RequestMapping("/api/v1/payhere")
public class PayHereWebhookController {

    private static final Logger log = LoggerFactory.getLogger(PayHereWebhookController.class);

    @Value("${payhere.merchant-id}")
    private String merchantId;

    @Value("${payhere.merchant-secret}")
    private String merchantSecret;

    private final OrderService orderService;
    private final OrderRepository orderRepository;
    private final PaymentRepository paymentRepository;
    private final SimpMessagingTemplate messaging;

    public PayHereWebhookController(OrderService orderService,
                                    OrderRepository orderRepository,
                                    PaymentRepository paymentRepository,
                                    SimpMessagingTemplate messaging) {
        this.orderService = orderService;
        this.orderRepository = orderRepository;
        this.paymentRepository = paymentRepository;
        this.messaging = messaging;
    }

    // ── Webhook endpoint ──────────────────────────────────────────────────────

    @PostMapping("/refund-webhook")
    public ResponseEntity<String> handleRefundWebhook(@RequestParam Map<String, String> params) {

        String payherePaymentId = params.get("payment_id");
        String orderId          = params.get("order_id");
        String amount           = params.get("payhere_amount");
        String currency         = params.get("payhere_currency");
        String statusCode       = params.get("status_code");
        String md5sig           = params.get("md5sig");

        log.info("PayHere refund webhook received: payment_id={} order_id={} status_code={}",
                payherePaymentId, orderId, statusCode);

        // ── 1. Validate required params ───────────────────────────────────────
        if (isBlank(statusCode) || isBlank(md5sig)) {
            log.warn("Refund webhook rejected: missing status_code or md5sig");
            return ResponseEntity.badRequest().body("Missing required parameters");
        }

        // ── 2. Signature verification ─────────────────────────────────────────
        try {
            String expected = md5(
                    merchantId
                    + nullSafe(orderId)
                    + nullSafe(amount)
                    + nullSafe(currency)
                    + statusCode
                    + md5(merchantSecret).toUpperCase()
            ).toUpperCase();

            if (!expected.equalsIgnoreCase(md5sig)) {
                log.warn("Refund webhook signature mismatch: expected={} received={}", expected, md5sig);
                return ResponseEntity.status(400).body("Invalid signature");
            }
        } catch (Exception e) {
            log.error("Refund webhook signature check threw: {}", e.getMessage());
            return ResponseEntity.status(500).body("Signature verification error");
        }

        // ── 3. Resolve orderId (primary: direct, fallback: via payment record) ─
        String resolvedOrderId = orderId;
        if (isBlank(resolvedOrderId) && !isBlank(payherePaymentId)) {
            resolvedOrderId = paymentRepository.findByPayherePaymentId(payherePaymentId)
                    .map(p -> p.getOrderId())
                    .orElse(null);
        }

        if (isBlank(resolvedOrderId)) {
            log.warn("Refund webhook: cannot resolve orderId from payment_id={}", payherePaymentId);
            return ResponseEntity.ok("OK — order not found, ignored");
        }

        // ── 4. Check idempotency — skip if already REFUNDED ───────────────────
        final String finalOrderId = resolvedOrderId;
        boolean alreadyRefunded = orderRepository.findById(finalOrderId)
                .map(o -> "REFUNDED".equals(o.getRefundStatus()))
                .orElse(false);
        if (alreadyRefunded) {
            log.info("Refund webhook: order {} already REFUNDED, skipping", finalOrderId);
            return ResponseEntity.ok("OK");
        }

        // ── 5. Determine outcome from status_code ─────────────────────────────
        int code;
        try { code = Integer.parseInt(statusCode); }
        catch (NumberFormatException e) { code = 0; }

        if (code > 0) {
            // Refund confirmed — transition to REFUNDED and push to customer
            String note = "Refund confirmed by PayHere webhook at " + LocalDateTime.now();
            try {
                OrderResponse updated = orderService.updateRefundStatus(finalOrderId, "REFUNDED", note);
                if (updated.getUserId() != null) {
                    messaging.convertAndSend("/topic/order-status/" + updated.getUserId(), updated);
                }
                log.info("Order {} transitioned to REFUNDED via PayHere webhook", finalOrderId);
            } catch (Exception e) {
                log.error("Failed to update order {} to REFUNDED: {}", finalOrderId, e.getMessage());
                return ResponseEntity.status(500).body("Order update failed");
            }
        } else {
            // Refund failed — PayHere will retry; do NOT change status but log for ops
            log.warn("PayHere refund callback indicates failure for order {}: status_code={}",
                    finalOrderId, statusCode);
        }

        return ResponseEntity.ok("OK");
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private String md5(String input) throws Exception {
        MessageDigest md = MessageDigest.getInstance("MD5");
        byte[] hash = md.digest(input.getBytes(StandardCharsets.UTF_8));
        StringBuilder sb = new StringBuilder();
        for (byte b : hash) sb.append(String.format("%02x", b));
        return sb.toString();
    }

    private boolean isBlank(String s) { return s == null || s.isBlank(); }
    private String nullSafe(String s) { return s == null ? "" : s; }
}
