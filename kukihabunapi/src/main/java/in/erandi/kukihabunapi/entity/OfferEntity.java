package in.erandi.kukihabunapi.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Document(collection = "offers")
public class OfferEntity {
    @Id
    private String id;
    private String title;
    private String description;
    private String imageUrl;
    private LocalDateTime startDate;
    private LocalDateTime endDate;
    private Double price;
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
