package br.edu.iffar.gurianails.event;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "event_sessions")
public class EventSessionEntity {
    @Id
    @Column(name = "id", columnDefinition = "CHAR(36)", length = 36)
    private String id;
    @Column(name = "recovery_code_hash", nullable = false, unique = true, length = 64, columnDefinition = "CHAR(64)")
    private String recoveryCodeHash;
    @Column(name = "ai_generation_count", nullable = false, columnDefinition = "SMALLINT UNSIGNED")
    private int aiGenerationCount;
    @Column(name = "is_active", nullable = false)
    private boolean active;
    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private Instant createdAt;
    @Column(name = "updated_at", nullable = false, insertable = false, updatable = false)
    private Instant updatedAt;
    @Column(name = "last_recovered_at")
    private Instant lastRecoveredAt;

    protected EventSessionEntity() {}

    public EventSessionEntity(String recoveryCodeHash) {
        this.id = UUID.randomUUID().toString();
        this.recoveryCodeHash = recoveryCodeHash;
        this.active = true;
    }

    @PrePersist
    void ensureDefaults() {
        if (id == null) id = UUID.randomUUID().toString();
        active = true;
    }

    public String getId() { return id; }
    public String getRecoveryCodeHash() { return recoveryCodeHash; }
    public int getAiGenerationCount() { return aiGenerationCount; }
    public boolean isActive() { return active; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public Instant getLastRecoveredAt() { return lastRecoveredAt; }
    public void recoveredAt(Instant instant) { this.lastRecoveredAt = instant; }
}
