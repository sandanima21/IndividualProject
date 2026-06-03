package in.erandi.kukihabunapi.service;

import in.erandi.kukihabunapi.io.ReviewRequest;
import in.erandi.kukihabunapi.io.ReviewResponse;

import java.util.List;

public interface ReviewService {
    ReviewResponse addReview(String userId, ReviewRequest request);
    List<ReviewResponse> getReviewsByFood(String foodId);
    List<ReviewResponse> getAllReviews();
    List<ReviewResponse> getReviewsByUser(String userId);
}
