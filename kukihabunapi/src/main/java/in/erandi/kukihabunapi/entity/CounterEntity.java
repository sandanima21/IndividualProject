package in.erandi.kukihabunapi.entity;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Document(collection = "counters")
public class CounterEntity {
    @Id
    private String id;
    private long seq;
}
