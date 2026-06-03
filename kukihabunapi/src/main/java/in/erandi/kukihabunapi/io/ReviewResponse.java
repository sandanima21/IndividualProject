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
public class ReviewResponse {
    private String id;
    private String foodId;
    private String userId;
    private String orderId;
    private String userName;
    private String userPicture;
    private int rating;
    private String comment;
    private LocalDateTime createdAt;
}
