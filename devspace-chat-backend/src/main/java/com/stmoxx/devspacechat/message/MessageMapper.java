package com.stmoxx.devspacechat.message;

import org.springframework.stereotype.Service;

import com.stmoxx.devspacechat.file.FileUtils;

@Service
public class MessageMapper {
    public MessageResponse toMessageResponse(Message message) {
        return MessageResponse.builder()
                .id(message.getId())
                .content(message.getContent())
                .senderId(message.getSenderId())
                .receiverId(message.getReceiverId())
                .type(message.getType())
                .state(message.getState())
                .createdAt(message.getCreatedDate())
                .media(FileUtils.readFileFromLocation(message.getMediaFilePath()))
                .build();
    }
}
