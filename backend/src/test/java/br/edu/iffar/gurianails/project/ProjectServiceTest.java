package br.edu.iffar.gurianails.project;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import br.edu.iffar.gurianails.event.EventSessionEntity;
import br.edu.iffar.gurianails.event.EventSessionRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

class ProjectServiceTest {
    @Test
    void listsOnlyProjectsBelongingToCurrentSession() {
        ProjectRepository projects = mock(ProjectRepository.class);
        ProjectService service = new ProjectService(projects, mock(EventSessionRepository.class), 20);
        when(projects.findAllByEventSessionIdOrderByUpdatedAtDesc("session-a")).thenReturn(List.of());

        assertEquals(List.of(), service.list("session-a"));
        verify(projects).findAllByEventSessionIdOrderByUpdatedAtDesc("session-a");
    }

    @Test
    void refusesToOverwriteAnIdentifierOwnedByAnotherSession() {
        ProjectRepository projects = mock(ProjectRepository.class);
        EventSessionRepository sessions = mock(EventSessionRepository.class);
        ProjectService service = new ProjectService(projects, sessions, 20);
        when(sessions.lockById("session-a")).thenReturn(Optional.of(mock(EventSessionEntity.class)));
        when(projects.findByIdAndEventSessionId("project", "session-a")).thenReturn(Optional.empty());
        when(projects.existsById("project")).thenReturn(true);

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> service.save("session-a", "project", "Nome", false, "{}"));

        assertEquals(409, error.getStatusCode().value());
    }

    @Test
    void appliesProjectLimitWhileHoldingSessionLock() {
        ProjectRepository projects = mock(ProjectRepository.class);
        EventSessionRepository sessions = mock(EventSessionRepository.class);
        ProjectService service = new ProjectService(projects, sessions, 20);
        when(projects.findByIdAndEventSessionId("new-project", "session-a")).thenReturn(Optional.empty());
        when(projects.existsById("new-project")).thenReturn(false);
        when(sessions.lockById("session-a")).thenReturn(Optional.of(mock(EventSessionEntity.class)));
        when(projects.countByEventSessionId("session-a")).thenReturn(20L);

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> service.save("session-a", "new-project", "Nome", false, "{}"));

        assertEquals(409, error.getStatusCode().value());
    }

    @Test
    void repeatedSaveUpdatesTheExistingProjectInsteadOfCompetingWithItsInsert() {
        ProjectRepository projects = mock(ProjectRepository.class);
        EventSessionRepository sessions = mock(EventSessionRepository.class);
        ProjectService service = new ProjectService(projects, sessions, 20);
        ProjectEntity existing = new ProjectEntity("project", "session-a", "Antigo", false, "{\"elements\":[]}");
        when(sessions.lockById("session-a")).thenReturn(Optional.of(mock(EventSessionEntity.class)));
        when(projects.findByIdAndEventSessionId("project", "session-a")).thenReturn(Optional.of(existing));
        when(projects.save(existing)).thenReturn(existing);

        ProjectEntity saved = service.save("session-a", "project", "Novo", true, "{\"elements\":[]}");

        assertEquals(existing, saved);
        verify(projects).save(existing);
    }
}
