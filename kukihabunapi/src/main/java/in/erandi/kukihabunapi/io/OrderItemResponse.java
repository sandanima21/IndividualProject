package in.erandi.kukihabunapi.io;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderItemResponse {
    private String foodId;
    private String foodName;
    private String foodImageUrl;
    private double price;
    private int quantity;
    private String spiceLevel;
    private List<String> ingredientsToAvoid;
    private Map<String, String> customOptions;
}
