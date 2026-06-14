package in.erandi.kukihabunapi.io;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderResponse {
    private String id;
    private String displayId;
    private String userId;
    private String userName;
    private List<OrderItemResponse> items;
    private String orderType;
    private String deliveryAddress;
    private Double restaurantLat;
    private Double restaurantLng;
    private Double deliveryLat;
    private Double deliveryLng;
    private String userEmail;
    private String mobileNumber;
    private String deliveryPersonId;
    private String deliveryPersonName;
    private String deliveryPersonPhone;
    private String deliveryPersonPicture;
    private boolean deliveryPersonOnline;
    private Double deliveryPersonCurrentLat;
    private Double deliveryPersonCurrentLng;
    private double subtotal;
    private double deliveryFee;
    private double total;
    private String status;
    private String paymentStatus;
    private String payherePaymentId; // PayHere transaction reference, needed by admin to process refund
    private String refundStatus;
    private String refundNotes;
    private String refundBankName;
    private String refundBankBranch;
    private String refundAccountNumber;
    private String refundAccountHolderName;
    private String refundReceiptUrl;
    private LocalDateTime paymentTime;
    private LocalDateTime cancelableUntil;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
