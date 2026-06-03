package in.erandi.kukihabunapi.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CustomizationOptions {
    private List<String> spiceLevels;
    private List<String> ingredientsToAvoid;
    private List<CustomizableIngredient> customizables;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CustomizableIngredient {
        private String thing;
        private List<String> options;
    }
}
