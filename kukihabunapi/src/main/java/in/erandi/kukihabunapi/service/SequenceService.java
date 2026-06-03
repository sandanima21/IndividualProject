package in.erandi.kukihabunapi.service;

import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoOperations;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;
import in.erandi.kukihabunapi.entity.CounterEntity;

@Service
public class SequenceService {

    private final MongoOperations mongo;

    public SequenceService(MongoOperations mongo) {
        this.mongo = mongo;
    }

    public String nextOrderId() {
        CounterEntity counter = mongo.findAndModify(
                Query.query(Criteria.where("_id").is("order_seq")),
                new Update().inc("seq", 1),
                FindAndModifyOptions.options().returnNew(true).upsert(true),
                CounterEntity.class
        );
        long seq = counter != null ? counter.getSeq() : 1;
        return String.format("ORD%03d", seq);
    }
}
