package br.edu.iffar.gurianails.ai;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "ai_generations")
public class AiGenerationEntity {
    @Id
    @Column(name = "id", columnDefinition = "CHAR(36)", length = 36)
    private String id;
    @Column(name = "operation", nullable = false, length = 16)
    private String operation;
    @Column(name = "provider_name", nullable = false, length = 100)
    private String providerName;
    @Column(name = "model_name", nullable = false, length = 100)
    private String modelName;
    @Column(name = "prompt_text", nullable = false, length = 1200)
    private String promptText;
    @Column(name = "status", nullable = false, length = 24)
    private String status;
    @Column(name = "result_count", nullable = false)
    private int resultCount;
    @Column(name = "error_code", length = 80)
    private String errorCode;
    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private Instant createdAt;

    protected AiGenerationEntity() {}

    public AiGenerationEntity(String operation, String providerName, String modelName, String promptText, String status, int resultCount, String errorCode) {
        this.id = UUID.randomUUID().toString();
        this.operation = operation;
        this.providerName = providerName;
        this.modelName = modelName;
        this.promptText = promptText == null ? "" : promptText.substring(0, Math.min(1200, promptText.length()));
        this.status = status;
        this.resultCount = resultCount;
        this.errorCode = errorCode;
    }

    @PrePersist
    void ensureId() { if (id == null) id = UUID.randomUUID().toString(); }
}
