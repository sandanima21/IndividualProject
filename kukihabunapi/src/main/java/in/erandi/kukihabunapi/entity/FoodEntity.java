package in.erandi.kukihabunapi.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Document(collection = "foods")
public class FoodEntity {
    @Id
    private String id;
    private String name;
    private String description;
    private double price;
    private String category;
    private String imageUrl;
    private CustomizationOptions customizationOptions;

    // Nullable on purpose: existing documents predate this field and have no
    // value for it at all. Treat null the same as true ("available") wherever
    // this is read — see FoodServiceImpl.convertToResponse — rather than using
    // a primitive boolean, which Spring Data would need to default correctly
    // for every pre-existing food the moment this field was added.
    private Boolean available;
}
