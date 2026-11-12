package br.edu.iffar.gurianails.event;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

class EventSessionServiceTest {
    @Test
    void createsIndependentSessionAndNeverStoresRawSecrets() {
        EventSessionRepository sessionRepository = mock(EventSessionRepository.class);
        EventAccessTokenRepository tokenRepository = mock(EventAccessTokenRepository.class);
        when(sessionRepository.save(any(EventSessionEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(tokenRepository.save(any(EventAccessTokenEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        EventSessionService service = service(sessionRepository, tokenRepository);

        EventSessionService.CreatedSession created = service.create("  guria26 ");

        assertNotNull(created.session().getId());
        assertTrue(created.recoveryCode().matches("GN(?:-[2-9A-HJ-NP-Z]{4}){3}"));
        assertTrue(created.token().expiresAt().isAfter(Instant.now().plus(Duration.ofHours(23))));
        assertNotEquals(created.recoveryCode(), created.session().getRecoveryCodeHash());
        assertEquals(64, created.session().getRecoveryCodeHash().length());
        assertFalse(created.token().value().isBlank());
    }

    @Test
    void rejectsWrongEventCodeWithoutCreatingSession() {
        EventSessionRepository sessions = mock(EventSessionRepository.class);
        EventAccessTokenRepository tokens = mock(EventAccessTokenRepository.class);
        EventSessionService service = service(sessions, tokens);

        ResponseStatusException error = assertThrows(ResponseStatusException.class, () -> service.create("ERRADO"));

        assertEquals(401, error.getStatusCode().value());
        verify(sessions, never()).save(any());
        verify(tokens, never()).save(any());
    }

    @Test
    void authenticatesOnlyActiveSessionsWithUnexpiredHashedTokens() {
        EventSessionRepository sessions = mock(EventSessionRepository.class);
        EventAccessTokenRepository tokens = mock(EventAccessTokenRepository.class);
        EventSessionEntity session = new EventSessionEntity(EventSessionService.hash("GN-TEST-TEST-TEST"));
        EventAccessTokenEntity valid = new EventAccessTokenEntity(session.getId(), EventSessionService.hash("access-token"), Instant.now().plusSeconds(60));
        EventAccessTokenEntity expired = new EventAccessTokenEntity(session.getId(), EventSessionService.hash("expired-token"), Instant.now().minusSeconds(1));
        when(tokens.findByTokenHash(EventSessionService.hash("access-token"))).thenReturn(Optional.of(valid));
        when(tokens.findByTokenHash(EventSessionService.hash("expired-token"))).thenReturn(Optional.of(expired));
        when(sessions.findById(session.getId())).thenReturn(Optional.of(session));
        EventSessionService service = service(sessions, tokens);

        assertEquals(session.getId(), service.authenticate("access-token").getId());
        assertNull(service.authenticate("expired-token"));
        assertNull(service.authenticate("unknown-token"));
    }

    @Test
    void enforcesPersistentAiQuotaAtomically() {
        EventSessionRepository sessions = mock(EventSessionRepository.class);
        EventSessionService service = service(sessions, mock(EventAccessTokenRepository.class));
        when(sessions.reserveAiGenerations("session", 4, 10)).thenReturn(1);
        when(sessions.reserveAiGenerations("full", 1, 10)).thenReturn(0);

        service.reserveAiGenerations("session", 4);
        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> service.reserveAiGenerations("full", 1));

        assertEquals(429, error.getStatusCode().value());
    }

    private EventSessionService service(EventSessionRepository sessions, EventAccessTokenRepository tokens) {
        return new EventSessionService(sessions, tokens, "GURIA26", Duration.ofHours(24), 10, 20);
    }
}
