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

      // Wysyła wiadomość do serwera i aktualizuje interfejs użytkownika
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
    this.setMessagesToSeen(); // Marks current chat messages as seen when clicked
  }

  uploadMedia(target: EventTarget | null) {
    const file = this.extractFileFromTarget(target);
    if (file !== null) {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) {

          // Pobierz zawartość base64 z adresu URL danych.
          const mediaLines = reader.result.toString().split(',')[1];

          // Przesyła plik multimedialny do serwera, a następnie tworzy i dodaje lokalnie komunikat IMAGE.
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
                media: [mediaLines], // Osadza ciąg znaków base64 jako multimedia.
                createdAt: new Date().toString()
              };
              this.chatMessages.push(message);
            }
          });
        }
      }
      reader.readAsDataURL(file); // Konwertuje plik base64 na ciąg znaków String.
    }
  }

  private setMessagesToSeen() {
    // Wysyła żądanie oznaczenia wszystkich wiadomości w wybranym czacie jako „przeczytane”.
    this.messageService.setMessageToSeen({
      'chat-id': this.selectedChat.id as string
    }).subscribe({
      next: () => {

      }
    });
  }

  ngOnInit(): void {
    this.initWebSocket(); // Inicjalizuje WebSocket, żeby odbierać powiadomienia z czatu na żywo.
    this.getAllChats();   // Pobiera listę wszystkich czatów dla zalogowanego użytkownika.
  }
  private initWebSocket() {
    // Sprawdza, że użytkownik jest uwierzytelniony i posiada unikalny identyfikator.
    if (this.keycloakService.keycloak.tokenParsed?.sub) {
      let ws = new SockJS('http://localhost:8080/ws'); // Tworzy połączenie z WebSocket
      this.socketClient = Stomp.over(ws); // Wykorzysta protokół STOMP over SockJS
      const subUrl = `/user/${this.keycloakService.keycloak.tokenParsed?.sub}/chat`;

      this.socketClient.connect(
        { 'Authorization': 'Bearer ' + this.keycloakService.keycloak.token }, // Nagłówek autoryzacji
        () => {
          // Po pomyślnym nawiązaniu połączenia śledzi powiadomienia czatu użytkownika.
          this.notificationSubscription = this.socketClient.subscribe(subUrl,
            (message: any) => {
              const notification: Notification = JSON.parse(message.body);
              this.handleNotification(notification); // Obsługa aktualizacji w czasie rzeczywistym
            },
            () => console.error('Error while connecting to webSocket') // Wypadek awarii subskrypcji
          );
        }
      );
    }
  }
  private getAllChats() {
    // Pobiera wszystkie czaty dla bieżącego użytkownika .
    this.chatService.getChatsByReceiver()
      .subscribe({
        next: (res) => {
          this.chats = res;
        }
      });
  }

  private getAllChatMessages(chatId: string) {
    // Ładuje wszystkie wiadomości powiązane z danym identyfikatorem czatu.
    this.messageService.getAllMessages({
      'chat-id': chatId
    }).subscribe({
      next: (messages) => {
        this.chatMessages = messages;
      }
    });
  }

  private handleNotification(notification: Notification) {
    if (!notification) return;

    // Jeśli powiadomienie dotyczy aktualnie otwartej rozmowy
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
  userProfile() {
    this.keycloakService.accountManagement(); // Kieruje użytkownika na stronę zarządzania kontem Keycloak.
  }

  logout() {
    this.keycloakService.logout(); // Wywołuje wylogowanie za pośrednictwem Keycloak.
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

  private extractFileFromTarget(target: EventTarget | null): File | null {
    // Extracts file input element and returns the first selected file
    const htmlInputTarget = target as HTMLInputElement;
    if (target === null || htmlInputTarget.files === null) {
      return null;
    }
    return htmlInputTarget.files[0];
  }
}
