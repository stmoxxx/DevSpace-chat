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

    // Send a WebSocket notification to a specific user
    public void sendNotification(String userId, Notification notification) {
        log.info("Sending WS notification to {} with payload {}", userId, notification);

        // Convert and send the notification to the user via WebSocket
        messagingTemplate.convertAndSendToUser(
                userId,
                "/chat",
                notification);
    }
}
