import { AfterViewChecked, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ChatListComponent } from '../../components/chat-list/chat-list.component';
import { KeycloakService } from '../../utils/keycloak/keycloak.service';
import { ChatResponse } from '../../services/models/chat-response';
import { DatePipe } from '@angular/common';
import { MessageService } from '../../services/services/message.service';
import { MessageResponse } from '../../services/models/message-response';
import * as Stomp from 'stompjs';
import SockJS from 'sockjs-client';
import { FormsModule } from '@angular/forms';
import { MessageRequest } from '../../services/models/message-request';
import { Notification } from './models/notification';
import { ChatService } from '../../services/services/chat.service';
import { PickerComponent } from '@ctrl/ngx-emoji-mart';
import { EmojiData } from '@ctrl/ngx-emoji-mart/ngx-emoji';

@Component({
  selector: 'app-main',
  imports: [
    ChatListComponent,
    DatePipe,
    FormsModule,
    PickerComponent
  ],
  templateUrl: './main.component.html',
  styleUrl: './main.component.scss'
})
export class MainComponent implements OnInit, OnDestroy, AfterViewChecked {

  selectedChat: ChatResponse = {};
  chats: Array<ChatResponse> = [];
  chatMessages: Array<MessageResponse> = [];
  socketClient: any = null;
  messageContent: string = '';
  showEmojis = false;
  @ViewChild('scrollableDiv') scrollableDiv!: ElementRef<HTMLDivElement>;
  private notificationSubscription: any;

  constructor(
    private chatService: ChatService,
    private messageService: MessageService,
    private keycloakService: KeycloakService,
  ) { }

  ngAfterViewChecked(): void {
    this.scrollToBottom(); // Automatically scrolls to the bottom whenever view updates.
  }

  ngOnDestroy(): void {
    // Cleanly disconnect the WebSocket and unsubscribe to avoid memory leaks.
    if (this.socketClient !== null) {
      this.socketClient.disconnect();
      this.notificationSubscription.unsubscribe();
      this.socketClient = null;
    }
  }

  ngOnInit(): void {
    this.initWebSocket(); // Initialize WebSocket for receiving live chat notifications.
    this.getAllChats();   // Fetch list of all chats for the logged-in user.
  }

  chatSelected(chatResponse: ChatResponse) {
    this.selectedChat = chatResponse;
    this.getAllChatMessages(chatResponse.id as string); // Load all messages for the selected chat.
    this.setMessagesToSeen();                           // Mark messages in this chat as seen.
    this.selectedChat.unreadCount = 0;
  }

  isSelfMessage(message: MessageResponse): boolean {
    return message.senderId === this.keycloakService.userId; // Check if message was sent by current user.
  }

  sendMessage() {
    if (this.messageContent) {
      const messageRequest: MessageRequest = {
        chatId: this.selectedChat.id,
        senderId: this.getSenderId(),
        receiverId: this.getReceiverId(),
        content: this.messageContent,
        type: 'TEXT',
      };

      // Send message to server and optimistically update UI with new message.
      this.messageService.saveMessage({
        body: messageRequest
      }).subscribe({
        next: () => {
          const message: MessageResponse = {
            senderId: this.getSenderId(),
            receiverId: this.getReceiverId(),
            content: this.messageContent,
            type: 'TEXT',
            state: 'SENT',
            createdAt: new Date().toString()
          };
          this.selectedChat.lastMessage = this.messageContent;
          this.chatMessages.push(message);
          this.messageContent = '';
          this.showEmojis = false;
        }
      });
    }
  }

  keyDown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      this.sendMessage(); // Triggers sending the message on Enter key press.
    }
  }

  onSelectEmojis(emojiSelected: any) {
    const emoji: EmojiData = emojiSelected.emoji;
    this.messageContent += emoji.native; // Appends selected emoji's native character to message content.
  }

  onClick() {
    this.setMessagesToSeen(); // Marks current chat messages as seen when clicked (e.g., user focuses on chat area).
  }

  uploadMedia(target: EventTarget | null) {
    const file = this.extractFileFromTarget(target);
    if (file !== null) {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) {

          // Extract base64 content from the Data URL.
          const mediaLines = reader.result.toString().split(',')[1];

          // Uploads media file to backend, then constructs and adds an IMAGE message locally.
          this.messageService.uploadMedia({
            'chat-id': this.selectedChat.id as string,
            body: {
              file: file
            }
          }).subscribe({
            next: () => {
              const message: MessageResponse = {
                senderId: this.getSenderId(),
                receiverId: this.getReceiverId(),
                content: 'Attachment',
                type: 'IMAGE',
                state: 'SENT',
                media: [mediaLines], // Embeds the base64 string as media.
                createdAt: new Date().toString()
              };
              this.chatMessages.push(message); // Optimistically appends media message to chat list.
            }
          });
        }
      }
      reader.readAsDataURL(file); // Converts file to base64 string.
    }
  }

  logout() {
    this.keycloakService.logout(); // Triggers logout via Keycloak.
  }

  get userName() {
    return this.keycloakService.userName
  }

  get fullName() {
    return this.keycloakService.fullName
  }

  get email() {
    return this.keycloakService.email
  }

  private setMessagesToSeen() {
    // Sends request to mark all messages in the selected chat as 'seen'.
    this.messageService.setMessageToSeen({
      'chat-id': this.selectedChat.id as string
    }).subscribe({
      next: () => {
        // No-op, handled silently.
      }
    });
  }

  private getAllChats() {
    // Retrieves all chats for the current user (likely where user is a receiver).
    this.chatService.getChatsByReceiver()
      .subscribe({
        next: (res) => {
          this.chats = res;
        }
      });
  }

  private getAllChatMessages(chatId: string) {
    // Loads all messages associated with a given chat ID.
    this.messageService.getAllMessages({
      'chat-id': chatId
    }).subscribe({
      next: (messages) => {
        this.chatMessages = messages;
      }
    });
  }


  private initWebSocket() {
    // Ensure the user is authenticated and has a unique identifier
    if (this.keycloakService.keycloak.tokenParsed?.sub) {
      let ws = new SockJS('http://localhost:8080/ws'); // Create WebSocket connection
      this.socketClient = Stomp.over(ws); // Use STOMP protocol over SockJS
      const subUrl = `/user/${this.keycloakService.keycloak.tokenParsed?.sub}/chat`; // Private user topic

      this.socketClient.connect(
        { 'Authorization': 'Bearer ' + this.keycloakService.keycloak.token }, // Auth header
        () => {
          // On successful connection, subscribe to the user's chat notifications
          this.notificationSubscription = this.socketClient.subscribe(subUrl,
            (message: any) => {
              const notification: Notification = JSON.parse(message.body);
              this.handleNotification(notification); // Handle real-time update
            },
            () => console.error('Error while connecting to webSocket') // Fallback if subscription fails
          );
        }
      );
    }
  }

  private handleNotification(notification: Notification) {
    if (!notification) return;

    // If notification is for the currently opened chat
    if (this.selectedChat && this.selectedChat.id === notification.chatId) {
      switch (notification.type) {
        case 'MESSAGE':
        case 'IMAGE':
          const message: MessageResponse = {
            senderId: notification.senderId,
            receiverId: notification.receiverId,
            content: notification.content,
            type: notification.messageType,
            media: notification.media,
            createdAt: new Date().toString()
          };
          if (notification.type === 'IMAGE') {
            this.selectedChat.lastMessage = 'Attachment';
          } else {
            this.selectedChat.lastMessage = notification.content;
          }
          this.chatMessages.push(message);
          break;
        case 'SEEN':
          this.chatMessages.forEach(m => m.state = 'SEEN');
          break;
      }
    } else {
      const destChat = this.chats.find(c => c.id === notification.chatId);
      if (destChat && notification.type !== 'SEEN') {
        if (notification.type === 'MESSAGE') {
          destChat.lastMessage = notification.content;
        } else if (notification.type === 'IMAGE') {
          destChat.lastMessage = 'Attachment';
        }
        destChat.lastMessageTime = new Date().toString();
        destChat.unreadCount! += 1;
      } else if (notification.type === 'MESSAGE') {
        const newChat: ChatResponse = {
          id: notification.chatId,
          senderId: notification.senderId,
          receiverId: notification.receiverId,
          lastMessage: notification.content,
          name: notification.chatName,
          unreadCount: 1,
          lastMessageTime: new Date().toString()
        };
        this.chats.unshift(newChat);
      }
    }
  }

  private getSenderId(): string {
    // Determine sender ID based on current user's role in the selected chat
    if (this.selectedChat.senderId === this.keycloakService.userId) {
      return this.selectedChat.senderId as string;
    }
    return this.selectedChat.receiverId as string;
  }

  private getReceiverId(): string {
    // Determine receiver ID similarly
    if (this.selectedChat.senderId === this.keycloakService.userId) {
      return this.selectedChat.receiverId as string;
    }
    return this.selectedChat.senderId as string;
  }

  private scrollToBottom() {
    // Auto-scroll to latest message
    if (this.scrollableDiv) {
      const div = this.scrollableDiv.nativeElement;
      div.scrollTop = div.scrollHeight;
    }
  }

  private extractFileFromTarget(target: EventTarget | null): File | null {
    // Extracts file input element and returns the first selected file
    const htmlInputTarget = target as HTMLInputElement;
    if (target === null || htmlInputTarget.files === null) {
      return null;
    }
    return htmlInputTarget.files[0];
  }
}
