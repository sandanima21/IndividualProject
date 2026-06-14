package in.erandi.kukihabunapi.service;

import in.erandi.kukihabunapi.io.ConversationSummary;
import in.erandi.kukihabunapi.io.MessageResponse;

import java.util.List;

public interface ChatService {
    MessageResponse sendMessage(String senderId, String senderName, String senderRole, String conversationId, String content, String imageUrl);
    List<MessageResponse> getMessages(String conversationId);
    List<ConversationSummary> getAllConversations();
    void markConversationRead(String conversationId);
}
