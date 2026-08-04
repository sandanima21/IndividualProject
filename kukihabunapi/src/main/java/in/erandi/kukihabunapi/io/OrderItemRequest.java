package in.erandi.kukihabunapi.io;

import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
public class OrderItemRequest {
    private String foodId;
    private int quantity;
    // Name of the selected FoodPortion, or null when the food has no portions / none
    // was selected. Never trust a client-supplied price for it — see buildOrderItem,
    // which re-resolves the price server-side from FoodEntity.portions by this name.
    private String portionName;
    private String spiceLevel;
    private List<String> ingredientsToAvoid;
    private Map<String, String> customOptions;
}
