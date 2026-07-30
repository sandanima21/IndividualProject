package in.erandi.kukihabunapi.repository;

import in.erandi.kukihabunapi.entity.CategoryEntity;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface CategoryRepository extends MongoRepository<CategoryEntity, String> {
    Optional<CategoryEntity> findByNameIgnoreCase(String name);
    List<CategoryEntity> findAllByOrderByCreatedAtAsc();
}
