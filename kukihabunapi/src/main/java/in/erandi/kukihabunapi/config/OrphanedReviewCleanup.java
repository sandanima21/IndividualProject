package in.erandi.kukihabunapi.config;

import in.erandi.kukihabunapi.entity.DeliveryReviewEntity;
import in.erandi.kukihabunapi.entity.FoodEntity;
import in.erandi.kukihabunapi.entity.ReviewEntity;
import in.erandi.kukihabunapi.repository.DeliveryReviewRepository;
import in.erandi.kukihabunapi.repository.FoodRepository;
import in.erandi.kukihabunapi.repository.ReviewRepository;
import in.erandi.kukihabunapi.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Self-healing startup cleanup — removes any food/delivery review left over from
 * before FoodServiceImpl.deleteFood and UserController.deleteUser started
 * cascade-deleting reviews on their own. A food or rider deleted prior to that fix
 * left its reviews orphaned (shown as "Unavailable food" / "Unavailable driver" in
 * the admin Reviews page), with no way to ever act on them again.
 *
 * Runs every startup but is a cheap no-op once there's nothing left to clean —
 * deliberately NOT a one-off script, so any future orphan (e.g. from restoring an
 * older database backup) self-heals too. Never touches reviews by userId/customerId —
 * a customer's own reviews must survive that customer's account being deleted.
 */
@Component
public class OrphanedReviewCleanup implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(OrphanedReviewCleanup.class);

    private final ReviewRepository reviewRepository;
    private final FoodRepository foodRepository;
    private final DeliveryReviewRepository deliveryReviewRepository;
    private final UserRepository userRepository;

    public OrphanedReviewCleanup(ReviewRepository reviewRepository, FoodRepository foodRepository,
                                  DeliveryReviewRepository deliveryReviewRepository, UserRepository userRepository) {
        this.reviewRepository = reviewRepository;
        this.foodRepository = foodRepository;
        this.deliveryReviewRepository = deliveryReviewRepository;
        this.userRepository = userRepository;
    }

    @Override
    public void run(String... args) {
        Set<String> validFoodIds = foodRepository.findAll().stream()
                .map(FoodEntity::getId)
                .collect(Collectors.toSet());
        List<String> orphanedReviewIds = reviewRepository.findAll().stream()
                .filter(r -> !validFoodIds.contains(r.getFoodId()))
                .map(ReviewEntity::getId)
                .collect(Collectors.toList());
        if (!orphanedReviewIds.isEmpty()) {
            reviewRepository.deleteAllById(orphanedReviewIds);
            log.info("Startup cleanup: removed {} food review(s) for foods no longer in the system", orphanedReviewIds.size());
        }

        List<String> orphanedDeliveryReviewIds = deliveryReviewRepository.findAll().stream()
                .filter(r -> r.getDeliveryPersonId() == null || !userRepository.existsById(r.getDeliveryPersonId()))
                .map(DeliveryReviewEntity::getId)
                .collect(Collectors.toList());
        if (!orphanedDeliveryReviewIds.isEmpty()) {
            deliveryReviewRepository.deleteAllById(orphanedDeliveryReviewIds);
            log.info("Startup cleanup: removed {} delivery review(s) for riders no longer in the system", orphanedDeliveryReviewIds.size());
        }
    }
}
