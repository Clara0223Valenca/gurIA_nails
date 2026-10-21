import {
  blankProject, createId, deleteProject, duplicateProject, loadDraft, loadProjects,
  renameProject, saveDraft, saveProjects, toggleProjectFavorite, upsertProject
} from './store.js';
import { flattenCatalog, loadCatalog, loadElementSvg } from './catalog.js';
import { bindEditor, renderEditor, addImageLayer, artworkSvg, resetEditorForProject } from './editor.js';
import { clamp, formatMeasurement } from './geometry.js';
import { createSheetPng, createStickerPng, downloadBlob, previewLayout, printSheet } from './print.js';

const app = document.querySelector('#app');
const toastRegion = document.querySelector('#toast-region');
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const safeName = (name) => String(name || 'guria-nails').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9_-]+/gi, '-').replace(/^-|-$/g, '').slice(0, 48) || 'guria-nails';

const state = {
  route: 'create',
  catalog: null,
  settings: null,
  apiBase: 'http://localhost:8080/api',
  backendAvailable: false,
  aiAvailable: false,
  aiStatusConnected: false,
  aiProvider: '',
  projects: [],
  project: null,
  printOptions: null,
  prompt: '',
  quantity: 1,
  results: [],
  busy: false,
  pendingImprove: null,
  profileName: localStorage.getItem('guria-nails.profile-name') || 'Minha conta',
  projectFilter: 'recentes',
  drawerOpen: false
};

function notify(message, isError = false) {
  const toast = document.createElement('div');
  toast.className = `toast${isError ? ' error' : ''}`;
  toast.textContent = message;
  toastRegion.append(toast);
  setTimeout(() => toast.remove(), 3800);
}

function persistDraft(project = state.project) {
  if (!project) return;
  try { saveDraft(project); }
  catch { notify('O navegador ficou sem espaço para salvar o rascunho. Exporte a arte em PNG e remova imagens grandes.', true); }
}

function svgDataUri(project) {
  const svg = artworkSvg(project, project.backgroundMode === 'color');
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function thumb(project) {
  if (!project?.elements?.length) return '<span class="project-placeholder">✦</span>';
  const image = project.elements.findLast?.((item) => item.type === 'image' && item.dataUrl);
  const source = image && /^data:image\/(?:png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(image.dataUrl) ? image.dataUrl : svgDataUri(project);
  return `<img src="${source}" alt="Prévia de ${escapeHtml(project.name)}"/>`;
}

const navItems = [
  ['create', '＋', 'Criar'], ['guria', '✦', 'GurIA'], ['projects', '▣', 'Meus projetos'], ['profile', '♡', 'Perfil']
];

function pageName() {
  if (state.route === 'editor') return 'Editor de design';
  if (state.route === 'print') return 'Cartela para impressão';
  return ({ create: 'Personalize seu design de unhas', guria: 'Crie com a GurIA', projects: 'Meus projetos', profile: 'Seu espaço' })[state.route] || 'Guria Nails';
}

function shell(content) {
  return `<div class="app-shell"><aside class="sidebar${state.drawerOpen ? ' open' : ''}" id="sidebar"><a class="brand brand-home" href="#" aria-label="Guria Nails · início"><img src="/assets/guria-app-icon.png" alt=""/><span class="brand-copy"><span class="brand-name">GURIA nails</span><span class="brand-tag">beleza em cada detalhe</span></span></a><div class="nav-label">Seu ateliê</div><nav class="primary-nav" aria-label="Navegação principal">${navItems.map(([route, icon, label]) => `<button class="nav-link" type="button" data-route="${route}" aria-current="${(state.route === route || (['editor', 'print'].includes(state.route) && route === 'create')) ? 'page' : 'false'}"><span class="nav-icon" aria-hidden="true">${icon}</span>${label}</button>`).join('')}</nav><div class="sidebar-spacer"></div><div class="side-note"><strong>Seu ateliê, no seu ritmo</strong>Crie com os elementos da biblioteca e monte uma cartela no tamanho desejado.</div><div class="sidebar-footer">Rascunhos guardados neste navegador</div></aside><button class="drawer-backdrop${state.drawerOpen ? ' visible' : ''}" type="button" aria-label="Fechar menu" data-action="close-drawer"></button><main class="main-column"><header class="topbar"><div class="topbar-left"><button class="icon-button mobile-menu" type="button" aria-label="Abrir menu" data-action="toggle-drawer">☰</button><img class="topbar-mark" src="/assets/guria-app-icon.png" alt=""/><div class="topbar-title"><p class="eyebrow">Guria Nails · ateliê digital</p><h1 class="page-heading">${escapeHtml(pageName())}</h1></div></div><div class="topbar-right"><span class="status-pill"><span class="status-dot"></span>Salvo neste dispositivo</span><button class="avatar" type="button" data-route="profile" aria-label="Abrir perfil">${escapeHtml((state.profileName.trim()[0] || 'G').toUpperCase())}</button></div></header><div class="content" id="view-content">${content}</div></main></div>`;
}

function recentRows(projects) {
  if (!projects.length) return '<div class="empty-state"><span class="empty-icon">♡</span><strong>Seu primeiro design começa aqui</strong><span>Crie uma arte ou personalize um dos elementos da biblioteca.</span></div>';
  return `<div class="project-list">${projects.slice(0, 3).map((project) => `<article class="project-row"><div class="project-thumb">${thumb(project)}</div><div><h3>${escapeHtml(project.name)}</h3><p>${project.elements.length} camadas · atualizado ${new Date(project.updatedAt || project.createdAt).toLocaleDateString('pt-BR')}</p></div><button class="button button-secondary button-sm" type="button" data-open-project="${escapeHtml(project.id)}">Abrir</button></article>`).join('')}</div>`;
}

function createView() {
  const current = state.project;
  return `<section class="hero"><div class="hero-copy"><div class="hero-kicker">✦ <span>Um detalhe, do seu jeito</span></div><h2 class="hero-title">Personalize seu <em>design de unhas</em></h2><p class="hero-description">Monte sua arte com elementos delicados, ajuste o tamanho da unha e prepare tudo para imprimir em casa.</p><div class="hero-actions"><button class="button button-primary" type="button" data-action="open-editor">＋ ${current?.elements?.length ? 'Continuar meu design' : 'Criar meu primeiro design'}</button><button class="button button-secondary" type="button" data-route="guria">✦ Conversar com a GurIA</button></div></div><div class="hero-art"><img src="/assets/guria-wordmark.png" alt="Guria Nails — beleza em cada detalhe"/></div></section><section class="home-grid"><article class="card projects-preview"><div class="section-head"><div><h2 class="section-heading">Continue de onde parou</h2><p class="section-subtitle">Seus trabalhos recentes ficam guardados neste navegador.</p></div><button class="button button-quiet button-sm" type="button" data-route="projects">Ver projetos</button></div>${recentRows(state.projects)}</article><aside class="card quick-card"><h2 class="section-heading">Seu próximo passo</h2><p class="section-subtitle">Comece pelo editor ou experimente uma ideia pronta da biblioteca.</p><div class="quick-actions"><button class="quick-action" type="button" data-action="open-editor"><span class="quick-action-icon">✎</span><span><strong>Montar no editor</strong><small>Arraste, pinte e ajuste as camadas</small></span></button><button class="quick-action" type="button" data-route="guria"><span class="quick-action-icon">✦</span><span><strong>Descrever uma ideia</strong><small>Geração de IA requer um provider configurado</small></span></button><button class="quick-action" type="button" data-route="projects"><span class="quick-action-icon">▤</span><span><strong>Preparar impressão</strong><small>PNG transparente ou cartela A4</small></span></button></div><p class="field-hint" style="margin-top:14px">${state.aiAvailable ? 'Provider de IA configurado.' : 'A IA ainda não está configurada neste ambiente.'}</p></aside></section>`;
}

const samples = [
  { title: 'Jardim delicado', description: 'Flores e folhas em tons terrosos.', ids: ['daisy', 'leaves', 'butterfly'] },
  { title: 'Noite cintilante', description: 'Lua e pequenos brilhos para compor.', ids: ['moon', 'star', 'sparkles'] },
  { title: 'Doce de verão', description: 'Frutinhas em uma composição leve.', ids: ['strawberry', 'cherries', 'heart'] }
];

function guriaView() {
  const status = state.aiAvailable
    ? '<span class="status-pill"><span class="status-dot"></span>Provider configurado</span>'
    : `<span class="status-pill">${state.aiStatusConnected ? 'Chave de IA necessária' : 'API local indisponível'}</span>`;
  const setupMessage = state.aiAvailable
    ? 'A geração usa o serviço configurado e pode depender de saldo, limites e disponibilidade do modelo.'
    : state.aiStatusConnected
      ? state.aiProvider.includes('Pollinations')
        ? 'Adicione a chave Pollinations em GURIA_AI_API_KEY no arquivo .env.xampp e reinicie o backend. A geração requer saldo/créditos no provedor.'
        : 'Configure a chave ou endpoint do provider no arquivo .env.xampp e reinicie o backend.'
      : 'Inicie o backend local e confirme se ele está acessível em http://127.0.0.1:8080.';
  const resultCards = state.results.length ? `<h2 class="section-heading" style="margin-top:28px">Resultados do provider</h2><div class="generation-grid">${state.results.map((item, index) => `<article class="generation-card"><div class="generation-art"><img src="${item.dataUrl}" alt="Resultado de arte ${index + 1}"/></div><div class="generation-info"><h3>Variação ${index + 1}</h3><p>Gerada pelo provider configurado.</p><div class="generation-actions"><button type="button" class="button button-primary button-sm" data-use-result="${index}">Abrir no editor</button></div></div></article>`).join('')}</div>` : '';
  return `<section class="page-intro"><div class="section-head"><div><h2 class="section-heading">Conte a ideia. A gente cuida dos detalhes.</h2><p class="section-subtitle">A GurIA pode criar desenhos 2D de nail art e personalizar o resultado conforme sua unha.</p></div>${status}</div></section><div class="guria-layout"><section class="card prompt-card"><form id="generation-form"><div class="field"><label for="design-prompt">Como você imagina sua arte?</label><textarea id="design-prompt" name="prompt" maxlength="1200" required placeholder="Ex.: margaridas pequenas em tons de pêssego, fundo transparente, composição central...">${escapeHtml(state.prompt)}</textarea><p class="field-hint">Descreva cores, estilo e elementos. A arte gerada precisa ser conferida no editor antes da impressão.</p></div><div class="prompt-examples"><button type="button" class="prompt-chip" data-prompt="margaridas delicadas em rosa e marrom, com folhas pequenas">Margaridas delicadas</button><button type="button" class="prompt-chip" data-prompt="borboletas minimalistas com linhas finas e fundo transparente">Borboletas minimalistas</button><button type="button" class="prompt-chip" data-prompt="frutinhas de verão em estilo fofo, com cerejas e morangos">Frutinhas de verão</button></div><div class="prompt-options"><div class="field"><label for="guria-format">Formato</label><select id="guria-format">${state.settings.formats.map((format) => `<option ${state.project.format === format ? 'selected' : ''}>${escapeHtml(format)}</option>`).join('')}</select></div><div class="field"><label for="guria-size">Tamanho</label><select id="guria-size">${state.project.sizePreset === 'Personalizado' ? '<option value="Personalizado" selected>Personalizado · medidas atuais</option>' : ''}${state.settings.presets.map((preset) => `<option value="${escapeHtml(preset.label)}" ${state.project.sizePreset === preset.label ? 'selected' : ''}>${escapeHtml(preset.label)} · ${preset.width} × ${preset.length} mm</option>`).join('')}</select></div><div class="field"><label for="guria-quantity">Variações</label><input id="guria-quantity" type="number" min="1" max="4" value="${clamp(state.quantity, 1, 4)}"/></div></div><div class="button-row" style="margin-top:17px"><button class="button button-primary" type="submit" ${state.busy ? 'disabled' : ''}>✦ ${state.busy ? 'Criando…' : 'Criar arte com IA'}</button><button class="button button-secondary" type="button" data-action="retry-generation" ${state.busy || !state.prompt.trim() ? 'disabled' : ''}>Tentar novamente</button></div><p id="generation-status" class="ai-status${state.busy ? '' : ''}" aria-live="polite">${state.busy ? 'Enviando sua descrição ao provider…' : setupMessage}</p></form>${resultCards}</section><aside class="card ai-side-card"><h3>Referência de unha</h3><p class="small muted">Use o medidor no editor para estimar as medidas com uma foto e régua milimetrada.</p><ul class="rules-list"><li>Desenhos 2D para nail art</li><li>Variações em quantidade limitada</li><li>Revisão e edição antes de imprimir</li><li>Fundo transparente quando o provider oferecer PNG</li></ul><div class="divider"></div><h3>Ideias para começar</h3><p class="small muted">São modelos locais da biblioteca; não foram gerados por IA.</p>${samples.map((sample, index) => `<article class="tutorial-item"><strong>${escapeHtml(sample.title)} <span class="demo-label">modelo local</span></strong><p>${escapeHtml(sample.description)}</p><button class="button button-secondary button-sm" style="margin-top:9px" type="button" data-sample="${index}">Personalizar modelo</button></article>`).join('')}</aside></div>`;
}

function editorView() {
  return renderEditor(state.project, state.catalog, state.settings);
}

function projectCards() {
  let projects = [...state.projects];
  if (state.projectFilter === 'favoritos') projects = projects.filter((project) => project.favorite);
  projects.sort((a, b) => state.projectFilter === 'favoritos' ? (b.updatedAt || '').localeCompare(a.updatedAt || '') : (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  if (!projects.length) return '<div class="empty-state"><span class="empty-icon">♡</span><strong>Nenhum projeto por aqui ainda</strong><span>Salve um design para poder continuar depois.</span></div>';
  return `<div class="projects-grid">${projects.map((project) => `<article class="card project-card"><div class="project-preview">${thumb(project)}<button class="project-favorite" type="button" title="${project.favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}" aria-label="${project.favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}" data-favorite="${escapeHtml(project.id)}">${project.favorite ? '♥' : '♡'}</button></div><div class="project-card-body"><h3>${escapeHtml(project.name)}</h3><p>${project.elements.length} camadas · ${escapeHtml(project.format || 'Sem formato')}</p><p style="margin-top:5px">${formatMeasurement(project.widthMm)} × ${formatMeasurement(project.lengthMm)}</p><div class="project-card-actions"><button class="button button-primary button-sm" type="button" data-open-project="${escapeHtml(project.id)}">Abrir</button><button class="button button-secondary button-sm" type="button" data-duplicate-project="${escapeHtml(project.id)}">Duplicar</button><button class="button button-secondary button-sm" type="button" data-rename-project="${escapeHtml(project.id)}">Renomear</button><button class="button button-danger button-sm" type="button" data-delete-project="${escapeHtml(project.id)}">Excluir</button><button class="button button-secondary button-sm" type="button" data-print-project="${escapeHtml(project.id)}">Imprimir</button></div></div></article>`).join('')}</div>`;
}

function projectsView() {
  return `<section class="page-intro"><div class="section-head"><div><h2 class="section-heading">Seus designs, sempre editáveis</h2><p class="section-subtitle">Projetos guardados localmente neste navegador, com camadas preservadas.</p></div><button class="button button-primary" type="button" data-action="new-project">＋ Novo projeto</button></div></section><div class="projects-controls"><div class="field"><label for="project-filter">Exibir</label><select id="project-filter"><option value="recentes" ${state.projectFilter === 'recentes' ? 'selected' : ''}>Mais recentes</option><option value="favoritos" ${state.projectFilter === 'favoritos' ? 'selected' : ''}>Favoritos</option></select></div></div>${projectCards()}`;
}

function profileView() {
  return `<section class="page-intro"><h2 class="section-heading">Seu ateliê pessoal</h2><p class="section-subtitle">Preferências e dados de uso local.</p></section><div class="profile-grid"><section class="card profile-card"><h3>Perfil local</h3><p class="small muted">Este protótipo não cria conta nem autentica em um servidor. O nome abaixo só personaliza a interface neste navegador.</p><div class="field" style="margin-top:16px"><label for="profile-name">Como podemos chamar você?</label><input id="profile-name" maxlength="60" value="${escapeHtml(state.profileName)}"/></div><button class="button button-primary" style="margin-top:12px" type="button" data-action="save-profile">Salvar preferência</button><p class="profile-value">${state.projects.length} projeto(s) salvo(s) neste navegador</p></section><section class="card profile-card"><h3>Configuração de IA</h3><p class="small muted">${state.aiAvailable ? 'Endpoint configurado; a disponibilidade real é verificada ao solicitar geração.' : 'Nenhum provider respondeu. Configure o backend e o provider antes de solicitar uma geração.'}</p><p class="profile-value">API: ${escapeHtml(state.apiBase)}</p><div class="tutorial-list"><article class="tutorial-item"><strong>Dados locais</strong><p>Os projetos usam o armazenamento do navegador. Exporte uma cópia antes de limpar dados ou trocar de dispositivo.</p></article><article class="tutorial-item"><strong>Medidas de referência</strong><p>Os tamanhos P, M e G são presets editáveis de partida. Não substituem uma medição individual.</p></article><article class="tutorial-item"><strong>Integração pendente</strong><p>Login e conta em nuvem ainda exigem etapas futuras. A medição por câmera fica disponível no editor.</p></article></div><div class="button-row" style="margin-top:15px"><button class="button button-secondary" type="button" data-action="export-backup">Exportar backup JSON</button><button class="button button-secondary" type="button" data-action="import-backup">Importar backup JSON</button><input id="backup-file" class="upload-input" type="file" accept="application/json,.json"/></div></section></div>`;
}

function printView() {
  const project = state.project;
  const options = state.printOptions;
  const layout = previewLayout(options, project);
  const paperW = options.paperWidthMm; const paperH = options.paperHeightMm;
  const image = svgDataUri({ ...project, widthMm: options.stickerWidthMm, lengthMm: options.stickerHeightMm });
  const stickers = Array.from({ length: layout.placed }, (_, index) => {
    const left = options.marginHorizontalMm + (index % Math.max(layout.columns, 1)) * (options.stickerWidthMm + options.spacingMm);
    const top = options.marginVerticalMm + Math.floor(index / Math.max(layout.columns, 1)) * (options.stickerHeightMm + options.spacingMm);
    return `<img class="paper-sticker" alt="Adesivo ${index + 1}" src="${image}" style="left:${left / paperW * 100}%;top:${top / paperH * 100}%;width:${options.stickerWidthMm / paperW * 100}%;height:${options.stickerHeightMm / paperH * 100}%"/>`;
  }).join('');
  return `<section class="page-intro"><div class="section-head"><div><h2 class="section-heading">Cartela em tamanho real</h2><p class="section-subtitle">A prévia posiciona as cópias em A4 com as medidas definidas em milímetros.</p></div><button class="button button-secondary" type="button" data-action="back-to-editor">← Voltar ao editor</button></div></section><div class="print-layout"><section class="card print-preview-card"><div class="paper-preview" style="--cols:${layout.columns};aspect-ratio:${paperW}/${paperH};padding:0">${stickers}</div></section><aside class="card print-settings"><h3>Configurar cartela</h3><div class="field"><label for="sticker-quantity">Quantidade</label><input id="sticker-quantity" type="number" min="1" max="200" value="${options.quantity}" data-print-field="quantity"/></div><div class="field"><label for="sticker-width-mm">Largura do adesivo · mm</label><input id="sticker-width-mm" type="number" min="1" max="40" step="0.1" value="${options.stickerWidthMm}" data-print-field="stickerWidthMm"/></div><div class="field"><label for="sticker-height-mm">Comprimento do adesivo · mm</label><input id="sticker-height-mm" type="number" min="1" max="60" step="0.1" value="${options.stickerHeightMm}" data-print-field="stickerHeightMm"/></div><div class="field"><label for="margin-horizontal-mm">Margem horizontal · mm</label><input id="margin-horizontal-mm" type="number" min="0" max="30" step="0.5" value="${options.marginHorizontalMm}" data-print-field="marginHorizontalMm"/></div><div class="field"><label for="margin-vertical-mm">Margem vertical · mm</label><input id="margin-vertical-mm" type="number" min="0" max="30" step="0.5" value="${options.marginVerticalMm}" data-print-field="marginVerticalMm"/></div><div class="field"><label for="spacing-mm">Espaço entre adesivos · mm</label><input id="spacing-mm" type="number" min="0" max="20" step="0.5" value="${options.spacingMm}" data-print-field="spacingMm"/></div><div class="field"><label for="print-dpi">Resolução</label><select id="print-dpi" data-print-field="dpi"><option value="150" ${options.dpi === 150 ? 'selected' : ''}>150 DPI · rascunho</option><option value="300" ${options.dpi === 300 ? 'selected' : ''}>300 DPI · impressão</option><option value="600" ${options.dpi === 600 ? 'selected' : ''}>600 DPI · alta</option></select></div><div class="print-result">Folha A4 · ${layout.columns} coluna(s) × ${layout.rows} fileira(s)<br/>Cabem ${layout.capacity} · serão impressas ${layout.placed} de ${options.quantity} arte(s)${layout.overflow ? `<br/><strong>Faltam ${layout.overflow} espaços.</strong>` : ''}<br/>Fundo: ${project.backgroundMode === 'color' ? 'cor escolhida' : 'transparente'}</div><div class="button-row"><button class="button button-primary button-full" type="button" data-action="download-sheet" ${layout.placed ? '' : 'disabled'}>Baixar cartela PNG</button><button class="button button-secondary button-full" type="button" data-action="print-sheet" ${layout.placed ? '' : 'disabled'}>Imprimir / salvar PDF</button><button class="button button-quiet button-full" type="button" data-action="download-sticker">Baixar adesivo PNG</button></div><p class="field-hint" style="margin-top:11px">O PNG recebe metadados de resolução. Na janela de impressão, use escala 100% e desative “ajustar à página”.</p></aside></div>`;
}

function render() {
  const content = state.route === 'guria' ? guriaView()
    : state.route === 'projects' ? projectsView()
      : state.route === 'profile' ? profileView()
        : state.route === 'editor' ? editorView()
          : state.route === 'print' ? printView() : createView();
  app.innerHTML = shell(content);
  if (state.route === 'editor') {
    const container = app.querySelector('#view-content');
    window.guriaSettings = state.settings;
    bindEditor(container, state.project, state.catalog, {
      settings: state.settings,
      onChange: persistDraft,
      onSave: () => saveCurrentProject(),
      onPrint: (project) => openPrint(project),
      onImprove: (project) => improveWithAi(project),
      onStateChange: render,
      notify
    });
  }
}

function show(route) {
  state.drawerOpen = false;
  state.route = route;
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function openProject(project) {
  state.project = structuredClone(project);
  persistDraft(state.project);
  resetEditorForProject(state.project);
  show('editor');
}

function startNewProject() {
  state.project = blankProject();
  persistDraft(state.project);
  resetEditorForProject(state.project);
  show('editor');
}

function saveCurrentProject() {
  try {
    const result = upsertProject(state.project, state.projects);
    state.projects = result.projects; state.project = result.saved;
    if (state.backendAvailable) {
      remoteSave(state.project).then((saved) => notify(saved ? 'Projeto salvo no banco de dados e neste navegador.' : 'Projeto salvo neste navegador; a sincronização do backend falhou.', !saved));
    } else notify('Projeto salvo neste navegador. O backend/MySQL ainda não está conectado.');
    render();
  } catch { notify('O navegador não conseguiu salvar o projeto.', true); }
}

async function remoteSave(project) {
  try {
    const response = await fetch(`${state.apiBase}/projects/${encodeURIComponent(project.id)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(project)
    });
    return response.ok;
  } catch { return false; }
}

async function remoteDelete(projectId) {
  try { return (await fetch(`${state.apiBase}/projects/${encodeURIComponent(projectId)}`, { method: 'DELETE' })).ok; }
  catch { return false; }
}

async function syncProjects() {
  try {
    const response = await fetch(`${state.apiBase}/projects`, { signal: AbortSignal.timeout(3500) });
    if (!response.ok) return;
    const remoteRows = await response.json();
    if (!Array.isArray(remoteRows)) return;
    state.backendAvailable = true;
    const remote = new Map(remoteRows.filter((project) => project?.id && Array.isArray(project.elements)).map((project) => [project.id, project]));
    const local = new Map(state.projects.map((project) => [project.id, project]));
    for (const project of local.values()) {
      const serverProject = remote.get(project.id);
      const localIsNewer = !serverProject || new Date(project.updatedAt || 0) > new Date(serverProject.updatedAt || 0);
      if (localIsNewer) await remoteSave(project);
      else local.set(project.id, serverProject);
    }
    for (const project of remote.values()) if (!local.has(project.id)) local.set(project.id, project);
    state.projects = [...local.values()].sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
    saveProjects(state.projects);
  } catch { state.backendAvailable = false; }
}

function openPrint(project = state.project) {
  state.project = project;
  const preset = state.settings.print;
  state.printOptions = {
    paperWidthMm: preset.width, paperHeightMm: preset.height,
    quantity: 10, stickerWidthMm: Number(project.widthMm) || 10, stickerHeightMm: Number(project.lengthMm) || 14,
    marginHorizontalMm: preset.horizontalMargin, marginVerticalMm: preset.verticalMargin, spacingMm: preset.spacing, dpi: preset.dpi
  };
  show('print');
}

async function generateWithAi(prompt = state.prompt, { improve = false, project = state.project } = {}) {
  if (!state.aiAvailable) throw new Error('O provider de IA não está disponível. Configure o backend e um serviço de geração antes de tentar novamente.');
  const endpoint = `${state.apiBase}/ai/${improve ? 'improve' : 'generate'}`;
  let referenceImage;
  if (improve) {
    const png = await createStickerPng(project, state.settings.print.dpi);
    referenceImage = await blobToDataUrl(png);
  }
  const response = await fetch(endpoint, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: prompt.trim(), quantity: improve ? 1 : clamp(state.quantity, 1, 4),
      format: project.format, finger: project.finger,
      widthMm: project.widthMm, lengthMm: project.lengthMm,
      background: project.backgroundMode === 'transparent' ? 'transparent' : project.backgroundColor,
      referenceImage,
    })
  });
  let payload;
  try { payload = await response.json(); } catch { throw new Error('O serviço de IA respondeu em um formato inválido.'); }
  if (!response.ok) throw new Error(payload.message || `O serviço de IA respondeu com erro (${response.status}).`);
  const rows = Array.isArray(payload.images) ? payload.images : Array.isArray(payload.results) ? payload.results : [];
  const results = rows.map((item) => typeof item === 'string' ? { dataUrl: item } : item).filter((item) => typeof item?.dataUrl === 'string' && /^data:image\/(png|jpeg|webp);base64,/i.test(item.dataUrl));
  if (!results.length) throw new Error('O serviço não retornou imagens válidas. Nenhum resultado foi inventado.');
  if (results.some((item) => item.dataUrl.length > 18_000_000)) throw new Error('Uma imagem retornada é grande demais para armazenar neste navegador.');
  return Promise.all(results.slice(0, improve ? 1 : clamp(state.quantity, 1, 4)).map(async (item) => ({ ...item, dataUrl: await compactImage(item.dataUrl) })));
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error('Não foi possível preparar a referência.')); reader.readAsDataURL(blob); });
}

async function compactImage(source) {
  const image = new Image(); image.src = source; await image.decode();
  const scale = Math.min(1200 / image.naturalWidth, 1200 / image.naturalHeight, 1);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
  const compressed = canvas.toDataURL('image/webp', 0.9);
  return compressed.startsWith('data:image/webp') ? compressed : source;
}

async function handleGeneration(event) {
  event.preventDefault();
  const prompt = app.querySelector('#design-prompt').value.trim();
  if (!prompt) return;
  state.prompt = prompt; state.quantity = clamp(Number(app.querySelector('#guria-quantity').value) || 1, 1, 4); state.busy = true;
  state.project.format = app.querySelector('#guria-format').value;
  const preset = state.settings.presets.find((item) => item.label === app.querySelector('#guria-size').value);
  if (preset) { state.project.sizePreset = preset.label; state.project.widthMm = preset.width; state.project.lengthMm = preset.length; }
  render();
  try {
    state.results = await generateWithAi(prompt);
    state.busy = false; render();
  } catch (error) {
    state.busy = false; render();
    const status = app.querySelector('#generation-status');
    if (status) { status.textContent = error.message || 'A geração falhou.'; status.classList.add('error'); }
    notify(error.message || 'A geração falhou.', true);
  }
}

async function improveWithAi(project) {
  const status = app.querySelector('#improve-status');
  if (!status) return;
  status.className = 'ai-status'; status.textContent = 'Enviando uma cópia da arte ao provider configurado…';
  try {
    const [result] = await generateWithAi('', { improve: true, project });
    state.pendingImprove = result.dataUrl;
    status.innerHTML = `Resultado pronto para conferência. O original continua salvo. <div class="generation-art" style="margin:10px 0;border-radius:12px"><img src="${result.dataUrl}" alt="Prévia do aperfeiçoamento"/></div><button class="button button-secondary button-sm" type="button" data-accept-improve>Adicionar resultado como nova camada</button>`;
    status.classList.add('success');
  } catch (error) { status.textContent = error.message || 'Não foi possível aperfeiçoar a arte.'; status.classList.add('error'); }
}

async function addSample(index) {
  const sample = samples[index];
  if (!sample) return;
  const project = blankProject(sample.title);
  for (let position = 0; position < sample.ids.length; position++) {
    const item = flattenCatalog(state.catalog).find((element) => element.id === sample.ids[position]);
    if (!item) continue;
    const svg = await loadElementSvg(item.asset);
    project.elements.push({ id: createId(), type: 'icon', name: item.name, category: item.category, asset: item.asset, svg, color: ['#70442e', '#a56e58', '#c58d70'][position % 3], x: 108 + position * 50, y: 190 + (position % 2) * 48, width: 70, height: 70, rotation: position % 2 ? -8 : 0 });
  }
  state.project = project; persistDraft(project); resetEditorForProject(project); show('editor');
  notify(`Modelo local “${sample.title}” aberto para personalização.`);
}

function backup() {
  const backup = { format: 'guria-nails-backup', version: 1, exportedAt: new Date().toISOString(), projects: state.projects };
  downloadBlob(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }), 'guria-nails-backup.json');
}

async function importBackup(file) {
  if (!file || file.size > 20 * 1024 * 1024) throw new Error('Escolha um backup JSON de até 20 MB.');
  const parsed = JSON.parse(await file.text());
  const projects = Array.isArray(parsed) ? parsed : parsed.projects;
  if (!Array.isArray(projects) || projects.some((project) => !project?.id || !Array.isArray(project.elements))) throw new Error('Esse arquivo não contém projetos Guria Nails válidos.');
  state.projects = projects.slice(0, 500);
  saveProjects(state.projects);
  notify(`${state.projects.length} projeto(s) importado(s).`); render();
}

function setPrintField(control) {
  const key = control.dataset.printField;
  const limits = { quantity: [1, 200], stickerWidthMm: [1, 40], stickerHeightMm: [1, 60], marginHorizontalMm: [0, 30], marginVerticalMm: [0, 30], spacingMm: [0, 20], dpi: [150, 600] };
  const [min, max] = limits[key] || [0, 1000];
  const value = key === 'dpi' ? Number(control.value) : clamp(Number(control.value) || min, min, max);
  state.printOptions[key] = value;
  render();
}

app.addEventListener('click', async (event) => {
  const target = event.target.closest('button, a, [data-use-result], [data-sample]');
  if (!target) return;
  if (target.matches('[data-route]')) { event.preventDefault(); show(target.dataset.route); return; }
  if (target.matches('.brand-home')) { event.preventDefault(); show('create'); return; }
  if (target.dataset.prompt) { state.prompt = target.dataset.prompt; const input = app.querySelector('#design-prompt'); if (input) input.value = state.prompt; return; }
  if (target.dataset.sample !== undefined) { addSample(Number(target.dataset.sample)).catch((error) => notify(error.message, true)); return; }
  if (target.dataset.openProject) { const project = state.projects.find((item) => item.id === target.dataset.openProject); if (project) openProject(project); return; }
  if (target.dataset.favorite) { state.projects = toggleProjectFavorite(target.dataset.favorite, state.projects); const changed = state.projects.find((item) => item.id === target.dataset.favorite); if (changed) remoteSave(changed); render(); return; }
  if (target.dataset.duplicateProject) { state.projects = duplicateProject(state.projects.find((item) => item.id === target.dataset.duplicateProject), state.projects); remoteSave(state.projects[0]); notify('Cópia criada.'); render(); return; }
  if (target.dataset.renameProject) { const project = state.projects.find((item) => item.id === target.dataset.renameProject); const name = window.prompt('Novo nome para o projeto:', project?.name || ''); if (name !== null) { try { state.projects = renameProject(target.dataset.renameProject, name, state.projects); remoteSave(state.projects.find((item) => item.id === target.dataset.renameProject)); render(); } catch (error) { notify(error.message, true); } } return; }
  if (target.dataset.deleteProject) { const project = state.projects.find((item) => item.id === target.dataset.deleteProject); if (project && window.confirm(`Excluir “${project.name}”? Esta ação não pode ser desfeita.`)) { state.projects = deleteProject(project.id, state.projects); saveProjects(state.projects); if (state.backendAvailable) remoteDelete(project.id); notify('Projeto excluído.'); render(); } return; }
  if (target.dataset.printProject) { const project = state.projects.find((item) => item.id === target.dataset.printProject); if (project) openPrint(structuredClone(project)); return; }
  if (target.dataset.useResult !== undefined) {
    const result = state.results[Number(target.dataset.useResult)];
    if (!result) return;
    const project = blankProject('Arte da GurIA');
    project.format = state.project.format; project.finger = state.project.finger; project.sizePreset = state.project.sizePreset; project.widthMm = state.project.widthMm; project.lengthMm = state.project.lengthMm;
    await addImageLayer(project, result.dataUrl, 'Resultado da GurIA'); state.project = project; persistDraft(project); resetEditorForProject(project); show('editor'); return;
  }
  if (target.hasAttribute('data-accept-improve') && state.pendingImprove) {
    await addImageLayer(state.project, state.pendingImprove, 'Aperfeiçoamento GurIA'); persistDraft(state.project); state.pendingImprove = null; show('editor'); notify('Resultado adicionado. O original permaneceu nas camadas.'); return;
  }
  const action = target.dataset.action;
  if (!action) return;
  if (action === 'toggle-drawer') { state.drawerOpen = !state.drawerOpen; render(); }
  if (action === 'close-drawer') { state.drawerOpen = false; render(); }
  if (action === 'open-editor') show('editor');
  if (action === 'new-project') startNewProject();
  if (action === 'retry-generation') app.querySelector('#generation-form')?.requestSubmit();
  if (action === 'back-to-editor') show('editor');
  if (action === 'download-sticker') {
    try { downloadBlob(await createStickerPng(state.project, state.printOptions.dpi), `${safeName(state.project.name)}-adesivo.png`); notify('PNG do adesivo preparado com transparência e DPI.'); }
    catch (error) { notify(error.message || 'Não foi possível exportar o adesivo.', true); }
  }
  if (action === 'download-sheet') {
    try { const result = await createSheetPng(state.project, state.printOptions); downloadBlob(result.blob, `${safeName(state.project.name)}-cartela-a4.png`); notify(`${result.layout.placed} adesivo(s) na cartela PNG.`); }
    catch (error) { notify(error.message || 'Não foi possível exportar a cartela.', true); }
  }
  if (action === 'print-sheet') {
    try { const layout = await printSheet(state.project, state.printOptions); notify(`${layout.placed} adesivo(s) na prévia de impressão.`); }
    catch (error) { notify(error.message || 'Não foi possível abrir a impressão.', true); }
  }
  if (action === 'save-profile') { const input = app.querySelector('#profile-name'); state.profileName = input.value.trim().slice(0, 60) || 'Minha conta'; localStorage.setItem('guria-nails.profile-name', state.profileName); notify('Preferência salva neste navegador.'); render(); }
  if (action === 'export-backup') backup();
  if (action === 'import-backup') app.querySelector('#backup-file')?.click();
});

app.addEventListener('submit', (event) => { if (event.target.id === 'generation-form') handleGeneration(event); });
app.addEventListener('change', (event) => {
  if (event.target.id === 'project-filter') { state.projectFilter = event.target.value; render(); }
  if (event.target.matches('[data-print-field]')) setPrintField(event.target);
  if (event.target.id === 'backup-file') importBackup(event.target.files?.[0]).catch((error) => notify(error.message || 'Não foi possível importar o backup.', true));
});

async function start() {
  try {
    [state.catalog, state.settings] = await Promise.all([
      loadCatalog(), fetch('/data/size-presets.json').then((response) => { if (!response.ok) throw new Error(); return response.json(); })
    ]);
    try { const config = await fetch('/app-config.json').then((response) => response.json()); state.apiBase = String(config.apiBaseUrl || state.apiBase).replace(/\/$/, ''); } catch { /* keep the local backend default */ }
    state.projects = loadProjects();
    const draft = loadDraft();
    state.project = draft || blankProject();
    const stored = state.projects.find((project) => project.id === state.project.id);
    if (stored) state.project = structuredClone(stored);
    window.guriaSettings = state.settings;
    try {
      const response = await fetch(`${state.apiBase}/ai/status`, { signal: AbortSignal.timeout(1800) });
      const status = response.ok ? await response.json() : null;
      state.aiStatusConnected = Boolean(status);
      state.aiProvider = String(status?.provider || '');
      state.aiAvailable = Boolean(status?.available);
    } catch { state.aiAvailable = false; }
    await syncProjects();
    render();
  } catch (error) {
    app.innerHTML = `<main class="startup-error"><img src="/assets/guria-wordmark.png" alt="Guria Nails"/><h1>Não foi possível abrir o ateliê</h1><p>Verifique se você iniciou o servidor local na pasta do projeto.</p><button type="button" class="button button-primary" onclick="location.reload()">Tentar novamente</button></main>`;
  }
}

start();
