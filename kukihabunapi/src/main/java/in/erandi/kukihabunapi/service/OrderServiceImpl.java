package in.erandi.kukihabunapi.service;

import in.erandi.kukihabunapi.entity.FoodEntity;
import in.erandi.kukihabunapi.entity.FoodPortion;
import in.erandi.kukihabunapi.entity.OfferEntity;
import in.erandi.kukihabunapi.entity.OrderEntity;
import in.erandi.kukihabunapi.entity.OrderItemEntity;
import in.erandi.kukihabunapi.entity.UserEntity;
import in.erandi.kukihabunapi.io.OrderItemRequest;
import in.erandi.kukihabunapi.io.OrderItemResponse;
import in.erandi.kukihabunapi.io.OrderRequest;
import in.erandi.kukihabunapi.io.OrderResponse;
import in.erandi.kukihabunapi.repository.FoodRepository;
import in.erandi.kukihabunapi.repository.OfferRepository;
import in.erandi.kukihabunapi.repository.OrderRepository;
import in.erandi.kukihabunapi.repository.PaymentRepository;
import in.erandi.kukihabunapi.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class OrderServiceImpl implements OrderService {

    private final OrderRepository orderRepository;
    private final FoodRepository foodRepository;
    private final UserRepository userRepository;
    private final OfferRepository offerRepository;
    private final PaymentRepository paymentRepository;
    private final SequenceService sequenceService;
    private final FirebaseStorageService storageService;
    private final PayHereRefundService payhereRefundService;
    private final EmailService emailService;

    public OrderServiceImpl(OrderRepository orderRepository, FoodRepository foodRepository,
                            UserRepository userRepository, OfferRepository offerRepository,
                            PaymentRepository paymentRepository, SequenceService sequenceService,
                            FirebaseStorageService storageService, PayHereRefundService payhereRefundService,
                            EmailService emailService) {
        this.orderRepository = orderRepository;
        this.foodRepository = foodRepository;
        this.userRepository = userRepository;
        this.offerRepository = offerRepository;
        this.paymentRepository = paymentRepository;
        this.sequenceService = sequenceService;
        this.storageService = storageService;
        this.payhereRefundService = payhereRefundService;
        this.emailService = emailService;
    }

    private static final double RESTAURANT_LAT = 6.844176631120501;
    private static final double RESTAURANT_LNG = 80.03913846950536;
    private static final ZoneId COLOMBO = ZoneId.of("Asia/Colombo");
    private static final LocalTime OPEN_TIME = LocalTime.of(6, 0);
    private static final LocalTime CLOSE_TIME = LocalTime.of(23, 30);

    @Override
    public OrderResponse placeOrder(String userId, OrderRequest request) {
        LocalTime nowInColombo = LocalTime.now(COLOMBO);
        if (nowInColombo.isBefore(OPEN_TIME) || !nowInColombo.isBefore(CLOSE_TIME)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "We're closed right now. Orders are accepted from 6:00 AM to 11:30 PM.");
        }

        List<OrderItemEntity> items = new ArrayList<>(
                request.getItems() == null ? List.of() :
                request.getItems().stream().map(this::buildOrderItem).collect(Collectors.toList()));

        // Attach offer as a line item so it appears in the order and is included in the total
        if (request.getOfferId() != null) {
            OfferEntity offer = offerRepository.findById(request.getOfferId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Offer not found: " + request.getOfferId()));
            items.add(OrderItemEntity.builder()
                    .foodId(offer.getId())
                    .foodName(offer.getTitle())
                    .foodImageUrl(offer.getImageUrl())
                    .price(offer.getPrice())
                    .quantity(1)
                    .build());
        }

        double subtotal = items.stream()
                .mapToDouble(i -> i.getPrice() * i.getQuantity())
                .sum();
        double deliveryFee = (request.getDeliveryFee() != null) ? request.getDeliveryFee() : 0.0;

        // The client computes and displays this fee (Cart.jsx, via OSRM road distance, which is
        // always >= straight-line distance), but a tampered request could send any value —
        // reject anything below the Haversine-based floor so a delivery can't be placed for free.
        if ("delivery".equalsIgnoreCase(request.getOrderType())) {
            double minFee = minDeliveryFee(request.getDeliveryLat(), request.getDeliveryLng());
            if (deliveryFee < minFee - 0.01) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid delivery fee");
            }
        }

        double total = subtotal + deliveryFee;

        OrderEntity order = OrderEntity.builder()
                .displayId(sequenceService.nextOrderId())
                .userId(userId)
                .items(items)
                .orderType(request.getOrderType())
                .deliveryAddress(request.getDeliveryAddress())
                .restaurantLat(RESTAURANT_LAT)
                .restaurantLng(RESTAURANT_LNG)
                .deliveryLat(request.getDeliveryLat())
                .deliveryLng(request.getDeliveryLng())
                .mobileNumber(request.getMobileNumber())
                .subtotal(subtotal)
                .deliveryFee(deliveryFee)
                .total(total)
                .build();

        return toResponse(orderRepository.save(order));
    }

    @Override
    public List<OrderResponse> getOrdersByUser(String userId) {
        return toResponseList(orderRepository.findByUserIdOrderByCreatedAtDesc(userId));
    }

    @Override
    public List<OrderResponse> getAllOrders() {
        List<OrderEntity> orders = orderRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                // Exclude PENDING+UNPAID (items still in cart); include PENDING+PAID (awaiting confirm window)
                .filter(o -> !"PENDING".equals(o.getStatus()) || "PAID".equals(o.getPaymentStatus()))
                .collect(Collectors.toList());
        return toResponseList(orders);
    }

    @Override
    public OrderResponse updateOrderStatus(String orderId, String status) {
        OrderEntity order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found"));
        // Cancellation needs a reason, an email, and (if paid) a refund — none of which this
        // generic status endpoint does. Route callers to adminCancelOrder instead.
        if ("CANCELLED".equals(status)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Use POST /api/orders/{id}/admin-cancel to cancel an order");
        }
        order.setStatus(status);
        order.setUpdatedAt(LocalDateTime.now());
        if ("DELIVERED".equals(status)) {
            order.setDeliveredAt(order.getUpdatedAt());
        }
        if ("OUT_FOR_DELIVERY".equals(status)) {
            order.setOutForDeliveryAt(order.getUpdatedAt());
        }

        // If admin moves an order back to a pre-pickup stage, clear the rider assignment
        // so the order re-appears in the available list and can be accepted again.
        if ("CONFIRMED".equals(status) || "COOKING".equals(status) || "READY".equals(status)) {
            order.setDeliveryPersonId(null);
            order.setDeliveryPersonCurrentLat(null);
            order.setDeliveryPersonCurrentLng(null);
        }

        // Auto-assign rider in registration order: sort by createdAt, give next order to
        // whoever has the fewest total all-time assignments (ties broken by registration order).
        if ("OUT_FOR_DELIVERY".equals(status) && order.getDeliveryPersonId() == null
                && "delivery".equalsIgnoreCase(order.getOrderType())) {
            List<UserEntity> riders = userRepository.findByRole("DELIVERY");
            // Sort by registration date so ties always favour the earliest-registered rider
            riders.sort(Comparator.comparing(UserEntity::getCreatedAt,
                    Comparator.nullsLast(Comparator.naturalOrder())));
            UserEntity nextRider = null;
            long minCount = Long.MAX_VALUE;
            for (UserEntity rider : riders) {
                long count = orderRepository.countByDeliveryPersonId(rider.getId());
                if (count < minCount) {
                    minCount = count;
                    nextRider = rider;
                }
            }
            if (nextRider != null) {
                order.setDeliveryPersonId(nextRider.getId());
            }
        }

        return toResponse(orderRepository.save(order));
    }

    @Override
    public OrderResponse markPaid(String orderId, String userId) {
        OrderEntity order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found"));
        // In production, notify_url may have already set FAILED — don't override server truth
        if ("FAILED".equals(order.getPaymentStatus()) || "CANCELLED".equals(order.getPaymentStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Payment was not successful");
        }
        LocalDateTime now = LocalDateTime.now();
        order.setPaymentStatus("PAID");
        order.setPaymentTime(now);
        order.setCancelableUntil(now.plusMinutes(15));
        order.setUpdatedAt(now);
        return toResponse(orderRepository.save(order));
    }

    @Override
    public OrderResponse updateRefundStatus(String orderId, String refundStatus, String notes) {
        OrderEntity order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found"));
        order.setRefundStatus(refundStatus);
        if (notes != null && !notes.isBlank()) order.setRefundNotes(notes);
        order.setUpdatedAt(LocalDateTime.now());
        if ("REFUNDED".equals(refundStatus)) {
            order.setRefundedAt(order.getUpdatedAt());
        }
        return toResponse(orderRepository.save(order));
    }

    @Override
    public OrderResponse uploadRefundReceipt(String orderId, MultipartFile file) {
        OrderEntity order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found"));
        order.setRefundReceiptUrl(storageService.upload(file, "refund-receipts"));
        order.setUpdatedAt(LocalDateTime.now());
        return toResponse(orderRepository.save(order));
    }

    @Override
    public OrderResponse processPayhereRefund(String orderId) {
        OrderEntity order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found"));

        if ("REFUNDED".equals(order.getRefundStatus()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This order has already been refunded.");

        String payherePaymentId = paymentRepository.findByOrderId(orderId)
                .map(p -> p.getPayherePaymentId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.BAD_REQUEST, "No payment record found for this order"));

        if (payherePaymentId == null || payherePaymentId.isBlank())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "PayHere payment ID is missing — the original payment may not have completed");

        // Delegate to PayHereRefundService — handles OAuth token caching and retry on 401.
        // Returns false in sandbox mode without App credentials, where PayHere's own portal
        // doesn't issue any — the call is simulated locally rather than actually sent.
        boolean actuallyCalledPayHere = payhereRefundService.requestRefund(payherePaymentId);

        // PayHere confirmed (support, 2026-07-31) that refunds have no async webhook —
        // the synchronous API response IS the final result. requestRefund() only returns
        // without throwing when that response was a success, so a real call means the
        // refund is already done, not "initiated pending confirmation".
        order.setRefundStatus(actuallyCalledPayHere ? "REFUNDED" : "REFUND_INITIATED");
        order.setRefundNotes(actuallyCalledPayHere
                ? "Refunded via PayHere at " + LocalDateTime.now() + "."
                : "Refund marked in-progress at " + LocalDateTime.now() + " (sandbox simulation — PayHere sandbox doesn't "
                        + "issue API credentials, so no real API call was made; this won't appear in the PayHere dashboard).");
        order.setUpdatedAt(LocalDateTime.now());
        if (actuallyCalledPayHere) {
            order.setRefundedAt(order.getUpdatedAt());
        }
        return toResponse(orderRepository.save(order));
    }

    @Override
    public void cancelPending(String orderId, String userId) {
        orderRepository.findById(orderId).ifPresent(order -> {
            if ("UNPAID".equals(order.getPaymentStatus()) && "PENDING".equals(order.getStatus())) {
                orderRepository.deleteById(orderId);
            }
        });
    }

    @Override
    public OrderResponse adminCancelOrder(String orderId, String reason) {
        if (reason == null || reason.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A cancellation reason is required.");
        }
        OrderEntity order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found"));
        if (List.of("OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED").contains(order.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Order can no longer be cancelled");
        }

        boolean wasPaid = "PAID".equals(order.getPaymentStatus());
        order.setStatus("CANCELLED");
        order.setCancelReason(reason);
        order.setCancelledBy("ADMIN");
        if (wasPaid) {
            order.setPaymentStatus("REFUNDED");
            order.setRefundStatus("PENDING_REFUND");
        }
        order.setUpdatedAt(LocalDateTime.now());
        order.setCancelledAt(order.getUpdatedAt());

        OrderResponse response = toResponse(orderRepository.save(order));
        if (response.getUserEmail() != null) {
            String foodNames = response.getItems() == null ? "" : response.getItems().stream()
                    .map(OrderItemResponse::getFoodName)
                    .collect(Collectors.joining(", "));
            emailService.sendOrderCancelled(response.getUserEmail(), response.getUserName(),
                    response.getDisplayId(), foodNames, reason, wasPaid);
        }
        return response;
    }

    /** Mirrors Cart.jsx's calcDeliveryFee: flat Rs.100 covers the first km, +Rs.50/km after. */
    private double minDeliveryFee(Double deliveryLat, Double deliveryLng) {
        if (deliveryLat == null || deliveryLng == null) return 100.0;
        double km = haversine(RESTAURANT_LAT, RESTAURANT_LNG, deliveryLat, deliveryLng);
        if (km <= 1) return 100.0;
        return 100.0 + Math.ceil(km - 1) * 50.0;
    }

    /** Haversine formula — returns distance in km between two GPS coordinates. */
    private double haversine(double lat1, double lon1, double lat2, double lon2) {
        final double R = 6371.0;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    private OrderItemEntity buildOrderItem(OrderItemRequest req) {
        FoodEntity food = foodRepository.findById(req.getFoodId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Food not found: " + req.getFoodId()));
        // Guards against a stale cart page (or a raw API call) ordering an item the
        // admin has since paused — the customer UI already hides the Add button for
        // these, this is the server-side backstop.
        if (Boolean.FALSE.equals(food.getAvailable())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, food.getName() + " is currently out of stock.");
        }
        // Price is always resolved server-side, never trusted from the client — for a
        // selected portion, look it up in this food's own portion list rather than
        // accepting a client-supplied price (which could be tampered with).
        double resolvedPrice = food.getPrice();
        String portionName = null;
        String requestedPortion = req.getPortionName();
        if (requestedPortion != null && !requestedPortion.isBlank()) {
            FoodPortion portion = (food.getPortions() == null ? List.<FoodPortion>of() : food.getPortions()).stream()
                    .filter(p -> requestedPortion.equals(p.getName()))
                    .findFirst()
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "Portion \"" + requestedPortion + "\" is no longer available for " + food.getName() + "."));
            resolvedPrice = portion.getPrice();
            portionName = requestedPortion;
        }
        return OrderItemEntity.builder()
                .foodId(food.getId())
                .foodName(food.getName())
                .foodImageUrl(food.getImageUrl())
                .price(resolvedPrice)
                .quantity(req.getQuantity())
                .portionName(portionName)
                .spiceLevel(req.getSpiceLevel())
                .ingredientsToAvoid(req.getIngredientsToAvoid())
                .customOptions(req.getCustomOptions())
                .build();
    }

    /**
     * Batch-fetches the users and payment records needed for a whole list of orders in
     * two queries total, instead of the ~1+3N queries the naive per-order lookups would
     * cost — same output as calling toResponse(order) on each, just without the N+1.
     */
    private List<OrderResponse> toResponseList(List<OrderEntity> orders) {
        if (orders.isEmpty()) return List.of();

        Set<String> userIds = new HashSet<>();
        for (OrderEntity o : orders) {
            if (o.getUserId() != null) userIds.add(o.getUserId());
            if (o.getDeliveryPersonId() != null) userIds.add(o.getDeliveryPersonId());
        }
        Map<String, UserEntity> usersById = new HashMap<>();
        for (UserEntity u : userRepository.findAllById(userIds)) {
            usersById.put(u.getId(), u);
        }

        List<String> orderIds = orders.stream().map(OrderEntity::getId).collect(Collectors.toList());
        Map<String, String> payherePaymentIdByOrderId = new HashMap<>();
        for (var p : paymentRepository.findByOrderIdIn(orderIds)) {
            payherePaymentIdByOrderId.put(p.getOrderId(), p.getPayherePaymentId());
        }

        return orders.stream()
                .map(order -> buildResponse(order,
                        usersById.get(order.getUserId()),
                        order.getDeliveryPersonId() != null ? usersById.get(order.getDeliveryPersonId()) : null,
                        payherePaymentIdByOrderId.get(order.getId())))
                .collect(Collectors.toList());
    }

    private OrderResponse toResponse(OrderEntity order) {
        UserEntity user = userRepository.findById(order.getUserId()).orElse(null);
        String payherePaymentId = paymentRepository.findByOrderId(order.getId())
                .map(p -> p.getPayherePaymentId()).orElse(null);
        UserEntity rider = (order.getDeliveryPersonId() != null)
                ? userRepository.findById(order.getDeliveryPersonId()).orElse(null) : null;
        return buildResponse(order, user, rider, payherePaymentId);
    }

    private OrderResponse buildResponse(OrderEntity order, UserEntity user, UserEntity rider, String payherePaymentId) {
        String userName = user != null ? user.getName() : "Unknown";
        String userEmail = user != null ? user.getEmail() : null;

        String deliveryPersonName   = rider != null ? rider.getName()    : null;
        String deliveryPersonPhone  = rider != null ? rider.getPhone()   : null;
        String deliveryPersonPicture = rider != null ? rider.getPicture() : null;
        boolean deliveryPersonOnline = rider != null && rider.isOnline();

        List<OrderItemResponse> itemResponses = (order.getItems() == null ? List.<OrderItemEntity>of() : order.getItems()).stream()
                .map(i -> OrderItemResponse.builder()
                        .foodId(i.getFoodId())
                        .foodName(i.getFoodName())
                        .foodImageUrl(i.getFoodImageUrl())
                        .price(i.getPrice())
                        .quantity(i.getQuantity())
                        .portionName(i.getPortionName())
                        .spiceLevel(i.getSpiceLevel())
                        .ingredientsToAvoid(i.getIngredientsToAvoid())
                        .customOptions(i.getCustomOptions())
                        .build())
                .collect(Collectors.toList());

        return OrderResponse.builder()
                .id(order.getId())
                .displayId(order.getDisplayId() != null ? order.getDisplayId() : "#" + order.getId().substring(order.getId().length() - 6).toUpperCase())
                .userId(order.getUserId())
                .userName(userName)
                .userEmail(userEmail)
                .items(itemResponses)
                .orderType(order.getOrderType())
                .deliveryAddress(order.getDeliveryAddress())
                .restaurantLat(order.getRestaurantLat() != null ? order.getRestaurantLat() : RESTAURANT_LAT)
                .restaurantLng(order.getRestaurantLng() != null ? order.getRestaurantLng() : RESTAURANT_LNG)
                .deliveryLat(order.getDeliveryLat())
                .deliveryLng(order.getDeliveryLng())
                .mobileNumber(order.getMobileNumber())
                .deliveryPersonId(order.getDeliveryPersonId())
                .deliveryPersonName(deliveryPersonName)
                .deliveryPersonPhone(deliveryPersonPhone)
                .deliveryPersonPicture(deliveryPersonPicture)
                .deliveryPersonOnline(deliveryPersonOnline)
                .deliveryPersonCurrentLat(order.getDeliveryPersonCurrentLat())
                .deliveryPersonCurrentLng(order.getDeliveryPersonCurrentLng())
                .subtotal(order.getSubtotal())
                .deliveryFee(order.getDeliveryFee())
                .total(order.getTotal())
                .status(order.getStatus())
                .cancelReason(order.getCancelReason())
                .cancelledBy(order.getCancelledBy())
                .paymentStatus(order.getPaymentStatus())
                .payherePaymentId(payherePaymentId)
                .refundStatus(order.getRefundStatus())
                .refundNotes(order.getRefundNotes())
                .refundBankName(order.getRefundBankName())
                .refundBankBranch(order.getRefundBankBranch())
                .refundAccountNumber(order.getRefundAccountNumber())
                .refundAccountHolderName(order.getRefundAccountHolderName())
                .refundReceiptUrl(order.getRefundReceiptUrl())
                .paymentTime(order.getPaymentTime())
                .cancelableUntil(order.getCancelableUntil())
                .createdAt(order.getCreatedAt())
                .updatedAt(order.getUpdatedAt())
                .deliveredAt(order.getDeliveredAt())
                .outForDeliveryAt(order.getOutForDeliveryAt())
                .cancelledAt(order.getCancelledAt())
                .refundedAt(order.getRefundedAt())
                .build();
    }
}
