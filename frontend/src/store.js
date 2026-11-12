const PROJECTS_KEY = 'guria-nails.projects.v1';
const DRAFT_KEY = 'guria-nails.draft.v1';
const NAIL_MEASUREMENTS_KEY = 'guria-nails.measurements.v1';
let storageScope = 'no-session';

function scopedKey(key) {
  return `${key}.${storageScope}`;
}

export function setStorageScope(sessionId) {
  const normalized = String(sessionId || '').trim();
  storageScope = /^[a-z0-9-]{8,80}$/i.test(normalized) ? normalized : 'no-session';
}

export function clearSessionStorage() {
  localStorage.removeItem(scopedKey(PROJECTS_KEY));
  localStorage.removeItem(scopedKey(DRAFT_KEY));
  localStorage.removeItem(scopedKey(NAIL_MEASUREMENTS_KEY));
}

export function createId() {
  return globalThis.crypto?.randomUUID?.() ?? `gn-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function deepCopy(value) {
  return JSON.parse(JSON.stringify(value));
}

export function blankProject(name = 'Meu design') {
  const now = new Date().toISOString();
  return {
    id: createId(),
    name,
    favorite: false,
    createdAt: now,
    updatedAt: now,
    format: 'Amendoada',
    finger: 'Anelar direito',
    sizePreset: 'M',
    widthMm: 10,
    lengthMm: 14,
    backgroundMode: 'transparent',
    backgroundColor: '#f2ded3',
    elements: []
  };
}

export function loadProjects() {
  try {
    const parsed = JSON.parse(localStorage.getItem(scopedKey(PROJECTS_KEY)) || '[]');
    return Array.isArray(parsed) ? parsed.filter((item) => item && item.id && Array.isArray(item.elements)) : [];
  } catch {
    return [];
  }
}

export function saveProjects(projects) {
  localStorage.setItem(scopedKey(PROJECTS_KEY), JSON.stringify(projects));
}

export function saveDraft(project) {
  localStorage.setItem(scopedKey(DRAFT_KEY), JSON.stringify(project));
}

export function loadDraft() {
  try {
    const parsed = JSON.parse(localStorage.getItem(scopedKey(DRAFT_KEY)) || 'null');
    return parsed && Array.isArray(parsed.elements) ? parsed : null;
  } catch {
    return null;
  }
}

export function loadNailMeasurements() {
  try {
    const parsed = JSON.parse(localStorage.getItem(scopedKey(NAIL_MEASUREMENTS_KEY)) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item && item.id && String(item.name || '').trim()
      && Number.isFinite(Number(item.widthMm)) && Number(item.widthMm) >= 1 && Number(item.widthMm) <= 40
      && Number.isFinite(Number(item.lengthMm)) && Number(item.lengthMm) >= 1 && Number(item.lengthMm) <= 60);
  } catch {
    return [];
  }
}

export function upsertNailMeasurement(measurement, measurements = loadNailMeasurements()) {
  const name = String(measurement?.name || '').trim().slice(0, 40);
  const widthMm = Number(measurement?.widthMm);
  const lengthMm = Number(measurement?.lengthMm);
  if (!name) throw new Error('Dê um nome para esta medida.');
  if (!Number.isFinite(widthMm) || widthMm < 1 || widthMm > 40) throw new Error('A largura deve ficar entre 1 e 40 mm.');
  if (!Number.isFinite(lengthMm) || lengthMm < 1 || lengthMm > 60) throw new Error('O comprimento deve ficar entre 1 e 60 mm.');
  const now = new Date().toISOString();
  const existing = measurements.find((item) => item.id === measurement.id);
  const saved = {
    id: existing?.id || measurement.id || createId(),
    name,
    widthMm: Math.round(widthMm * 10) / 10,
    lengthMm: Math.round(lengthMm * 10) / 10,
    createdAt: existing?.createdAt || now,
    updatedAt: now
  };
  const next = [saved, ...measurements.filter((item) => item.id !== saved.id)];
  localStorage.setItem(scopedKey(NAIL_MEASUREMENTS_KEY), JSON.stringify(next));
  return next;
}

export function deleteNailMeasurement(measurementId, measurements = loadNailMeasurements()) {
  const next = measurements.filter((item) => item.id !== measurementId);
  localStorage.setItem(scopedKey(NAIL_MEASUREMENTS_KEY), JSON.stringify(next));
  return next;
}

export function upsertProject(project, projects = loadProjects()) {
  const now = new Date().toISOString();
  const existing = projects.find((item) => item.id === project.id);
  const saved = { ...deepCopy(project), updatedAt: now, createdAt: existing?.createdAt ?? project.createdAt ?? now };
  const next = [saved, ...projects.filter((item) => item.id !== saved.id)];
  saveProjects(next);
  saveDraft(saved);
  return { saved, projects: next };
}

export function duplicateProject(project, projects = loadProjects()) {
  const copy = deepCopy(project);
  copy.id = createId();
  copy.name = `${project.name} — cópia`;
  copy.favorite = false;
  copy.createdAt = new Date().toISOString();
  copy.updatedAt = copy.createdAt;
  const next = [copy, ...projects];
  saveProjects(next);
  return next;
}

export function renameProject(projectId, name, projects = loadProjects()) {
  const cleanName = String(name || '').trim().slice(0, 80);
  if (!cleanName) throw new Error('Dê um nome ao projeto antes de salvar.');
  const next = projects.map((project) => project.id === projectId
    ? { ...project, name: cleanName, updatedAt: new Date().toISOString() }
    : project);
  saveProjects(next);
  return next;
}

export function toggleProjectFavorite(projectId, projects = loadProjects()) {
  const next = projects.map((project) => project.id === projectId
    ? { ...project, favorite: !project.favorite, updatedAt: new Date().toISOString() }
    : project);
  saveProjects(next);
  return next;
}

export function deleteProject(projectId, projects = loadProjects()) {
  const next = projects.filter((project) => project.id !== projectId);
  saveProjects(next);
  return next;
}
