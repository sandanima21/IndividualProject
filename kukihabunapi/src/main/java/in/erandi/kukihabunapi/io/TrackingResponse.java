package in.erandi.kukihabunapi.io;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TrackingResponse {

    private String orderId;
    private String deliveryPersonId;
    private String deliveryPersonName;
    private boolean riderOnline;

    private Double latitude;
    private Double longitude;
    private LocalDateTime timestamp;

    private String orderStatus;
    private int etaMinutes;       // estimated minutes to destination
    private double distanceKm;    // straight-line distance remaining

    private Double restaurantLat;
    private Double restaurantLng;
    private Double deliveryLat;
    private Double deliveryLng;
    private String deliveryAddress;
}
