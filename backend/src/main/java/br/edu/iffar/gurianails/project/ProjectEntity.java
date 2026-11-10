package br.edu.iffar.gurianails.project;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "projects")
public class ProjectEntity {
    @Id
    @Column(name = "id", length = 80)
    private String id;
    @Column(name = "name", nullable = false, length = 80)
    private String name;
    @Column(name = "is_favorite", nullable = false)
    private boolean favorite;
    @Column(name = "design_json", nullable = false, columnDefinition = "LONGTEXT")
    private String designJson;
    @Column(name = "created_at", nullable = false, updatable = false, insertable = false)
    private Instant createdAt;
    @Column(name = "updated_at", nullable = false, insertable = false, updatable = false)
    private Instant updatedAt;

    protected ProjectEntity() {}

    public ProjectEntity(String id, String name, boolean favorite, String designJson) {
        this.id = id; this.name = name; this.favorite = favorite; this.designJson = designJson;
    }

    @PrePersist @PreUpdate
    void touch() { if (name == null || name.isBlank()) name = "Meu design"; }

    public String getId() { return id; }
    public String getName() { return name; }
    public boolean isFavorite() { return favorite; }
    public String getDesignJson() { return designJson; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void update(String name, boolean favorite, String designJson) { this.name = name; this.favorite = favorite; this.designJson = designJson; }
}
