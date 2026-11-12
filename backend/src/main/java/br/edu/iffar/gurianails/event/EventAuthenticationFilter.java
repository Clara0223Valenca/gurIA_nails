package br.edu.iffar.gurianails.event;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import tools.jackson.databind.ObjectMapper;

@Component
public class EventAuthenticationFilter extends OncePerRequestFilter {
    private final EventSessionService sessions;
    private final EventRateLimitService rateLimits;
    private final ObjectMapper objectMapper;

    public EventAuthenticationFilter(EventSessionService sessions, EventRateLimitService rateLimits, ObjectMapper objectMapper) {
        this.sessions = sessions;
        this.rateLimits = rateLimits;
        this.objectMapper = objectMapper;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        if (!path.startsWith("/api/") || HttpMethod.OPTIONS.matches(request.getMethod())) return true;
        if (path.equals("/api/health")) return true;
        return request.getMethod().equals("POST")
                && (path.equals("/api/event/sessions") || path.equals("/api/event/sessions/recover"));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String authorization = request.getHeader(HttpHeaders.AUTHORIZATION);
        String token = authorization != null && authorization.regionMatches(true, 0, "Bearer ", 0, 7)
                ? authorization.substring(7).strip() : "";
        EventSessionEntity session = sessions.authenticate(token);
        if (session == null) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setCharacterEncoding("UTF-8");
            objectMapper.writeValue(response.getWriter(), Map.of(
                    "code", "EVENT_SESSION_REQUIRED",
                    "message", "Sua sessão expirou. Use o código de recuperação para continuar."));
            return;
        }
        try {
            rateLimits.check("api-session:" + session.getId(), 240, Duration.ofMinutes(1));
            rateLimits.check("api-ip:" + request.getRemoteAddr(), 600, Duration.ofMinutes(1));
        } catch (ResponseStatusException exception) {
            response.setStatus(exception.getStatusCode().value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setCharacterEncoding("UTF-8");
            objectMapper.writeValue(response.getWriter(), Map.of("message", exception.getReason()));
            return;
        }
        request.setAttribute(EventSessionRequest.ATTRIBUTE, session);
        chain.doFilter(request, response);
    }
}
