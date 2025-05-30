import { HttpHeaders, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { KeycloakService } from '../keycloak/keycloak.service';

// HTTP interceptor function to attach the Keycloak token to outgoing requests
export const keycloakHttpInterceptor: HttpInterceptorFn = (req, next) => {
  const keycloakService = inject(KeycloakService); // Inject KeycloakService to access the token
  const token = keycloakService.keycloak.token; // Retrieve the current token

  if (token) {
    // If token exists, clone the request and add the Authorization header
    const authReq = req.clone({
      headers: new HttpHeaders({
        Authorization: `Bearer ${token}`
      })
    });
    return next(authReq); // Pass the modified request to the next handler
  }

  return next(req); // If no token, pass the original request unmodified
};
