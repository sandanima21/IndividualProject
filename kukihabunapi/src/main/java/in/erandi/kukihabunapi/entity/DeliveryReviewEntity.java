package in.erandi.kukihabunapi.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "delivery_reviews")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeliveryReviewEntity {

    @Id
    private String id;

    @Indexed
    private String orderId;
    @Indexed
    private String deliveryPersonId;
    private String customerId;
    private String customerName;

    // Denormalized from the order at review time, same as customerName —
    // lets the rider see which order/where the delivery was without a separate order lookup.
    private String orderDisplayId;
    private String deliveryAddress;

    private int rating;       // 1–5
    private String comment;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
