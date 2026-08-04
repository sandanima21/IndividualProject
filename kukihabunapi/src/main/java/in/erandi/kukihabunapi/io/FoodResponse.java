package in.erandi.kukihabunapi.io;

import in.erandi.kukihabunapi.entity.CustomizationOptions;
import in.erandi.kukihabunapi.entity.FoodPortion;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class FoodResponse {
    private String id;
    private String name;
    private String description;
    private String imageUrl;
    private double price;
    private String category;
    private CustomizationOptions customizationOptions;
    private List<FoodPortion> portions;
    private boolean available;
}
