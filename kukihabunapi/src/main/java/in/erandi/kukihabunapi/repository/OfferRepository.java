package in.erandi.kukihabunapi.repository;

import in.erandi.kukihabunapi.entity.OfferEntity;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface OfferRepository extends MongoRepository<OfferEntity, String> {
}
