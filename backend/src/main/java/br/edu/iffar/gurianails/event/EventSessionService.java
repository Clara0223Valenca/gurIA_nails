package br.edu.iffar.gurianails.event;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Locale;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class EventSessionService {
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final char[] RECOVERY_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ".toCharArray();
    private final EventSessionRepository sessions;
    private final EventAccessTokenRepository tokens;
    private final String eventCode;
    private final Duration tokenTtl;
    private final int aiLimit;
    private final int projectLimit;

    public EventSessionService(
            EventSessionRepository sessions,
            EventAccessTokenRepository tokens,
            @Value("${guria.event.code:}") String eventCode,
            @Value("${guria.event.access-token-ttl:PT24H}") Duration tokenTtl,
            @Value("${guria.event.ai-generation-limit:10}") int aiLimit,
            @Value("${guria.event.project-limit:20}") int projectLimit) {
        this.sessions = sessions;
        this.tokens = tokens;
        this.eventCode = normalizeEventCode(eventCode);
        this.tokenTtl = tokenTtl;
        this.aiLimit = Math.max(1, aiLimit);
        this.projectLimit = Math.max(1, projectLimit);
    }

    @Transactional
    public CreatedSession create(String submittedCode) {
        if (eventCode.isBlank()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "O Modo Evento ainda não foi configurado.");
        }
        byte[] expected = eventCode.getBytes(StandardCharsets.UTF_8);
        byte[] submitted = normalizeEventCode(submittedCode).getBytes(StandardCharsets.UTF_8);
        if (!MessageDigest.isEqual(expected, submitted)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Código do evento inválido.");
        }
        String recoveryCode = newRecoveryCode();
        EventSessionEntity session = sessions.save(new EventSessionEntity(hash(recoveryCode)));
        IssuedToken token = issueToken(session.getId());
        return new CreatedSession(session, token, recoveryCode);
    }

    @Transactional
    public RecoveredSession recover(String recoveryCode) {
        EventSessionEntity session = sessions.findByRecoveryCodeHashAndActiveTrue(hash(normalizeRecoveryCode(recoveryCode)))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Código de recuperação inválido."));
        session.recoveredAt(Instant.now());
        sessions.save(session);
        return new RecoveredSession(session, issueToken(session.getId()));
    }

    @Transactional(readOnly = true)
    public EventSessionEntity authenticate(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) return null;
        EventAccessTokenEntity token = tokens.findByTokenHash(hash(rawToken)).orElse(null);
        if (token == null || !token.getExpiresAt().isAfter(Instant.now())) return null;
        return sessions.findById(token.getSessionId()).filter(EventSessionEntity::isActive).orElse(null);
    }

    @Transactional
    public void reserveAiGenerations(String sessionId, int units) {
        int requested = Math.max(1, units);
        if (requested > aiLimit || sessions.reserveAiGenerations(sessionId, requested, aiLimit) != 1) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "Você atingiu o limite de " + aiLimit + " gerações desta sessão.");
        }
    }

    @Transactional
    public void refundAiGenerations(String sessionId, int units) {
        sessions.refundAiGenerations(sessionId, Math.max(1, units));
    }

    @Transactional(readOnly = true)
    public EventSessionEntity current(String sessionId) {
        return sessions.findById(sessionId).filter(EventSessionEntity::isActive)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sessão indisponível."));
    }

    public int getAiLimit() { return aiLimit; }
    public int getProjectLimit() { return projectLimit; }

    private IssuedToken issueToken(String sessionId) {
        String value = Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes(32));
        Instant expiresAt = Instant.now().plus(tokenTtl);
        tokens.save(new EventAccessTokenEntity(sessionId, hash(value), expiresAt));
        return new IssuedToken(value, expiresAt);
    }

    static String hash(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(String.valueOf(value).getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 indisponível.", exception);
        }
    }

    static String normalizeRecoveryCode(String code) {
        return String.valueOf(code).strip().toUpperCase(Locale.ROOT).replaceAll("\\s+", "");
    }

    private static String normalizeEventCode(String code) {
        return code == null ? "" : code.strip().toUpperCase(Locale.ROOT);
    }

    private static String newRecoveryCode() {
        StringBuilder code = new StringBuilder("GN");
        for (int group = 0; group < 3; group++) {
            code.append('-');
            for (int index = 0; index < 4; index++) code.append(RECOVERY_ALPHABET[RANDOM.nextInt(RECOVERY_ALPHABET.length)]);
        }
        return code.toString();
    }

    private static byte[] randomBytes(int length) {
        byte[] bytes = new byte[length];
        RANDOM.nextBytes(bytes);
        return bytes;
    }

    public record IssuedToken(String value, Instant expiresAt) {}
    public record CreatedSession(EventSessionEntity session, IssuedToken token, String recoveryCode) {}
    public record RecoveredSession(EventSessionEntity session, IssuedToken token) {}
}
