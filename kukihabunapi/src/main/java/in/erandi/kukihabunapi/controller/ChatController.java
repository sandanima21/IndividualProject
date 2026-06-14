package in.erandi.kukihabunapi.controller;

import in.erandi.kukihabunapi.config.JwtUtil;
import in.erandi.kukihabunapi.io.ConversationSummary;
import in.erandi.kukihabunapi.io.MessageRequest;
import in.erandi.kukihabunapi.io.MessageResponse;
import in.erandi.kukihabunapi.repository.UserRepository;
import in.erandi.kukihabunapi.service.ChatService;
import in.erandi.kukihabunapi.service.FoodService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/chat")
public class ChatController {

    private final ChatService chatService;
    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final FoodService foodService;

    public ChatController(ChatService chatService, JwtUtil jwtUtil,
                          UserRepository userRepository, SimpMessagingTemplate messagingTemplate,
                          FoodService foodService) {
        this.chatService = chatService;
        this.jwtUtil = jwtUtil;
        this.userRepository = userRepository;
        this.messagingTemplate = messagingTemplate;
        this.foodService = foodService;
    }

    @PostMapping("/send")
    public ResponseEntity<MessageResponse> sendMessage(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody MessageRequest request) {
        String userId = extractUserId(authHeader);
        if (userId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        String senderName = userRepository.findById(userId)
                .map(u -> u.getName()).orElse("Customer");

        MessageResponse message = chatService.sendMessage(userId, senderName, "CUSTOMER", userId, request.getContent(), null);

        messagingTemplate.convertAndSend("/topic/owner-inbox", message);
        messagingTemplate.convertAndSend("/queue/chat/" + userId, message);

        return ResponseEntity.ok(message);
    }

    @PostMapping(value = "/send-image", consumes = "multipart/form-data")
    public ResponseEntity<MessageResponse> sendMessageWithImage(
            @RequestHeader("Authorization") String authHeader,
            @RequestPart(value = "file") MultipartFile file,
            @RequestPart(value = "content", required = false) String content) {
        String userId = extractUserId(authHeader);
        if (userId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        String senderName = userRepository.findById(userId)
                .map(u -> u.getName()).orElse("Customer");

        String imageUrl = foodService.uploadFile(file);
        MessageResponse message = chatService.sendMessage(userId, senderName, "CUSTOMER", userId, content, imageUrl);

        messagingTemplate.convertAndSend("/topic/owner-inbox", message);
        messagingTemplate.convertAndSend("/queue/chat/" + userId, message);

        return ResponseEntity.ok(message);
    }

    @PostMapping("/reply")
    public ResponseEntity<MessageResponse> replyMessage(
            @RequestBody Map<String, String> body) {
        String conversationId = body.get("conversationId");
        String content = body.get("content");

        MessageResponse message = chatService.sendMessage("OWNER", "Shop Owner", "OWNER", conversationId, content, null);

        messagingTemplate.convertAndSend("/queue/chat/" + conversationId, message);
        messagingTemplate.convertAndSend("/topic/owner-inbox", message);

        return ResponseEntity.ok(message);
    }

    @PostMapping(value = "/reply-image", consumes = "multipart/form-data")
    public ResponseEntity<MessageResponse> replyWithImage(
            @RequestPart("conversationId") String conversationId,
            @RequestPart(value = "file") MultipartFile file,
            @RequestPart(value = "content", required = false) String content) {

        String imageUrl = foodService.uploadFile(file);
        MessageResponse message = chatService.sendMessage("OWNER", "Shop Owner", "OWNER", conversationId, content, imageUrl);

        messagingTemplate.convertAndSend("/queue/chat/" + conversationId, message);
        messagingTemplate.convertAndSend("/topic/owner-inbox", message);

        return ResponseEntity.ok(message);
    }

    @GetMapping("/{conversationId}")
    public ResponseEntity<List<MessageResponse>> getMessages(
            @PathVariable String conversationId,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        return ResponseEntity.ok(chatService.getMessages(conversationId));
    }

    @GetMapping("/conversations")
    public ResponseEntity<List<ConversationSummary>> getConversations() {
        return ResponseEntity.ok(chatService.getAllConversations());
    }

    @PatchMapping("/{conversationId}/read")
    public ResponseEntity<Void> markAsRead(@PathVariable String conversationId) {
        chatService.markConversationRead(conversationId);
        return ResponseEntity.ok().build();
    }

    private String extractUserId(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) return null;
        String token = authHeader.substring(7);
        if (!jwtUtil.validateToken(token)) return null;
        return jwtUtil.extractUserId(token);
    }
}
