package in.erandi.kukihabunapi.io;

import lombok.Data;

@Data
public class ReviewRequest {
    private String foodId;
    private String orderId;
    private int rating;
    private String comment;
}
