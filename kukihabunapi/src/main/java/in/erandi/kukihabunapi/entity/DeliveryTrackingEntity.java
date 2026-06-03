package in.erandi.kukihabunapi.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "delivery_tracking")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeliveryTrackingEntity {

    @Id
    private String id;

    @Indexed
    private String orderId;

    private String deliveryPersonId;

    private double latitude;
    private double longitude;

    @Builder.Default
    private LocalDateTime timestamp = LocalDateTime.now();
}
