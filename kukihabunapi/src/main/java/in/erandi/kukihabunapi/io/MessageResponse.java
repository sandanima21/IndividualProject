package in.erandi.kukihabunapi.io;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MessageResponse {
    private String id;
    private String conversationId;
    private String senderId;
    private String senderName;
    private String senderRole;
    private String content;
    private String imageUrl;
    private boolean read;
    private LocalDateTime createdAt;
}
