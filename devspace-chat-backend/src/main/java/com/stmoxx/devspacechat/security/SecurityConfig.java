package com.stmoxx.devspacechat.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

import java.util.Arrays;
import java.util.Collections;

import static org.springframework.security.config.Customizer.withDefaults;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

        // Bean do konfiguracji łańcucha filtrów bezpieczeństwa
        @Bean
        public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
                http
                                .cors(withDefaults())
                                .csrf(AbstractHttpConfigurer::disable)
                                .authorizeHttpRequests(req -> req
                                        // Zezwolenie na wszystkie żądania do określonych ścieżek API (np. Swagger UI,
                                        // punkty końcowe uwierzytelniania)
                                                .requestMatchers("/auth/**",
                                                                "/v2/api-docs",
                                                                "/v3/api-docs",
                                                                "/v3/api-docs/**",
                                                                "/swagger-resources",
                                                                "/swagger-resources/**",
                                                                "/configuration/ui",
                                                                "/configuration/security",
                                                                "/swagger-ui/**",
                                                                "/webjars/**",
                                                                "/swagger-ui.html",
                                                                "/ws/**")
                                                .permitAll() // Zezwolenie na dostęp do tych punktów końcowych bez
                                                        // uwierzytelniania
                                                .anyRequest().authenticated()) // Wszystkie inne żądania wymagają
                                                                        // uwierzytelnienia
                                .oauth2ResourceServer(auth -> auth.jwt(token -> token
                                                .jwtAuthenticationConverter(new KeycloakJwtAuthenticationConverter()))); // Wykorzystanie
                                                                                                                         // Keycloak
                                                                                                                         // JWT
                                                                                                                         // authentication
                                                                                                                         // converter
                return http.build(); // Build the HttpSecurity configuration
        }

        // Bean to configure CORS (Cross-Origin Resource Sharing) settings
        @Bean
        public CorsFilter corsFilter() {
                final UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
                final CorsConfiguration config = new CorsConfiguration();
                config.setAllowCredentials(true);
                config.setAllowedOrigins(Collections.singletonList("http://localhost:4200")); //Zezwolenie na żądania z frontendu
                config.setAllowedHeaders(Arrays.asList(
                                HttpHeaders.ORIGIN,
                                HttpHeaders.CONTENT_TYPE,
                                HttpHeaders.ACCEPT,
                                HttpHeaders.AUTHORIZATION)); // Allow certain HTTP headers
                config.setAllowedMethods(Arrays.asList(
                                "GET",
                                "POST",
                                "DELETE",
                                "PUT",
                                "PATCH")); // Allow specific HTTP methods
                source.registerCorsConfiguration("/**", config); // Apply this CORS configuration to all endpoints
                return new CorsFilter(source); // Return the configured CORS filter
        }
}
