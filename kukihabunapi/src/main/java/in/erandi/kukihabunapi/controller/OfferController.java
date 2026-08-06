package in.erandi.kukihabunapi.controller;

import in.erandi.kukihabunapi.config.JwtUtil;
import in.erandi.kukihabunapi.entity.OfferEntity;
import in.erandi.kukihabunapi.entity.OrderEntity;
import in.erandi.kukihabunapi.repository.OfferRepository;
import in.erandi.kukihabunapi.repository.UserRepository;
import in.erandi.kukihabunapi.service.FirebaseStorageService;
import in.erandi.kukihabunapi.service.OrderGuard;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/offers")
@RequiredArgsConstructor
public class OfferController {

    private final OfferRepository offerRepository;
    private final FirebaseStorageService storageService;
    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;
    private final OrderGuard orderGuard;

    /** True only if the Authorization header carries a valid JWT belonging to an ADMIN account. */
    private boolean isAdmin(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) return false;
        String token = authHeader.substring(7);
        if (!jwtUtil.validateToken(token)) return false;
        String userId = jwtUtil.extractUserId(token);
        return userRepository.findById(userId).map(u -> "ADMIN".equals(u.getRole())).orElse(false);
    }

    // Customer-facing: only currently active offers
    @GetMapping
    public List<OfferEntity> getActive() {
        LocalDateTime now = LocalDateTime.now();
        return offerRepository.findAll().stream()
                .filter(o -> (o.getStartDate() == null || !o.getStartDate().isAfter(now))
                          && (o.getEndDate()   == null || !o.getEndDate().isBefore(now)))
                .collect(Collectors.toList());
    }

    // Admin-facing: all offers regardless of dates
    @GetMapping("/all")
    public List<OfferEntity> getAll(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (!isAdmin(authHeader)) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin access required");
        return offerRepository.findAll();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public OfferEntity create(
            @RequestParam String title,
            @RequestParam String description,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(required = false) Double price,
            @RequestParam(required = false) MultipartFile file,
            @RequestHeader(value = "Authorization", required = false) String authHeader
    ) {
        if (!isAdmin(authHeader)) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin access required");
        String imageUrl = (file != null && !file.isEmpty()) ? storageService.upload(file, "offers") : null;
        return offerRepository.save(OfferEntity.builder()
                .title(title)
                .description(description)
                .startDate(startDate != null ? LocalDateTime.parse(startDate) : null)
                .endDate(endDate != null ? LocalDateTime.parse(endDate) : null)
                .price(price)
                .imageUrl(imageUrl)
                .build());
    }

    @PutMapping("/{id}")
    public OfferEntity update(
            @PathVariable String id,
            @RequestParam String title,
            @RequestParam String description,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(required = false) Double price,
            @RequestParam(required = false) MultipartFile file,
            @RequestHeader(value = "Authorization", required = false) String authHeader
    ) {
        if (!isAdmin(authHeader)) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin access required");
        OfferEntity offer = offerRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        offer.setTitle(title);
        offer.setDescription(description);
        offer.setStartDate(startDate != null ? LocalDateTime.parse(startDate) : null);
        offer.setEndDate(endDate != null ? LocalDateTime.parse(endDate) : null);
        offer.setPrice(price);
        if (file != null && !file.isEmpty()) {
            if (offer.getImageUrl() != null) storageService.delete(offer.getImageUrl());
            offer.setImageUrl(storageService.upload(file, "offers"));
        }
        return offerRepository.save(offer);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String id, @RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (!isAdmin(authHeader)) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin access required");
        OfferEntity offer = offerRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        assertOfferHasNoActiveOrders(id, offer.getTitle());
        if (offer.getImageUrl() != null) storageService.delete(offer.getImageUrl());
        offerRepository.deleteById(id);
    }

    // Mirrors FoodServiceImpl.assertFoodHasNoActiveOrders — an offer is placed on an order
    // as a regular line item whose foodId is the offer's own id (see OrderServiceImpl.placeOrder),
    // so the same items.foodId-based guard already finds it with no extra query needed.
    private void assertOfferHasNoActiveOrders(String offerId, String offerTitle) {
        List<OrderEntity> blocking = orderGuard.activeOrdersForFoodIds(List.of(offerId));
        if (!blocking.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "\"" + offerTitle + "\" is in " + orderGuard.statusPhrase(blocking) + ". Please complete or cancel those orders before deleting.");
        }
    }
}
