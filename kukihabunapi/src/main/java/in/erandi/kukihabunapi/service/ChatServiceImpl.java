package in.erandi.kukihabunapi.service;

import in.erandi.kukihabunapi.entity.MessageEntity;
import in.erandi.kukihabunapi.entity.UserEntity;
import in.erandi.kukihabunapi.io.ConversationSummary;
import in.erandi.kukihabunapi.io.MessageResponse;
import in.erandi.kukihabunapi.repository.MessageRepository;
import in.erandi.kukihabunapi.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class ChatServiceImpl implements ChatService {

    private final MessageRepository messageRepository;
    private final UserRepository userRepository;

    public ChatServiceImpl(MessageRepository messageRepository, UserRepository userRepository) {
        this.messageRepository = messageRepository;
        this.userRepository = userRepository;
    }

    @Override
    public MessageResponse sendMessage(String senderId, String senderName, String senderRole, String conversationId, String content, String imageUrl) {
        MessageEntity message = MessageEntity.builder()
                .conversationId(conversationId)
                .senderId(senderId)
                .senderName(senderName)
                .senderRole(senderRole)
                .content(content)
                .imageUrl(imageUrl)
                .build();
        return toResponse(messageRepository.save(message));
    }

    @Override
    public List<MessageResponse> getMessages(String conversationId) {
        return messageRepository.findByConversationIdOrderByCreatedAtAsc(conversationId)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Override
    public List<ConversationSummary> getAllConversations() {
        List<MessageEntity> allMessages = messageRepository.findAllByOrderByCreatedAtDesc();

        Map<String, List<MessageEntity>> grouped = allMessages.stream()
                .collect(Collectors.groupingBy(MessageEntity::getConversationId));

        return grouped.entrySet().stream()
                .map(entry -> {
                    String conversationId = entry.getKey();
                    List<MessageEntity> messages = entry.getValue();
                    MessageEntity latest = messages.stream()
                            .max(Comparator.comparing(MessageEntity::getCreatedAt))
                            .orElse(messages.get(0));
                    long unread = messages.stream()
                            .filter(m -> !m.isRead() && "CUSTOMER".equals(m.getSenderRole()))
                            .count();
                    String customerName = userRepository.findById(conversationId)
                            .map(UserEntity::getName).orElse("Customer");
                    String preview = latest.getContent() != null ? latest.getContent()
                            : latest.getImageUrl() != null ? "📷 Image" : "";
                    return ConversationSummary.builder()
                            .conversationId(conversationId)
                            .customerName(customerName)
                            .lastMessage(preview)
                            .lastMessageAt(latest.getCreatedAt())
                            .unreadCount(unread)
                            .build();
                })
                .sorted(Comparator.comparing(ConversationSummary::getLastMessageAt).reversed())
                .collect(Collectors.toList());
    }

    @Override
    public void markConversationRead(String conversationId) {
        List<MessageEntity> unread = messageRepository
                .findByConversationIdAndSenderRoleAndReadFalse(conversationId, "CUSTOMER");
        if (unread.isEmpty()) return;
        unread.forEach(m -> m.setRead(true));
        messageRepository.saveAll(unread);
    }

    private MessageResponse toResponse(MessageEntity m) {
        return MessageResponse.builder()
                .id(m.getId())
                .conversationId(m.getConversationId())
                .senderId(m.getSenderId())
                .senderName(m.getSenderName())
                .senderRole(m.getSenderRole())
                .content(m.getContent())
                .imageUrl(m.getImageUrl())
                .read(m.isRead())
                .createdAt(m.getCreatedAt())
                .build();
    }
}
