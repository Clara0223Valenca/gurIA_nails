package br.edu.iffar.gurianails.project;

import br.edu.iffar.gurianails.event.EventSessionRepository;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ProjectService {
    private final ProjectRepository projects;
    private final EventSessionRepository sessions;
    private final int projectLimit;

    public ProjectService(ProjectRepository projects, EventSessionRepository sessions,
                          @Value("${guria.event.project-limit:20}") int projectLimit) {
        this.projects = projects;
        this.sessions = sessions;
        this.projectLimit = Math.max(1, projectLimit);
    }

    @Transactional(readOnly = true)
    public List<ProjectEntity> list(String sessionId) {
        return projects.findAllByEventSessionIdOrderByUpdatedAtDesc(sessionId);
    }

    @Transactional
    public ProjectEntity save(String sessionId, String id, String name, boolean favorite, String document) {
        sessions.lockById(sessionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sessão indisponível."));
        ProjectEntity entity = projects.findByIdAndEventSessionId(id, sessionId).orElse(null);
        if (entity == null) {
            if (projects.existsById(id)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Esse identificador de projeto não está disponível.");
            }
            if (projects.countByEventSessionId(sessionId) >= projectLimit) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "Você atingiu o limite de " + projectLimit + " projetos desta sessão.");
            }
            entity = new ProjectEntity(id, sessionId, name, favorite, document);
        } else {
            entity.update(name, favorite, document);
        }
        return projects.save(entity);
    }

    @Transactional
    public void delete(String sessionId, String id) {
        ProjectEntity entity = projects.findByIdAndEventSessionId(id, sessionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Projeto não encontrado."));
        projects.delete(entity);
    }
}
