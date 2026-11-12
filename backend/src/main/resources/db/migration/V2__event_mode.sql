CREATE TABLE event_sessions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  recovery_code_hash CHAR(64) NOT NULL UNIQUE,
  ai_generation_count SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  last_recovered_at TIMESTAMP(6) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE event_access_tokens (
  id CHAR(36) NOT NULL PRIMARY KEY,
  session_id CHAR(36) NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMP(6) NOT NULL,
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_event_token_session FOREIGN KEY (session_id) REFERENCES event_sessions(id) ON DELETE CASCADE,
  INDEX idx_event_token_session_expiry (session_id, expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE projects
  ADD COLUMN event_session_id CHAR(36) NULL AFTER owner_id,
  ADD CONSTRAINT fk_projects_event_session FOREIGN KEY (event_session_id) REFERENCES event_sessions(id),
  ADD INDEX idx_projects_event_session_updated (event_session_id, updated_at);

ALTER TABLE ai_generations
  ADD COLUMN event_session_id CHAR(36) NULL AFTER owner_id,
  ADD CONSTRAINT fk_ai_event_session FOREIGN KEY (event_session_id) REFERENCES event_sessions(id),
  ADD INDEX idx_ai_event_session_created (event_session_id, created_at);
