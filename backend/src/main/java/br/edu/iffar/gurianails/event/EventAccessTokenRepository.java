package br.edu.iffar.gurianails.event;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EventAccessTokenRepository extends JpaRepository<EventAccessTokenEntity, String> {
    Optional<EventAccessTokenEntity> findByTokenHash(String tokenHash);
}
