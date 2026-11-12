package br.edu.iffar.gurianails.event;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "event_access_tokens")
public class EventAccessTokenEntity {
    @Id
    @Column(name = "id", columnDefinition = "CHAR(36)", length = 36)
    private String id;
    @Column(name = "session_id", nullable = false, columnDefinition = "CHAR(36)", length = 36)
    private String sessionId;
    @Column(name = "token_hash", nullable = false, unique = true, length = 64, columnDefinition = "CHAR(64)")
    private String tokenHash;
    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;
    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private Instant createdAt;

    protected EventAccessTokenEntity() {}

    public EventAccessTokenEntity(String sessionId, String tokenHash, Instant expiresAt) {
        this.id = UUID.randomUUID().toString();
        this.sessionId = sessionId;
        this.tokenHash = tokenHash;
        this.expiresAt = expiresAt;
    }

    @PrePersist
    void ensureId() { if (id == null) id = UUID.randomUUID().toString(); }

    public String getId() { return id; }
    public String getSessionId() { return sessionId; }
    public String getTokenHash() { return tokenHash; }
    public Instant getExpiresAt() { return expiresAt; }
    public Instant getCreatedAt() { return createdAt; }
}
