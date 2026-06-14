package in.erandi.kukihabunapi.repository;

import in.erandi.kukihabunapi.entity.MessageEntity;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface MessageRepository extends MongoRepository<MessageEntity, String> {
    List<MessageEntity> findByConversationIdOrderByCreatedAtAsc(String conversationId);
    List<MessageEntity> findAllByOrderByCreatedAtDesc();
    List<String> findDistinctConversationIdBy();
    List<MessageEntity> findByConversationIdAndSenderRoleAndReadFalse(String conversationId, String senderRole);
}
