package in.erandi.kukihabunapi.io;

import lombok.Data;

@Data
public class MessageRequest {
    private String conversationId;
    private String content;
}
