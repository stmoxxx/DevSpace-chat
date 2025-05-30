package com.stmoxx.devspacechat.interceptor;

import com.stmoxx.devspacechat.user.UserSynchronizer;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class UserSynchronizerFilter extends OncePerRequestFilter {

    private final UserSynchronizer userSynchronizer;

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain) throws ServletException, IOException {

        // If the user is authenticated with a JWT token, synchronize with IDP
        if (!(SecurityContextHolder.getContext().getAuthentication() instanceof AnonymousAuthenticationToken)) {
            JwtAuthenticationToken token = ((JwtAuthenticationToken) SecurityContextHolder.getContext()
                    .getAuthentication());

            // Synchronize user data with IDP using the JWT token
            userSynchronizer.synchronizeWithIdp(token.getToken());
        }

        // Proceed with the next filter in the chain
        filterChain.doFilter(request, response);
    }
}
