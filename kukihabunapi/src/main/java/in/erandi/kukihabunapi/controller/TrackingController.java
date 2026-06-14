package in.erandi.kukihabunapi.controller;

import in.erandi.kukihabunapi.config.JwtUtil;
import in.erandi.kukihabunapi.entity.DeliveryTrackingEntity;
import in.erandi.kukihabunapi.entity.OrderEntity;
import in.erandi.kukihabunapi.entity.UserEntity;
import in.erandi.kukihabunapi.io.LocationUpdateRequest;
import in.erandi.kukihabunapi.io.TrackingResponse;
import in.erandi.kukihabunapi.repository.DeliveryTrackingRepository;
import in.erandi.kukihabunapi.repository.OrderRepository;
import in.erandi.kukihabunapi.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/tracking")
public class TrackingController {

    private final DeliveryTrackingRepository trackingRepository;
    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final JwtUtil jwtUtil;

    public TrackingController(DeliveryTrackingRepository trackingRepository,
                              OrderRepository orderRepository,
                              UserRepository userRepository,
                              SimpMessagingTemplate messagingTemplate,
                              JwtUtil jwtUtil) {
        this.trackingRepository = trackingRepository;
        this.orderRepository = orderRepository;
        this.userRepository = userRepository;
        this.messagingTemplate = messagingTemplate;
        this.jwtUtil = jwtUtil;
    }

    /**
     * POST /api/tracking/location
     *
     * Called by the rider's dashboard every 5 seconds via REST.
     * Persists a tracking point, updates order + rider documents,
     * calculates ETA using Haversine (assuming 30 km/h avg speed),
     * and broadcasts to both WebSocket topics.
     */
    @PostMapping("/location")
    public ResponseEntity<TrackingResponse> updateLocation(
            @RequestBody LocationUpdateRequest req,
            @RequestHeader("Authorization") String authHeader) {

        String riderId = extractUserId(authHeader);
        if (riderId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        OrderEntity order = orderRepository.findById(req.getOrderId()).orElse(null);
        if (order == null) return ResponseEntity.notFound().build();

        if (!riderId.equals(order.getDeliveryPersonId()))
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();

        if (!"OUT_FOR_DELIVERY".equals(order.getStatus()))
            return ResponseEntity.badRequest().build();

        LocalDateTime now = LocalDateTime.now();

        // Persist tracking point
        trackingRepository.save(DeliveryTrackingEntity.builder()
                .orderId(req.getOrderId())
                .deliveryPersonId(riderId)
                .latitude(req.getLatitude())
                .longitude(req.getLongitude())
                .timestamp(now)
                .build());

        // Update order's last-known rider position
        order.setDeliveryPersonCurrentLat(req.getLatitude());
        order.setDeliveryPersonCurrentLng(req.getLongitude());
        order.setUpdatedAt(now);
        orderRepository.save(order);

        // Update rider's live position in their user document
        userRepository.findById(riderId).ifPresent(rider -> {
            rider.setCurrentLatitude(req.getLatitude());
            rider.setCurrentLongitude(req.getLongitude());
            rider.setLastSeen(now);
            userRepository.save(rider);
        });

        // ETA: Haversine distance ÷ 30 km/h → minutes
        double distanceKm = 0;
        int etaMinutes = 0;
        if (order.getDeliveryLat() != null && order.getDeliveryLng() != null) {
            distanceKm = haversine(req.getLatitude(), req.getLongitude(),
                    order.getDeliveryLat(), order.getDeliveryLng());
            etaMinutes = (int) Math.ceil(distanceKm / 30.0 * 60);
        }

        UserEntity rider = userRepository.findById(riderId).orElse(null);
        String riderName    = rider != null ? rider.getName() : "Rider";
        boolean riderOnline = rider != null && rider.isOnline();

        TrackingResponse response = buildResponse(order, req.getLatitude(), req.getLongitude(),
                now, riderId, riderName, riderOnline, etaMinutes, distanceKm);

        // Broadcast to both topics (backward compat + new dedicated topic)
        Map<String, Object> payload = new HashMap<>();
        payload.put("type", "location");
        payload.put("lat", req.getLatitude());
        payload.put("lng", req.getLongitude());
        payload.put("orderId", req.getOrderId());
        payload.put("etaMinutes", etaMinutes);
        payload.put("distanceKm", response.getDistanceKm());
        payload.put("riderName", riderName);

        messagingTemplate.convertAndSend("/topic/order/" + req.getOrderId(), (Object) payload);
        messagingTemplate.convertAndSend("/topic/order/" + req.getOrderId() + "/tracking", (Object) payload);

        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/tracking/order/{orderId}
     *
     * Returns the latest tracking snapshot for an order, including ETA.
     * Used on page-load before WebSocket updates begin.
     */
    @GetMapping("/order/{orderId}")
    public ResponseEntity<TrackingResponse> getLatestTracking(@PathVariable String orderId) {
        OrderEntity order = orderRepository.findById(orderId).orElse(null);
        if (order == null) return ResponseEntity.notFound().build();

        // Latest persisted point (may be null if tracking not yet started)
        DeliveryTrackingEntity latest = trackingRepository
                .findTopByOrderIdOrderByTimestampDesc(orderId).orElse(null);

        double lat = latest != null ? latest.getLatitude()
                : (order.getDeliveryPersonCurrentLat() != null ? order.getDeliveryPersonCurrentLat() : 0);
        double lng = latest != null ? latest.getLongitude()
                : (order.getDeliveryPersonCurrentLng() != null ? order.getDeliveryPersonCurrentLng() : 0);

        double distanceKm = 0;
        int etaMinutes = 0;
        if (lat != 0 && order.getDeliveryLat() != null && order.getDeliveryLng() != null) {
            distanceKm = haversine(lat, lng, order.getDeliveryLat(), order.getDeliveryLng());
            etaMinutes = (int) Math.ceil(distanceKm / 30.0 * 60);
        }

        String riderId = order.getDeliveryPersonId();
        UserEntity rider = (riderId != null) ? userRepository.findById(riderId).orElse(null) : null;

        return ResponseEntity.ok(buildResponse(order, lat, lng,
                latest != null ? latest.getTimestamp() : null,
                riderId,
                rider != null ? rider.getName() : null,
                rider != null && rider.isOnline(),
                etaMinutes, distanceKm));
    }

    // ─── Helpers ────────────────────────────────────────────────────────────────

    private TrackingResponse buildResponse(OrderEntity order, double lat, double lng,
                                           LocalDateTime ts, String riderId, String riderName,
                                           boolean riderOnline, int etaMinutes, double distanceKm) {
        return TrackingResponse.builder()
                .orderId(order.getId())
                .deliveryPersonId(riderId)
                .deliveryPersonName(riderName)
                .riderOnline(riderOnline)
                .latitude(lat == 0 ? null : lat)
                .longitude(lng == 0 ? null : lng)
                .timestamp(ts)
                .orderStatus(order.getStatus())
                .etaMinutes(etaMinutes)
                .distanceKm(Math.round(distanceKm * 100.0) / 100.0)
                .restaurantLat(order.getRestaurantLat())
                .restaurantLng(order.getRestaurantLng())
                .deliveryLat(order.getDeliveryLat())
                .deliveryLng(order.getDeliveryLng())
                .deliveryAddress(order.getDeliveryAddress())
                .build();
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

    private String extractUserId(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) return null;
        String token = authHeader.substring(7);
        return jwtUtil.validateToken(token) ? jwtUtil.extractUserId(token) : null;
    }
}
