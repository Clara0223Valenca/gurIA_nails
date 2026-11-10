CREATE TABLE users (
  id CHAR(36) NOT NULL PRIMARY KEY,
  email VARCHAR(254) NOT NULL UNIQUE,
  display_name VARCHAR(80) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(24) NOT NULL DEFAULT 'CUSTOMER',
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE plans (
  id CHAR(36) NOT NULL PRIMARY KEY,
  code VARCHAR(40) NOT NULL UNIQUE,
  name VARCHAR(80) NOT NULL,
  price_minor INT UNSIGNED NOT NULL DEFAULT 0,
  currency CHAR(3) NOT NULL DEFAULT 'BRL',
  monthly_generation_limit SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE user_plans (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  plan_id CHAR(36) NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'ACTIVE',
  starts_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  ends_at TIMESTAMP(6) NULL,
  CONSTRAINT fk_user_plans_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_user_plans_plan FOREIGN KEY (plan_id) REFERENCES plans(id),
  INDEX idx_user_plans_user_status (user_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE element_categories (
  id VARCHAR(48) NOT NULL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(16) NOT NULL,
  display_order SMALLINT UNSIGNED NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE catalog_elements (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  category_id VARCHAR(48) NOT NULL,
  name VARCHAR(120) NOT NULL,
  asset_path VARCHAR(500) NOT NULL,
  tags JSON NOT NULL,
  license_name VARCHAR(120) NOT NULL DEFAULT 'Guria Nails original',
  license_url VARCHAR(500) NULL,
  display_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT fk_catalog_element_category FOREIGN KEY (category_id) REFERENCES element_categories(id),
  INDEX idx_catalog_category_active (category_id, is_active, display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE nail_formats (
  id VARCHAR(48) NOT NULL PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  display_order SMALLINT UNSIGNED NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE nail_size_presets (
  id VARCHAR(8) NOT NULL PRIMARY KEY,
  label VARCHAR(24) NOT NULL,
  width_mm DECIMAL(5,2) NOT NULL,
  length_mm DECIMAL(5,2) NOT NULL,
  source_note VARCHAR(160) NOT NULL DEFAULT 'Preset editável de protótipo',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT chk_size_width CHECK (width_mm > 0),
  CONSTRAINT chk_size_length CHECK (length_mm > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE projects (
  id VARCHAR(80) NOT NULL PRIMARY KEY,
  owner_id CHAR(36) NULL,
  name VARCHAR(80) NOT NULL,
  is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
  design_json LONGTEXT NOT NULL,
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_projects_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT chk_project_json CHECK (JSON_VALID(design_json)),
  INDEX idx_projects_owner_updated (owner_id, updated_at),
  INDEX idx_projects_favorite (owner_id, is_favorite)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE assets (
  id CHAR(36) NOT NULL PRIMARY KEY,
  owner_id CHAR(36) NULL,
  project_id VARCHAR(80) NULL,
  asset_path VARCHAR(700) NOT NULL,
  mime_type VARCHAR(80) NOT NULL,
  byte_size BIGINT UNSIGNED NOT NULL,
  sha256 CHAR(64) NULL,
  license_name VARCHAR(120) NOT NULL DEFAULT 'Usuário',
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_assets_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_assets_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  INDEX idx_assets_project (project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE nail_designs (
  id CHAR(36) NOT NULL PRIMARY KEY,
  project_id VARCHAR(80) NOT NULL,
  finger_code VARCHAR(32) NOT NULL,
  nail_format_id VARCHAR(48) NOT NULL,
  width_mm DECIMAL(5,2) NOT NULL,
  length_mm DECIMAL(5,2) NOT NULL,
  background_mode VARCHAR(16) NOT NULL DEFAULT 'transparent',
  background_color CHAR(7) NULL,
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_nail_design_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_nail_design_format FOREIGN KEY (nail_format_id) REFERENCES nail_formats(id),
  INDEX idx_nail_design_project (project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE design_elements (
  id CHAR(36) NOT NULL PRIMARY KEY,
  nail_design_id CHAR(36) NULL,
  project_id VARCHAR(80) NOT NULL,
  catalog_element_id VARCHAR(64) NULL,
  layer_order SMALLINT UNSIGNED NOT NULL,
  element_json LONGTEXT NOT NULL,
  CONSTRAINT fk_design_elements_design FOREIGN KEY (nail_design_id) REFERENCES nail_designs(id) ON DELETE CASCADE,
  CONSTRAINT fk_design_elements_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_design_elements_catalog FOREIGN KEY (catalog_element_id) REFERENCES catalog_elements(id) ON DELETE SET NULL,
  CONSTRAINT chk_design_element_json CHECK (JSON_VALID(element_json)),
  INDEX idx_design_elements_project_order (project_id, layer_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE ai_generations (
  id CHAR(36) NOT NULL PRIMARY KEY,
  owner_id CHAR(36) NULL,
  project_id VARCHAR(80) NULL,
  operation VARCHAR(16) NOT NULL,
  provider_name VARCHAR(100) NOT NULL,
  model_name VARCHAR(100) NOT NULL,
  prompt_text VARCHAR(1200) NOT NULL,
  status VARCHAR(24) NOT NULL,
  result_count INT UNSIGNED NOT NULL DEFAULT 0,
  error_code VARCHAR(80) NULL,
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_ai_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_ai_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
  INDEX idx_ai_owner_created (owner_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE favorites (
  id CHAR(36) NOT NULL PRIMARY KEY,
  owner_id CHAR(36) NULL,
  project_id VARCHAR(80) NULL,
  catalog_element_id VARCHAR(64) NULL,
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_favorite_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_favorite_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_favorite_catalog FOREIGN KEY (catalog_element_id) REFERENCES catalog_elements(id) ON DELETE CASCADE,
  UNIQUE KEY uq_favorite_project (owner_id, project_id),
  UNIQUE KEY uq_favorite_catalog (owner_id, catalog_element_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO plans (id, code, name, price_minor, currency, monthly_generation_limit) VALUES
  ('00000000-0000-4000-8000-000000000001', 'free', 'Gratuito', 0, 'BRL', 0);

INSERT INTO element_categories (id, name, icon, display_order) VALUES
  ('classics', 'Clássicos', '✦', 1), ('effects', 'Efeitos', '◌', 2), ('animals', 'Animais', '♡', 3),
  ('florals', 'Florais & Laços', '❀', 4), ('fruits', 'Frutas', '◉', 5), ('seasons', 'Estações do Ano', '☼', 6),
  ('dates', 'Datas Comemorativas', '♡', 7), ('films', 'Filmes', '▣', 8), ('alternative', 'Alternativo', '☾', 9),
  ('objects', 'Objetos', '⌂', 10), ('countries', 'Países', '◎', 11);

INSERT INTO nail_formats (id, name, display_order) VALUES
  ('square', 'Quadrada', 1), ('rounded-square', 'Quadrada arredondada', 2), ('oval', 'Oval', 3),
  ('almond', 'Amendoada', 4), ('stiletto', 'Stiletto', 5), ('coffin', 'Bailarina / Coffin', 6);

INSERT INTO nail_size_presets (id, label, width_mm, length_mm) VALUES
  ('p', 'P', 8, 12), ('m', 'M', 10, 14), ('g', 'G', 12, 16);
