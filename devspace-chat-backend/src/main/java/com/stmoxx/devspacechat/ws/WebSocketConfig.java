package com.stmoxx.devspacechat.ws;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.messaging.converter.DefaultContentTypeResolver;
import org.springframework.messaging.converter.MappingJackson2MessageConverter;
import org.springframework.messaging.converter.MessageConverter;
import org.springframework.messaging.handler.invocation.HandlerMethodArgumentResolver;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.security.messaging.context.AuthenticationPrincipalArgumentResolver;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import java.util.List;

import static org.springframework.http.MediaType.APPLICATION_JSON;

@Configuration
@EnableWebSocketMessageBroker
@Order(Ordered.HIGHEST_PRECEDENCE + 99)
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    // Konfiguracja brokera wiadomości, aby włączyć prosty broker dla wiadomości specyficznych dla użytkownika.
    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/user"); // Włączanie prostego brokera wiadomości dla miejsca docelowego użytkownika
        registry.setApplicationDestinationPrefixes("/app"); // Prefiks dla miejsc docelowych aplikacji (np. wiadomości z aplikacji)
        registry.setUserDestinationPrefix("/user"); // Prefiks dla miejsc docelowych określonych przez użytkownika (np.
                                                    // routing wiadomości użytkownika)
    }

    // Rejestracja punktu końcowego WebSocket dla komunikacji protokołem STOMP
    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry
                .addEndpoint("/ws") // Punkt końcowy dla połączenia WebSocket
                .setAllowedOrigins("http://localhost:4200") // Zezwól na połączenia WebSocket z frontendem działającym na
                                                            // localhost:4200
                .withSockJS(); // Jeśli klient nie obsługuje WebSocket, należy skorzystać z SockJS.
    }

    // Dodanie niestandardowych modułów rozpoznawania argumentów do obsługi kontekstu uwierzytelniania.
    @Override
    public void addArgumentResolvers(List<HandlerMethodArgumentResolver> argumentResolvers) {
        argumentResolvers.add(new AuthenticationPrincipalArgumentResolver());
    }

    // Konfiguracja konwerterów wiadomości do obsługi treści JSON
    @Override
    public boolean configureMessageConverters(List<MessageConverter> messageConverters) {
        DefaultContentTypeResolver resolver = new DefaultContentTypeResolver();
        resolver.setDefaultMimeType(APPLICATION_JSON); // Domyślny typ MIME dla wiadomości to JSON
        MappingJackson2MessageConverter converter = new MappingJackson2MessageConverter();
        converter.setObjectMapper(new ObjectMapper()); // Użycie ObjectMapper do serializacji JSON
        converter.setContentTypeResolver(resolver); // Ustawianie resolver jako typ zawartości dla konwertera
        messageConverters.add(converter); // Dodanie własnego konwertera do listy
        return false;
    }

}
