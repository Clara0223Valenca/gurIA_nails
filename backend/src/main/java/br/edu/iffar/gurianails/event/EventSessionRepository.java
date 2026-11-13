package br.edu.iffar.gurianails.event;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface EventSessionRepository extends JpaRepository<EventSessionEntity, String> {
    Optional<EventSessionEntity> findByRecoveryCodeHashAndActiveTrue(String recoveryCodeHash);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select session from EventSessionEntity session where session.id = :id")
    Optional<EventSessionEntity> lockById(@Param("id") String id);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update EventSessionEntity session set session.aiGenerationCount = session.aiGenerationCount + :units "
            + "where session.id = :id and session.active = true and session.aiGenerationCount <= :maximum - :units")
    int reserveAiGenerations(@Param("id") String id, @Param("units") int units, @Param("maximum") int maximum);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update EventSessionEntity session set session.aiGenerationCount = "
            + "case when session.aiGenerationCount >= :units then session.aiGenerationCount - :units else 0 end "
            + "where session.id = :id and session.active = true")
    int refundAiGenerations(@Param("id") String id, @Param("units") int units);
}
