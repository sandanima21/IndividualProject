package in.erandi.kukihabunapi.controller;


import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import in.erandi.kukihabunapi.config.JwtUtil;
import in.erandi.kukihabunapi.io.FoodRequest;
import in.erandi.kukihabunapi.io.FoodResponse;
import in.erandi.kukihabunapi.repository.UserRepository;
import in.erandi.kukihabunapi.service.FoodService;
import lombok.AllArgsConstructor;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;


@RestController
@RequestMapping("/api/foods")
@AllArgsConstructor

public class FoodController {

    private FoodService foodService;
    private JwtUtil jwtUtil;
    private UserRepository userRepository;

    /** True only if the Authorization header carries a valid JWT belonging to an ADMIN account. */
    private boolean isAdmin(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) return false;
        String token = authHeader.substring(7);
        if (!jwtUtil.validateToken(token)) return false;
        String userId = jwtUtil.extractUserId(token);
        return userRepository.findById(userId).map(u -> "ADMIN".equals(u.getRole())).orElse(false);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public FoodResponse addFood(@RequestPart("food") String foodString,
                                @RequestPart("file")MultipartFile file,
                                @RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (!isAdmin(authHeader)) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin access required");
        ObjectMapper objectMapper = new ObjectMapper();
        FoodRequest request = null;
        try {
            request = objectMapper.readValue(foodString, FoodRequest.class);
        } catch (JsonProcessingException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid JSON format");
        }
        FoodResponse response = foodService.addFood(request, file);
        return response;
    }

    @GetMapping
    public List<FoodResponse> readFoods(){

        return foodService.readFoods();
    }

    @GetMapping("/{id}")
    public FoodResponse readFood(@PathVariable String id){
        return foodService.readFood(id);
    }

    @PutMapping("/{id}")
    public FoodResponse updateFood(@PathVariable String id,
                                   @RequestPart("food") String foodString,
                                   @RequestPart(value = "file", required = false) MultipartFile file,
                                   @RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (!isAdmin(authHeader)) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin access required");
        ObjectMapper objectMapper = new ObjectMapper();
        FoodRequest request;
        try {
            request = objectMapper.readValue(foodString, FoodRequest.class);
        } catch (JsonProcessingException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid JSON format");
        }
        return foodService.updateFood(id, request, file);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteFood(@PathVariable String id, @RequestHeader(value = "Authorization", required = false) String authHeader){
        if (!isAdmin(authHeader)) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin access required");
        foodService.deleteFood(id);
    }

    // Pause/resume a food item (e.g. temporarily out of stock) without deleting it.
    @PatchMapping("/{id}/availability")
    public FoodResponse setAvailability(@PathVariable String id,
                                        @RequestBody Map<String, Boolean> body,
                                        @RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (!isAdmin(authHeader)) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin access required");
        Boolean available = body.get("available");
        if (available == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "'available' is required");
        return foodService.setAvailability(id, available);
    }

}

