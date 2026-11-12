package br.edu.iffar.gurianails.ai;

import br.edu.iffar.gurianails.event.EventRateLimitService;
import br.edu.iffar.gurianails.event.EventSessionEntity;
import br.edu.iffar.gurianails.event.EventSessionRequest;
import br.edu.iffar.gurianails.event.EventSessionService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@Validated
@RestController
@RequestMapping("/api/ai")
public class AiController {
    private final AiGenerationProvider provider;
    private final AiGenerationService service;
    private final EventSessionService sessions;
    private final EventRateLimitService rateLimits;

    public AiController(AiGenerationProvider provider, AiGenerationService service,
                        EventSessionService sessions, EventRateLimitService rateLimits) {
        this.provider = provider;
        this.service = service;
        this.sessions = sessions;
        this.rateLimits = rateLimits;
    }

    @GetMapping("/status")
    public Map<String, Object> status(HttpServletRequest request) {
        EventSessionEntity session = sessions.current(EventSessionRequest.require(request).getId());
        return Map.of("available", provider.available(), "provider", provider.providerName(), "model", provider.modelName(),
                "generationLimit", sessions.getAiLimit(), "generationUsed", session.getAiGenerationCount());
    }

    @PostMapping("/generate")
    public Map<String, Object> generate(@Valid @RequestBody AiRequest request, HttpServletRequest servletRequest) {
        if (request.prompt() == null || request.prompt().isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Descreva a arte antes de gerar.");
        EventSessionEntity session = EventSessionRequest.require(servletRequest);
        checkGenerationRateLimits(servletRequest, session);
        return response(service.run(request, false, session.getId()), session.getId());
    }

    @PostMapping("/improve")
    public Map<String, Object> improve(@Valid @RequestBody AiRequest request, HttpServletRequest servletRequest) {
        if (request.referenceImage() == null || !request.referenceImage().matches("(?is)^data:image/(png|jpeg|webp);base64,[a-z0-9+/=]+$")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Envie uma imagem de referência em PNG, JPG ou WEBP.");
        }
        EventSessionEntity session = EventSessionRequest.require(servletRequest);
        checkGenerationRateLimits(servletRequest, session);
        return response(service.run(request, true, session.getId()), session.getId());
    }

    private Map<String, Object> response(List<String> images, String sessionId) {
        EventSessionEntity updated = sessions.current(sessionId);
        return Map.of("images", images, "model", provider.modelName(),
                "generationLimit", sessions.getAiLimit(), "generationUsed", updated.getAiGenerationCount());
    }

    private void checkGenerationRateLimits(HttpServletRequest request, EventSessionEntity session) {
        rateLimits.check("ai-session:" + session.getId(), 6, Duration.ofMinutes(1));
        rateLimits.check("ai-ip:" + request.getRemoteAddr(), 120, Duration.ofMinutes(1));
    }
}
