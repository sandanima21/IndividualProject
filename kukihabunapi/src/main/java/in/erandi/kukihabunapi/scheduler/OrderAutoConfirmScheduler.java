package in.erandi.kukihabunapi.scheduler;

import org.springframework.stereotype.Component;

@Component
public class OrderAutoConfirmScheduler {

    // Auto-confirm is disabled; admin manually moves PENDING to CONFIRMED on the Kanban board.
    // Customers may cancel any PENDING order until the admin confirms it.
    public void autoConfirmExpiredPendingOrders() {}
}
