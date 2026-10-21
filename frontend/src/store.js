const PROJECTS_KEY = 'guria-nails.projects.v1';
const DRAFT_KEY = 'guria-nails.draft.v1';

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
    const parsed = JSON.parse(localStorage.getItem(PROJECTS_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter((item) => item && item.id && Array.isArray(item.elements)) : [];
  } catch {
    return [];
  }
}

export function saveProjects(projects) {
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}

export function saveDraft(project) {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(project));
}

export function loadDraft() {
  try {
    const parsed = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
    return parsed && Array.isArray(parsed.elements) ? parsed : null;
  } catch {
    return null;
  }
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
