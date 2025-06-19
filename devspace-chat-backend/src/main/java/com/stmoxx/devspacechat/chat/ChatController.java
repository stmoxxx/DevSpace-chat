package com.stmoxx.devspacechat.chat;

import com.stmoxx.devspacechat.common.StringResponse;
import io.swagger.v3.oas.annotations.tags.Tag; // For OpenAPI documentation annotations
import lombok.RequiredArgsConstructor; // Lombok annotation to automatically generate a constructor
import org.springframework.http.ResponseEntity; // Spring class for HTTP responses
import org.springframework.security.core.Authentication; // Spring security Authentication class for user details
import org.springframework.web.bind.annotation.GetMapping; // Spring Web annotation for GET requests
import org.springframework.web.bind.annotation.PostMapping; // Spring Web annotation for POST requests
import org.springframework.web.bind.annotation.RequestMapping; // Spring Web annotation to map the controller
import org.springframework.web.bind.annotation.RequestParam; // Spring Web annotation to extract request parameters
import org.springframework.web.bind.annotation.RestController; // Spring annotation for RESTful web services

import java.util.List; // For list of chat responses

@RestController // Marks this class as a controller to handle HTTP requests
@RequestMapping("/api/v1/chats") // Defines the base URL for the chat API endpoints
@RequiredArgsConstructor // Automatically generates the constructor with required arguments (chatService
                         // in this case)
@Tag(name = "Chat") // Swagger annotation to categorize the controller under "Chat" in API
                    // documentation
public class ChatController {

    private final ChatService chatService;

    // Endpoint POST do utworzenia nowego czatu między nadawcą a odbiorcą
    @PostMapping
    public ResponseEntity<StringResponse> createChat(
            @RequestParam(name = "sender-id") String senderId, // Pobierz identyfikator nadawcy z żądania
            @RequestParam(name = "receiver-id") String receiverId) { // Pobierz identyfikator odbiorcy z żądania

        // Wywołaj usługę, aby utworzyć nowy czat i zwrócić identyfikator czatu.
        final String chatId = chatService.createChat(senderId, receiverId);


        StringResponse response = StringResponse.builder()
                .response(chatId)
                .build();
        return ResponseEntity.ok(response);
    }

    // Endpoint GET do pobierania czatów według odbiorcy (uwierzytelnionego użytkownika)
    @GetMapping
    public ResponseEntity<List<ChatResponse>> getChatsByReceiver(Authentication authentication) {
        // Use the authenticated user's details to retrieve their chats
        return ResponseEntity.ok(chatService.getChatsByReceiverId(authentication));
    }
}

