package br.edu.iffar.gurianails.event;

import br.edu.iffar.gurianails.project.ProjectRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Duration;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/event")
public class EventSessionController {
    private final EventSessionService sessions;
    private final EventRateLimitService rateLimits;
    private final ProjectRepository projects;

    public EventSessionController(EventSessionService sessions, EventRateLimitService rateLimits, ProjectRepository projects) {
        this.sessions = sessions;
        this.rateLimits = rateLimits;
        this.projects = projects;
    }

    @PostMapping("/sessions")
    public CreatedResponse create(@Valid @RequestBody CreateRequest body, HttpServletRequest request) {
        rateLimits.check("event-create:" + request.getRemoteAddr(), 300, Duration.ofMinutes(10));
        EventSessionService.CreatedSession created = sessions.create(body.eventCode());
        return new CreatedResponse(
                created.session().getId(), created.token().value(), created.token().expiresAt(), created.recoveryCode(),
                sessions.getAiLimit(), 0, sessions.getProjectLimit(), 0);
    }

    @PostMapping("/sessions/recover")
    public AccessResponse recover(@Valid @RequestBody RecoverRequest body, HttpServletRequest request) {
        rateLimits.check("event-recover:" + request.getRemoteAddr(), 120, Duration.ofMinutes(10));
        EventSessionService.RecoveredSession recovered = sessions.recover(body.recoveryCode());
        return accessResponse(recovered.session(), recovered.token());
    }

    @GetMapping("/session")
    public StatusResponse status(HttpServletRequest request) {
        EventSessionEntity session = sessions.current(EventSessionRequest.require(request).getId());
        return statusResponse(session);
    }

    private AccessResponse accessResponse(EventSessionEntity session, EventSessionService.IssuedToken token) {
        StatusResponse status = statusResponse(session);
        return new AccessResponse(status.sessionId(), token.value(), token.expiresAt(), status.aiLimit(), status.aiUsed(),
                status.projectLimit(), status.projectCount());
    }

    private StatusResponse statusResponse(EventSessionEntity session) {
        return new StatusResponse(session.getId(), sessions.getAiLimit(), session.getAiGenerationCount(),
                sessions.getProjectLimit(), projects.countByEventSessionId(session.getId()));
    }

    public record CreateRequest(@NotBlank @Size(max = 80) String eventCode) {}
    public record RecoverRequest(@NotBlank @Size(max = 80) String recoveryCode) {}
    public record StatusResponse(String sessionId, int aiLimit, int aiUsed, int projectLimit, long projectCount) {}
    public record AccessResponse(String sessionId, String accessToken, java.time.Instant accessTokenExpiresAt,
                                 int aiLimit, int aiUsed, int projectLimit, long projectCount) {}
    public record CreatedResponse(String sessionId, String accessToken, java.time.Instant accessTokenExpiresAt,
                                  String recoveryCode, int aiLimit, int aiUsed, int projectLimit, long projectCount) {}
}
