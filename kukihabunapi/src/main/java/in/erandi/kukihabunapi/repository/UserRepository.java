package in.erandi.kukihabunapi.repository;

import in.erandi.kukihabunapi.entity.UserEntity;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface UserRepository extends MongoRepository<UserEntity, String> {
    Optional<UserEntity> findByGoogleId(String googleId);
    // findFirst avoids IncorrectResultSizeDataAccessException when duplicates exist in the DB
    Optional<UserEntity> findFirstByEmail(String email);
    Optional<UserEntity> findByUsername(String username);
    java.util.List<UserEntity> findByRole(String role);
}
