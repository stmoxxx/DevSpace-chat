import { Component, input, InputSignal, output } from '@angular/core';
import { ChatService } from '../../services/services/chat.service';
import { ChatResponse } from '../../services/models/chat-response';
import { DatePipe } from '@angular/common';
import { UserService } from '../../services/services/user.service';
import { UserResponse } from '../../services/models/user-response';
import { KeycloakService } from '../../utils/keycloak/keycloak.service';
import { MessageService } from '../../services/services/message.service';

@Component({
  selector: 'app-chat-list', // Component selector
  templateUrl: './chat-list.component.html', // HTML template
  imports: [
    DatePipe // Used for date formatting
  ],
  styleUrl: './chat-list.component.scss' // Stylesheet
})
export class ChatListComponent {
  chats: InputSignal<ChatResponse[]> = input<ChatResponse[]>([]); // List of chats as reactive input
  searchNewContact = false; // Toggle for contact search UI
  contacts: Array<UserResponse> = []; // List of available users to chat
  chatSelected = output<ChatResponse>(); // Emits selected chat to parent component

  constructor(
    private chatService: ChatService, // Chat-related API operations
    private userService: UserService, // User-related API operations
    private keycloakService: KeycloakService // Handles authentication and user info
  ) { }

  // Fetch all users to display in search contact list
  searchContact() {
    this.userService.getAllUsers()
      .subscribe({
        next: (users) => {
          this.contacts = users;
          this.searchNewContact = true; // Show search contact UI
        }
      });
  }

  // Create a new chat with selected contact
  selectContact(contact: UserResponse) {
    this.chatService.createChat({
      'sender-id': this.keycloakService.userId as string,
      'receiver-id': contact.id as string
    }).subscribe({
      next: (res) => {
        const chat: ChatResponse = {
          id: res.response,
          name: contact.firstName + ' ' + contact.lastName,
          recipientOnline: contact.online,
          lastMessageTime: contact.lastSeen,
          senderId: this.keycloakService.userId,
          receiverId: contact.id
        };
        this.chats().unshift(chat); // Add new chat to top of list
        this.searchNewContact = false; // Hide search UI
        this.chatSelected.emit(chat); // Notify parent of new chat selection
      }
    });
  }

  // Emits selected chat when user clicks on it
  chatClicked(chat: ChatResponse) {
    this.chatSelected.emit(chat);
  }

  // Truncates long messages for display
  wrapMessage(lastMessage: string | undefined): string {
    if (lastMessage && lastMessage.length <= 20) {
      return lastMessage;
    }
    return lastMessage?.substring(0, 17) + '...';
  }
}
