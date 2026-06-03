package in.erandi.kukihabunapi.io;

import lombok.Data;

import java.util.List;

@Data
public class OrderRequest {
    private List<OrderItemRequest> items;
    private String orderType;       // delivery | takeaway
    private String deliveryAddress;
    private Double deliveryLat;
    private Double deliveryLng;
    private String mobileNumber;
    private Double deliveryFee;

    // Optional offer attached to this order
    private String offerId;
    private String offerTitle;
    private Double offerPrice;
    private String offerImageUrl;
}
