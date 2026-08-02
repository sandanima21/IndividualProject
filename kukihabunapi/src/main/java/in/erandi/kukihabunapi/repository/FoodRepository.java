package in.erandi.kukihabunapi.repository;

import in.erandi.kukihabunapi.entity.FoodEntity;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

//database access layer
public interface FoodRepository extends MongoRepository<FoodEntity, String> {
    List<FoodEntity> findByCategoryIgnoreCase(String category);
}
