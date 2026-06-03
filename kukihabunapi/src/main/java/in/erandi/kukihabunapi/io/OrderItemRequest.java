package in.erandi.kukihabunapi.io;

import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
public class OrderItemRequest {
    private String foodId;
    private int quantity;
    private String spiceLevel;
    private List<String> ingredientsToAvoid;
    private Map<String, String> customOptions;
}
