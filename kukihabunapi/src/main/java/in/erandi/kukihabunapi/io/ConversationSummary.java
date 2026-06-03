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
public class ConversationSummary {
    private String conversationId;
    private String customerName;
    private String lastMessage;
    private LocalDateTime lastMessageAt;
    private long unreadCount;
}
