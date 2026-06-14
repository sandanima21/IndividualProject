package in.erandi.kukihabunapi.controller;

import in.erandi.kukihabunapi.config.JwtUtil;
import in.erandi.kukihabunapi.entity.OrderEntity;
import in.erandi.kukihabunapi.io.OrderResponse;
import in.erandi.kukihabunapi.repository.OrderRepository;
import in.erandi.kukihabunapi.repository.UserRepository;
import in.erandi.kukihabunapi.service.OrderService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/delivery")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5174", "http://localhost:3000"})
public class DeliveryController {

    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final OrderService orderService;
    private final SimpMessagingTemplate messagingTemplate;
    private final JwtUtil jwtUtil;

    public DeliveryController(OrderRepository orderRepository, UserRepository userRepository,
                              OrderService orderService,
                              SimpMessagingTemplate messagingTemplate, JwtUtil jwtUtil) {
        this.orderRepository = orderRepository;
        this.userRepository = userRepository;
        this.orderService = orderService;
        this.messagingTemplate = messagingTemplate;
        this.jwtUtil = jwtUtil;
    }

    // All delivery-type orders (admin overview)
    @GetMapping("/orders")
    public ResponseEntity<List<OrderResponse>> getDeliveryOrders() {
        List<OrderResponse> orders = orderService.getAllOrders().stream()
                .filter(o -> "delivery".equalsIgnoreCase(o.getOrderType()))
                .collect(Collectors.toList());
        return ResponseEntity.ok(orders);
    }

    // READY + PAID + unassigned orders available for riders to pick up
    @GetMapping("/orders/available")
    public ResponseEntity<List<OrderResponse>> getAvailableOrders() {
        List<OrderResponse> orders = orderService.getAllOrders().stream()
                .filter(o -> "READY".equals(o.getStatus()))
                .filter(o -> "PAID".equals(o.getPaymentStatus()))
                .filter(o -> o.getDeliveryPersonId() == null)
                .filter(o -> "delivery".equalsIgnoreCase(o.getOrderType()))
                .collect(Collectors.toList());
        return ResponseEntity.ok(orders);
    }

    // Today's orders assigned to the calling rider
    @GetMapping("/orders/today")
    public ResponseEntity<List<OrderResponse>> getTodayOrders(
            @RequestHeader("Authorization") String authHeader) {
        String riderId = extractUserId(authHeader);
        if (riderId == null) return ResponseEntity.status(401).build();

        LocalDateTime dayStart = LocalDate.now().atStartOfDay();
        List<OrderResponse> orders = orderService.getAllOrders().stream()
                .filter(o -> "delivery".equalsIgnoreCase(o.getOrderType()))
                .filter(o -> riderId.equals(o.getDeliveryPersonId()))
                // Active deliveries always show regardless of creation date.
                // Completed orders use updatedAt (delivery time) for the day boundary — not createdAt —
                // so an order placed yesterday but delivered today still appears in today's history.
                .filter(o -> {
                    if ("OUT_FOR_DELIVERY".equals(o.getStatus())) return true;
                    LocalDateTime ref = o.getUpdatedAt() != null ? o.getUpdatedAt() : o.getCreatedAt();
                    return ref != null && !ref.isBefore(dayStart);
                })
                .collect(Collectors.toList());
        return ResponseEntity.ok(orders);
    }

    // Rider accepts an available order → assigns self, status → OUT_FOR_DELIVERY
    @PostMapping("/orders/{orderId}/accept")
    public ResponseEntity<OrderResponse> acceptOrder(
            @PathVariable String orderId,
            @RequestHeader("Authorization") String authHeader) {
        String riderId = extractUserId(authHeader);
        if (riderId == null) return ResponseEntity.status(401).build();

        OrderEntity order = orderRepository.findById(orderId).orElse(null);
        if (order == null) return ResponseEntity.notFound().build();
        if (!"READY".equals(order.getStatus())) return ResponseEntity.badRequest().build();
        if (order.getDeliveryPersonId() != null)
            return ResponseEntity.status(HttpStatus.CONFLICT).build(); // race — already taken

        order.setDeliveryPersonId(riderId);
        order.setStatus("OUT_FOR_DELIVERY");
        order.setUpdatedAt(LocalDateTime.now());
        orderRepository.save(order);

        userRepository.findById(riderId).ifPresent(rider -> {
            rider.setOnline(true);
            rider.setLastSeen(LocalDateTime.now());
            userRepository.save(rider);
        });

        Map<String, Object> event = new HashMap<>();
        event.put("orderId", orderId);
        event.put("status", "OUT_FOR_DELIVERY");
        messagingTemplate.convertAndSend("/topic/order/" + orderId, (Object) event);

        return ResponseEntity.ok(orderService.updateOrderStatus(orderId, "OUT_FOR_DELIVERY"));
    }

    // Rider marks order as DELIVERED (preferred over /complete for new clients)
    @PostMapping("/orders/{orderId}/delivered")
    public ResponseEntity<OrderResponse> markDelivered(
            @PathVariable String orderId,
            @RequestHeader("Authorization") String authHeader) {
        String riderId = extractUserId(authHeader);
        if (riderId == null) return ResponseEntity.status(401).build();

        OrderEntity order = orderRepository.findById(orderId).orElse(null);
        if (order == null) return ResponseEntity.notFound().build();
        if (!"OUT_FOR_DELIVERY".equals(order.getStatus())) return ResponseEntity.badRequest().build();
        if (!riderId.equals(order.getDeliveryPersonId())) return ResponseEntity.status(403).build();

        order.setStatus("DELIVERED");
        order.setUpdatedAt(LocalDateTime.now());
        orderRepository.save(order);

        Map<String, Object> event = new HashMap<>();
        event.put("orderId", orderId);
        event.put("status", "DELIVERED");
        messagingTemplate.convertAndSend("/topic/order/" + orderId, (Object) event);
        messagingTemplate.convertAndSend("/topic/order/" + orderId + "/tracking", (Object) event);

        return ResponseEntity.ok(orderService.updateOrderStatus(orderId, "DELIVERED"));
    }

    // Rider online/offline toggle
    @PutMapping("/rider/status")
    public ResponseEntity<Map<String, Object>> updateRiderStatus(
            @RequestBody Map<String, Boolean> body,
            @RequestHeader("Authorization") String authHeader) {
        String riderId = extractUserId(authHeader);
        if (riderId == null) return ResponseEntity.status(401).build();

        boolean online = Boolean.TRUE.equals(body.get("online"));
        return userRepository.findById(riderId)
                .map(rider -> {
                    rider.setOnline(online);
                    rider.setLastSeen(LocalDateTime.now());
                    userRepository.save(rider);
                    return ResponseEntity.ok(Map.<String, Object>of(
                            "online", online,
                            "message", online ? "You are now online." : "You are now offline."
                    ));
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    // Legacy: self-assign + start (kept for backward compat)
    @PutMapping("/orders/{orderId}/start")
    public ResponseEntity<OrderResponse> startDelivery(
            @PathVariable String orderId,
            @RequestHeader("Authorization") String authHeader) {
        return acceptOrder(orderId, authHeader);
    }

    // Legacy: mark delivered (kept for backward compat)
    @PutMapping("/orders/{orderId}/complete")
    public ResponseEntity<OrderResponse> completeDelivery(
            @PathVariable String orderId,
            @RequestHeader("Authorization") String authHeader) {
        return markDelivered(orderId, authHeader);
    }

    // Admin assigns a specific rider to an order
    @PutMapping("/orders/{orderId}/assign")
    public ResponseEntity<OrderResponse> assignDeliveryPerson(
            @PathVariable String orderId,
            @RequestBody Map<String, String> body) {
        String deliveryPersonId = body.get("deliveryPersonId");
        OrderEntity order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found: " + orderId));
        order.setDeliveryPersonId(deliveryPersonId);
        order.setUpdatedAt(LocalDateTime.now());
        orderRepository.save(order);
        return ResponseEntity.ok(orderService.updateOrderStatus(orderId, order.getStatus()));
    }

    // REST fallback: update GPS location (legacy path — prefer POST /api/tracking/location)
    @PutMapping("/orders/{orderId}/location")
    public ResponseEntity<Void> updateLocationRest(
            @PathVariable String orderId,
            @RequestBody Map<String, Double> body) {
        updateAndBroadcast(orderId, body.get("lat"), body.get("lng"));
        return ResponseEntity.ok().build();
    }

    // WebSocket: rider broadcasts location → all subscribers on order topic
    @MessageMapping("/delivery/{orderId}/location")
    public void updateLocationWs(
            @DestinationVariable String orderId,
            @Payload Map<String, Double> location) {
        updateAndBroadcast(orderId, location.get("lat"), location.get("lng"));
    }

    private void updateAndBroadcast(String orderId, Double lat, Double lng) {
        orderRepository.findById(orderId).ifPresent(order -> {
            order.setDeliveryPersonCurrentLat(lat);
            order.setDeliveryPersonCurrentLng(lng);
            order.setUpdatedAt(LocalDateTime.now());
            orderRepository.save(order);
        });
        Map<String, Object> payload = new HashMap<>();
        payload.put("type", "location");
        payload.put("lat", lat);
        payload.put("lng", lng);
        payload.put("orderId", orderId);
        messagingTemplate.convertAndSend("/topic/order/" + orderId, (Object) payload);
        messagingTemplate.convertAndSend("/topic/order/" + orderId + "/tracking", (Object) payload);
    }

    private String extractUserId(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) return null;
        try {
            return jwtUtil.extractUserId(authHeader.substring(7));
        } catch (Exception e) {
            return null;
        }
    }
}
