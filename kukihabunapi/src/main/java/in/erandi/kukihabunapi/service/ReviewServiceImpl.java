package in.erandi.kukihabunapi.service;

import in.erandi.kukihabunapi.entity.ReviewEntity;
import in.erandi.kukihabunapi.entity.UserEntity;
import in.erandi.kukihabunapi.io.ReviewRequest;
import in.erandi.kukihabunapi.io.ReviewResponse;
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

    public ReviewServiceImpl(ReviewRepository reviewRepository, UserRepository userRepository) {
        this.reviewRepository = reviewRepository;
        this.userRepository = userRepository;
    }

    @Override
    public ReviewResponse addReview(String userId, ReviewRequest request) {
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
