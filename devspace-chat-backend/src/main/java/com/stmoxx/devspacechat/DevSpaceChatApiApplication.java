package com.stmoxx.devspacechat;

import io.swagger.v3.oas.annotations.enums.SecuritySchemeIn;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.security.OAuthFlow;
import io.swagger.v3.oas.annotations.security.OAuthFlows;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@SpringBootApplication
@EnableJpaAuditing
@SecurityScheme(name = "keycloak", // Nazwa schematu bezpieczeństwa (używana w dokumentacji Swagger)
		type = SecuritySchemeType.OAUTH2, // Określa typ schematu zabezpieczeń jako OAuth2.
		bearerFormat = "JWT", // Określa, że format tokenu posiadacza to JWT.
		scheme = "bearer", // Określa schemat autoryzacji jako „bearer” (posidacz)
		in = SecuritySchemeIn.HEADER, // Wskazuje, że informacje dotyczące autoryzacji będą zawarte w nagłówkach HTTP.
		flows = @OAuthFlows(password = @OAuthFlow(authorizationUrl = "http://localhost:9090/realms/devspace-chat/protocol/openid-connect/auth", // URL
																																				// dla
																																				// autoryzacji
				tokenUrl = "http://localhost:9090/realms/devspace-chat/protocol/openid-connect/token" //Adres URL do pobrania tokenu
		)))
public class DevSpaceChatApiApplication {

	// Główna metoda uruchamiająca DevSpace
	public static void main(String[] args) {
		SpringApplication.run(DevSpaceChatApiApplication.class, args);
	}

}
