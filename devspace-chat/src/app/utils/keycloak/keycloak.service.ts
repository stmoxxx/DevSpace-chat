import { Injectable } from '@angular/core';
import Keycloak from 'keycloak-js';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root' // Makes the service available throughout the app
})
export class KeycloakService {

  private _keycloak: Keycloak | undefined; // Internal Keycloak instance

  constructor(
    private router: Router // Angular router for navigation, if needed
  ) { }

  // Zainicjuj i zwróć instancję Keycloak
  get keycloak() {
    if (!this._keycloak) {
      this._keycloak = new Keycloak({
        url: 'http://localhost:9090', // Adres URL serwera Keycloak
        realm: 'devspace-chat',       // Nazwa realmu
        clientId: 'devspace-chat-app' // Identyfikator klienta zarejestrowany w Keycloak
      });
    }
    return this._keycloak;
  }

  // Inicjuje Keycloak i wymusza logowanie
  async init() {
    const authenticated = await this.keycloak.init({
      onLoad: 'login-required', // Sprawdza, czy użytkownik jest zalogowany.
    });
  }

  // Uruchamia logowanie do Keycloak
  async login() {
    await this.keycloak.login();
  }

  // Returns the logged-in user's ID
  get userId(): string {
    return this.keycloak?.tokenParsed?.sub as string;
  }

  // Checks if the token is still valid
  get isTokenValid(): boolean {
    return !this.keycloak.isTokenExpired();
  }

  // Retrieves user's full name from token
  get fullName(): string {
    return this.keycloak.tokenParsed?.['name'] as string;
  }

  // Retrieves user's email from token
  get email(): string {
    return this.keycloak.tokenParsed?.['email'] as string;
  }

  // Retrieves preferred username from token
  get userName(): string {
    return this.keycloak.tokenParsed?.['preferred_username'] as string;
  }

  // Logs out the user and redirects to app home
  logout() {
    return this.keycloak.logout({ redirectUri: 'http://localhost:4200' });
  }

  // Opens Keycloak account management page
  accountManagement() {
    return this.keycloak.accountManagement();
  }
}
