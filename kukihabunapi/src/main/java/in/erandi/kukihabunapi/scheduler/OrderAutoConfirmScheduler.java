package in.erandi.kukihabunapi.scheduler;

import in.erandi.kukihabunapi.entity.OrderEntity;
import in.erandi.kukihabunapi.repository.OrderRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

@Component
public class OrderAutoConfirmScheduler {

    private static final Logger log = LoggerFactory.getLogger(OrderAutoConfirmScheduler.class);

    private final OrderRepository orderRepository;

    public OrderAutoConfirmScheduler(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }

    // Runs every 60 seconds; promotes PAID+PENDING orders past their 15-min cancel window to CONFIRMED
    @Scheduled(fixedDelay = 60_000)
    public void autoConfirmExpiredPendingOrders() {
        LocalDateTime now = LocalDateTime.now();

        // Normal path: cancelableUntil is set and has expired
        List<OrderEntity> eligible = orderRepository
                .findByStatusAndPaymentStatusAndCancelableUntilBefore("PENDING", "PAID", now);

        // Legacy path: cancelableUntil was never set (orders paid before the fix); use paymentTime as fallback
        List<OrderEntity> legacy = orderRepository
                .findByStatusAndPaymentStatusAndCancelableUntilIsNullAndPaymentTimeBefore(
                        "PENDING", "PAID", now.minusMinutes(15));

        List<OrderEntity> allEligible = new java.util.ArrayList<>(eligible);
        allEligible.addAll(legacy);

        if (allEligible.isEmpty()) return;

        for (OrderEntity order : allEligible) {
            order.setStatus("CONFIRMED");
            order.setUpdatedAt(now);
        }
        orderRepository.saveAll(allEligible);
        log.info("Auto-confirmed {} order(s)", allEligible.size());
    }
}
