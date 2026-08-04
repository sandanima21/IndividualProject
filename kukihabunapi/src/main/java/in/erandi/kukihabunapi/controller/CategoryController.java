package in.erandi.kukihabunapi.controller;

import in.erandi.kukihabunapi.config.JwtUtil;
import in.erandi.kukihabunapi.entity.CategoryEntity;
import in.erandi.kukihabunapi.repository.CategoryRepository;
import in.erandi.kukihabunapi.repository.UserRepository;
import in.erandi.kukihabunapi.service.FirebaseStorageService;
import in.erandi.kukihabunapi.service.FoodService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/categories")
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryRepository categoryRepository;
    private final FirebaseStorageService storageService;
    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;
    private final FoodService foodService;

    /** True only if the Authorization header carries a valid JWT belonging to an ADMIN account. */
    private boolean isAdmin(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) return false;
        String token = authHeader.substring(7);
        if (!jwtUtil.validateToken(token)) return false;
        String userId = jwtUtil.extractUserId(token);
        return userRepository.findById(userId).map(u -> "ADMIN".equals(u.getRole())).orElse(false);
    }

    @GetMapping
    public List<CategoryEntity> getAll() {
        return categoryRepository.findAllByOrderByCreatedAtAsc();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CategoryEntity create(
            @RequestParam String name,
            @RequestParam MultipartFile file,
            @RequestHeader(value = "Authorization", required = false) String authHeader
    ) {
        if (!isAdmin(authHeader)) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin access required");
        if (name == null || name.isBlank())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Category name is required");
        if (file == null || file.isEmpty())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Category image is required");
        if (categoryRepository.findByNameIgnoreCase(name.trim()).isPresent())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A category with this name already exists");

        String imageUrl = storageService.upload(file, "categories");
        return categoryRepository.save(CategoryEntity.builder()
                .name(name.trim())
                .imageUrl(imageUrl)
                .build());
    }

    @PutMapping("/{id}")
    public CategoryEntity update(
            @PathVariable String id,
            @RequestParam String name,
            @RequestParam(required = false) MultipartFile file,
            @RequestHeader(value = "Authorization", required = false) String authHeader
    ) {
        if (!isAdmin(authHeader)) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin access required");
        if (name == null || name.isBlank())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Category name is required");
        CategoryEntity category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        String oldName = category.getName();

        categoryRepository.findByNameIgnoreCase(name.trim()).ifPresent(existing -> {
            if (!existing.getId().equals(id))
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A category with this name already exists");
        });

        category.setName(name.trim());
        if (file != null && !file.isEmpty()) {
            if (category.getImageUrl() != null) storageService.delete(category.getImageUrl());
            category.setImageUrl(storageService.upload(file, "categories"));
        }
        CategoryEntity saved = categoryRepository.save(category);
        // Foods reference their category by name, not id — without this, a renamed
        // category would silently drift out of sync with the foods still tagged
        // under its old name (they'd disappear from that category's filter/listing).
        if (!oldName.equals(saved.getName())) {
            foodService.renameCategoryForFoods(oldName, saved.getName());
        }
        return saved;
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String id, @RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (!isAdmin(authHeader)) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin access required");
        CategoryEntity category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        // Cascade: any food still assigned to this category is deleted along with it —
        // foods reference their category by name, not id, so there'd be no other way
        // to find them once the category document is gone.
        foodService.deleteFoodsByCategory(category.getName());
        if (category.getImageUrl() != null) storageService.delete(category.getImageUrl());
        categoryRepository.deleteById(id);
    }
}
