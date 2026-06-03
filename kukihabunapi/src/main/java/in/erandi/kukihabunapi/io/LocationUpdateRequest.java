package in.erandi.kukihabunapi.io;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LocationUpdateRequest {
    private String orderId;
    private double latitude;
    private double longitude;
}
