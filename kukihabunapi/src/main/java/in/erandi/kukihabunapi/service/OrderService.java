package in.erandi.kukihabunapi.service;

import in.erandi.kukihabunapi.io.OrderRequest;
import in.erandi.kukihabunapi.io.OrderResponse;

import java.util.List;

public interface OrderService {
    OrderResponse placeOrder(String userId, OrderRequest request);
    List<OrderResponse> getOrdersByUser(String userId);
    List<OrderResponse> getAllOrders();
    OrderResponse updateOrderStatus(String orderId, String status);
    OrderResponse markPaid(String orderId, String userId);
    void cancelPending(String orderId, String userId);
    OrderResponse updateRefundStatus(String orderId, String refundStatus, String notes);
    OrderResponse uploadRefundReceipt(String orderId, org.springframework.web.multipart.MultipartFile file);
    OrderResponse processPayhereRefund(String orderId);
}
