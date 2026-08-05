package in.erandi.kukihabunapi.repository;

import in.erandi.kukihabunapi.entity.UserEntity;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface UserRepository extends MongoRepository<UserEntity, String> {
    Optional<UserEntity> findByGoogleId(String googleId);
    // findFirst avoids IncorrectResultSizeDataAccessException when duplicates exist in the DB
    Optional<UserEntity> findFirstByEmail(String email);
    // findFirst avoids IncorrectResultSizeDataAccessException when duplicates exist in the DB
    Optional<UserEntity> findFirstByUsername(String username);
    // findFirst avoids IncorrectResultSizeDataAccessException — phone had no uniqueness check
    // until now, so duplicates may already exist in the DB from before this was enforced.
    Optional<UserEntity> findFirstByPhone(String phone);
    java.util.List<UserEntity> findByRole(String role);
}
