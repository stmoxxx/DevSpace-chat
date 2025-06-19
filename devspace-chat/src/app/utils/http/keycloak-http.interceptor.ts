import { HttpHeaders, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { KeycloakService } from '../keycloak/keycloak.service';

// Funkcja przechwytywania HTTP służąca do dołączania tokenu Keycloak do wychodzących żądań
export const keycloakHttpInterceptor: HttpInterceptorFn = (req, next) => {
  const keycloakService = inject(KeycloakService); // Dodanie KeycloakService, aby uzyskać dostęp do tokenu.
  const token = keycloakService.keycloak.token; // Pobiera bieżący token

  if (token) {
    // Jeśli token istnieje, sklonuj żądanie i dodaj nagłówek Authorization.
    const authReq = req.clone({
      headers: new HttpHeaders({
        Authorization: `Bearer ${token}`
      })
    });
    return next(authReq); // Przekaż zmodyfikowane żądanie do następnego modułu obsługi.
  }

  return next(req); // Jeśli nie ma tokenu, przekaż oryginalne żądanie bez zmian.
};
