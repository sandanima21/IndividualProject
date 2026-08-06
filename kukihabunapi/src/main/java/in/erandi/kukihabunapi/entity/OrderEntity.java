package in.erandi.kukihabunapi.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;

@Document(collection = "orders")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderEntity {

    @Id
    private String id;

    private String displayId; // ORD001, ORD002, …

    private String userId;

    private List<OrderItemEntity> items;

    private String orderType; // delivery | takeaway

    private String deliveryAddress;

    private String mobileNumber;

    private double subtotal;
    private double deliveryFee;
    private double total;

    // Restaurant location (hard-coded at order time)
    private Double restaurantLat;
    private Double restaurantLng;

    // Delivery location (lat/lng from map picker)
    private Double deliveryLat;
    private Double deliveryLng;

    // Delivery person assignment
    private String deliveryPersonId;
    private Double deliveryPersonCurrentLat;
    private Double deliveryPersonCurrentLng;

    @Builder.Default
    private String status = "PENDING"; // PENDING | CONFIRMED | COOKING | READY | DELIVERED

    // Set only when status becomes CANCELLED — who cancelled it and why. "ADMIN" cancellations
    // carry a reason (required, shown to the customer + emailed); "CUSTOMER" self-cancellations
    // (PaymentController.cancelOrder) never set cancelReason since the customer doesn't type one.
    private String cancelReason;
    private String cancelledBy; // "ADMIN" | "CUSTOMER" | null

    @Builder.Default
    private String paymentStatus = "UNPAID"; // UNPAID | PAID | CANCELLED | REFUNDED

    // Refund lifecycle: set to PENDING_REFUND on cancellation, updated by admin
    private String refundStatus; // PENDING_REFUND | REFUND_INITIATED | REFUNDED | REFUND_FAILED
    private String refundNotes;

    // Bank details provided by customer at cancellation time so admin can process the manual transfer
    private String refundBankName;
    private String refundBankBranch;
    private String refundAccountNumber;
    private String refundAccountHolderName;

    // S3 URL of the refund receipt photo uploaded by admin
    private String refundReceiptUrl;

    private LocalDateTime paymentTime;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime updatedAt;

    // Set the moment status first becomes DELIVERED (delivery orders) or is marked picked up
    // (takeaway orders — both use the DELIVERED status) — see OrderServiceImpl.updateOrderStatus.
    // This is what History views show, since createdAt/updatedAt don't reliably mean "when this
    // order finished" (updatedAt is touched by unrelated later actions like refund edits).
    private LocalDateTime deliveredAt;

    // Set the moment a rider accepts the order and status becomes OUT_FOR_DELIVERY — see
    // OrderServiceImpl.updateOrderStatus / DeliveryController.acceptOrder. Shown on the rider's
    // Active Deliveries card, same reasoning as deliveredAt above.
    private LocalDateTime outForDeliveryAt;

    // Set the moment status becomes CANCELLED — see OrderServiceImpl.adminCancelOrder and
    // PaymentController.cancelOrder (customer self-cancel). Shown in admin History → Cancelled.
    private LocalDateTime cancelledAt;

    // Set the moment refundStatus first becomes REFUNDED (the refund actually completing, not
    // just being requested/in-progress) — see OrderServiceImpl.updateRefundStatus and
    // processPayhereRefund. Shown in admin History → Refunded.
    private LocalDateTime refundedAt;
}
