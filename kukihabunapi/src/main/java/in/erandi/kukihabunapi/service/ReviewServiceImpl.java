package in.erandi.kukihabunapi.service;

import in.erandi.kukihabunapi.entity.ReviewEntity;
import in.erandi.kukihabunapi.entity.UserEntity;
import in.erandi.kukihabunapi.io.ReviewRequest;
import in.erandi.kukihabunapi.io.ReviewResponse;
import in.erandi.kukihabunapi.repository.FoodRepository;
import in.erandi.kukihabunapi.repository.ReviewRepository;
import in.erandi.kukihabunapi.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class ReviewServiceImpl implements ReviewService {

    private final ReviewRepository reviewRepository;
    private final UserRepository userRepository;
    private final FoodRepository foodRepository;

    public ReviewServiceImpl(ReviewRepository reviewRepository, UserRepository userRepository, FoodRepository foodRepository) {
        this.reviewRepository = reviewRepository;
        this.userRepository = userRepository;
        this.foodRepository = foodRepository;
    }

    @Override
    public ReviewResponse addReview(String userId, ReviewRequest request) {
        // A food that's been removed from the menu is never reviewable — deleting a food
        // also cascade-deletes its existing reviews (see FoodServiceImpl.deleteFood), so
        // this only ever blocks brand-new reviews for a food that's genuinely gone.
        if (!foodRepository.existsById(request.getFoodId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This food is no longer available for review.");
        }
        if (reviewRepository.existsByOrderIdAndFoodId(request.getOrderId(), request.getFoodId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Review already submitted for this order item");
        }
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        ReviewEntity review = ReviewEntity.builder()
                .foodId(request.getFoodId())
                .userId(userId)
                .orderId(request.getOrderId())
                .userName(user.getName())
                .userPicture(user.getPicture())
                .rating(request.getRating())
                .comment(request.getComment())
                .build();

        return toResponse(reviewRepository.save(review));
    }

    @Override
    public ReviewResponse updateReview(String userId, String reviewId, ReviewRequest request) {
        ReviewEntity existing = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Review not found"));
        if (!existing.getUserId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not your review");
        }
        if (!foodRepository.existsById(existing.getFoodId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This food is no longer available for review.");
        }
        existing.setRating(request.getRating());
        existing.setComment(request.getComment());
        return toResponse(reviewRepository.save(existing));
    }

    @Override
    public List<ReviewResponse> getReviewsByFood(String foodId) {
        return reviewRepository.findByFoodIdOrderByCreatedAtDesc(foodId)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Override
    public List<ReviewResponse> getAllReviews() {
        return reviewRepository.findAll().stream()
                .map(this::toResponse).collect(Collectors.toList());
    }

    @Override
    public List<ReviewResponse> getReviewsByUser(String userId) {
        return reviewRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    private ReviewResponse toResponse(ReviewEntity r) {
        return ReviewResponse.builder()
                .id(r.getId())
                .foodId(r.getFoodId())
                .userId(r.getUserId())
                .orderId(r.getOrderId())
                .userName(r.getUserName())
                .userPicture(r.getUserPicture())
                .rating(r.getRating())
                .comment(r.getComment())
                .createdAt(r.getCreatedAt())
                .build();
    }
}
