package br.edu.iffar.gurianails.project;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProjectRepository extends JpaRepository<ProjectEntity, String> {
    List<ProjectEntity> findAllByEventSessionIdOrderByUpdatedAtDesc(String eventSessionId);
    Optional<ProjectEntity> findByIdAndEventSessionId(String id, String eventSessionId);
    long countByEventSessionId(String eventSessionId);
}
