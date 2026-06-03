package in.erandi.kukihabunapi.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "reviews")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReviewEntity {

    @Id
    private String id;

    private String foodId;
    private String userId;
    private String orderId;

    private String userName;
    private String userPicture;

    private int rating;      // 1–5
    private String comment;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
