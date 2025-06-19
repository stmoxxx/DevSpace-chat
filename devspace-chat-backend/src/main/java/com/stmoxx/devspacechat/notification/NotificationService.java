package com.stmoxx.devspacechat.notification;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final SimpMessagingTemplate messagingTemplate;

    // Wyślij powiadomienie WebSocket do określonego użytkownika
    public void sendNotification(String userId, Notification notification) {
        log.info("Sending WS notification to {} with payload {}", userId, notification);

        // Przekonwertuj i wyślij powiadomienie do użytkownika za pośrednictwem WebSocket
        messagingTemplate.convertAndSendToUser(
                userId,
                "/chat",
                notification);
    }
}

