package in.erandi.kukihabunapi.service;

import in.erandi.kukihabunapi.entity.FoodEntity;
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
import in.erandi.kukihabunapi.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class OrderServiceImpl implements OrderService {

    private final OrderRepository orderRepository;
    private final FoodRepository foodRepository;
    private final UserRepository userRepository;
    private final OfferRepository offerRepository;
    private final SequenceService sequenceService;

    public OrderServiceImpl(OrderRepository orderRepository, FoodRepository foodRepository,
                            UserRepository userRepository, OfferRepository offerRepository,
                            SequenceService sequenceService) {
        this.orderRepository = orderRepository;
        this.foodRepository = foodRepository;
        this.userRepository = userRepository;
        this.offerRepository = offerRepository;
        this.sequenceService = sequenceService;
    }

    private static final double RESTAURANT_LAT = 6.844176631120501;
    private static final double RESTAURANT_LNG = 80.03913846950536;

    @Override
    public OrderResponse placeOrder(String userId, OrderRequest request) {
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
        return orderRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Override
    public List<OrderResponse> getAllOrders() {
        return orderRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .filter(o -> !"PENDING".equals(o.getStatus()))
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    public OrderResponse updateOrderStatus(String orderId, String status) {
        OrderEntity order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found"));
        order.setStatus(status);
        order.setUpdatedAt(LocalDateTime.now());

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
    public void cancelPending(String orderId, String userId) {
        orderRepository.findById(orderId).ifPresent(order -> {
            if ("UNPAID".equals(order.getPaymentStatus()) && "PENDING".equals(order.getStatus())) {
                orderRepository.deleteById(orderId);
            }
        });
    }

    private OrderItemEntity buildOrderItem(OrderItemRequest req) {
        FoodEntity food = foodRepository.findById(req.getFoodId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Food not found: " + req.getFoodId()));
        return OrderItemEntity.builder()
                .foodId(food.getId())
                .foodName(food.getName())
                .foodImageUrl(food.getImageUrl())
                .price(food.getPrice())
                .quantity(req.getQuantity())
                .spiceLevel(req.getSpiceLevel())
                .ingredientsToAvoid(req.getIngredientsToAvoid())
                .customOptions(req.getCustomOptions())
                .build();
    }

    private OrderResponse toResponse(OrderEntity order) {
        UserEntity user = userRepository.findById(order.getUserId()).orElse(null);
        String userName = user != null ? user.getName() : "Unknown";
        String userEmail = user != null ? user.getEmail() : null;

        UserEntity rider = (order.getDeliveryPersonId() != null)
                ? userRepository.findById(order.getDeliveryPersonId()).orElse(null) : null;
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
                .paymentStatus(order.getPaymentStatus())
                .paymentTime(order.getPaymentTime())
                .cancelableUntil(order.getCancelableUntil())
                .createdAt(order.getCreatedAt())
                .updatedAt(order.getUpdatedAt())
                .build();
    }
}
