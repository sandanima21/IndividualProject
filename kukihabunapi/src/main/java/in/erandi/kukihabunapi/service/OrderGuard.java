package in.erandi.kukihabunapi.service;

import in.erandi.kukihabunapi.entity.OrderEntity;
import in.erandi.kukihabunapi.repository.OrderRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Shared "is this still on an active order" check, used to block deleting/deactivating
 * anything a customer is still actively waiting on — a food, a customer account, or a
 * delivery rider mid-delivery. An order in one of ACTIVE_STATUSES is still being
 * worked on (not delivered/cancelled yet).
 */
@Component
public class OrderGuard {

    private static final List<String> ACTIVE_STATUSES =
            List.of("PENDING", "CONFIRMED", "COOKING", "READY", "OUT_FOR_DELIVERY");

    // Human-friendly labels — mirrors the admin Kanban board's column labels
    // (e.g. COOKING reads as "Preparing" there too).
    private static final Map<String, String> STATUS_LABELS = Map.of(
            "PENDING", "Pending",
            "CONFIRMED", "Confirmed",
            "COOKING", "Preparing",
            "READY", "Ready",
            "OUT_FOR_DELIVERY", "Out for Delivery"
    );

    @Autowired
    private OrderRepository orderRepository;

    public List<OrderEntity> activeOrdersForFoodIds(List<String> foodIds) {
        return realOrders(orderRepository.findByItemsFoodIdInAndStatusIn(foodIds, ACTIVE_STATUSES));
    }

    public List<OrderEntity> activeOrdersForCustomer(String userId) {
        return realOrders(orderRepository.findByUserIdAndStatusIn(userId, ACTIVE_STATUSES));
    }

    public List<OrderEntity> activeOrdersForRider(String riderId) {
        return realOrders(orderRepository.findByDeliveryPersonIdAndStatusIn(riderId, ACTIVE_STATUSES));
    }

    // PENDING+UNPAID orders are abandoned/incomplete carts, not real orders yet — same
    // convention OrderServiceImpl uses for its own "active" order filtering.
    private List<OrderEntity> realOrders(List<OrderEntity> orders) {
        return orders.stream()
                .filter(o -> !("PENDING".equals(o.getStatus()) && "UNPAID".equals(o.getPaymentStatus())))
                .collect(Collectors.toList());
    }

    // e.g. "Pending status" / "Pending and Confirmed statuses" / "Pending, Confirmed and
    // Preparing statuses" — one label per distinct status among the given orders, in
    // workflow order, deduplicated.
    public String statusPhrase(List<OrderEntity> orders) {
        List<String> labels = ACTIVE_STATUSES.stream()
                .filter(status -> orders.stream().anyMatch(o -> status.equals(o.getStatus())))
                .map(status -> STATUS_LABELS.getOrDefault(status, status))
                .collect(Collectors.toList());
        if (labels.size() == 1) return labels.get(0) + " status";
        String allButLast = String.join(", ", labels.subList(0, labels.size() - 1));
        return allButLast + " and " + labels.get(labels.size() - 1) + " statuses";
    }
}
