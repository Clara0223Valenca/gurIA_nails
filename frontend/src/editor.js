import { CANVAS, clamp, clampLayer, coverLayerToBoard, layerWidthLimit, resizeLayerToWidth } from './geometry.js';
import { loadElementSvg } from './catalog.js';
import { openNailMeasurement } from './measurement.js';
import { deleteNailMeasurement, loadNailMeasurements, upsertNailMeasurement } from './store.js';
import { removeImageBackground } from './background-removal.js';

const BOARD = CANVAS;
let editorState = { selectedId: null, tool: 'select', categoryId: 'classics', librarySearch: '', brushColor: '#70442e', brushWidth: 4, pointer: null, undo: [], redo: [] };
let activeProjectId = null;

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const attr = (value) => esc(value).replace(/`/g, '&#96;');
const safeColor = (value, fallback = '#70442e') => /^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/i.test(String(value || '')) ? value : fallback;
const COLOR_PALETTES = [
  { name: 'Jardim rosé', colors: ['#58704e', '#d88fa1', '#e8c777'] },
  { name: 'Pêssego e café', colors: ['#71452f', '#e3a78f', '#f1d9b3'] },
  { name: 'Lavanda', colors: ['#5d527e', '#bba4d4', '#efd5e7'] },
  { name: 'Oceano', colors: ['#285d70', '#74b9b1', '#e8cf83'] },
  { name: 'Terracota', colors: ['#80473e', '#d18466', '#edc487'] },
  { name: 'Noite', colors: ['#392e3b', '#815968', '#d0b878'] },
  { name: 'Pérola', colors: ['#665c56', '#c5b9ab', '#eee2cd'] },
  { name: 'Vibrante', colors: ['#8a3857', '#ef7f78', '#f5c64e'] }
];

function paletteMarkup() {
  const buttons = COLOR_PALETTES.map((palette) => {
    const dots = palette.colors.map((color) => '<span style="background:' + color + '"></span>').join('');
    return '<button class="palette-pick" type="button" title="' + palette.name + '" aria-label="Aplicar paleta ' + palette.name + '" data-palette="' + palette.colors.join(',') + '">' + dots + '</button>';
  }).join('');
  return '<div class="palette-picks" role="group" aria-label="Paletas de cores">' + buttons + '</div>';
}

function safeIconContent(svg, layerId) {
  const source = String(svg || '');
  const safeTags = /<(?!\/?(?:svg|g|path|ellipse|circle|rect|polygon|polyline|line|defs|clipPath|linearGradient|radialGradient|stop)\b)/i;
  if (!/^\s*<svg\b/i.test(source) || safeTags.test(source) || /\bon[a-z]+\s*=|(?:href|src)\s*=|url\s*\(\s*(?!#[-\w:.]+\s*\))|<script|<style|foreignobject|\bstyle\s*=/i.test(source)) return '';
  let content = source.replace(/^\s*<svg[^>]*>/i, '').replace(/<\/svg>\s*$/i, '');
  const prefix = 'layer-' + String(layerId || 'asset').replace(/[^a-z0-9_-]/gi, '') + '-';
  content = content.replace(/\bid=(["'])([\w:.-]+)\1/g, (_match, quote, id) => 'id=' + quote + prefix + id + quote);
  content = content.replace(/url\(\s*#([\w:.-]+)\s*\)/g, (_match, id) => 'url(#' + prefix + id + ')');
  return content;
}

function safeViewBox(svg) {
  const match = String(svg || '').match(/<svg\b[^>]*\bviewBox=["']([^"']+)["']/i);
  if (!match) return '0 0 100 100';
  const values = match[1].trim().split(/[\s,]+/).map(Number);
  if (values.length !== 4 || values.some((value) => !Number.isFinite(value)) || values[2] <= 0 || values[3] <= 0) return '0 0 100 100';
  return values.join(' ');
}

function remember(project) {
  editorState.undo.push(JSON.stringify(project.elements));
  if (editorState.undo.length > 35) editorState.undo.shift();
  editorState.redo = [];
}

function commit(project, notify) {
  notify?.(project);
}

export function resetEditor(project) {
  if (activeProjectId !== project.id) {
    activeProjectId = project.id;
    editorState = { selectedId: project.elements.at(-1)?.id ?? null, tool: 'select', categoryId: 'classics', librarySearch: '', brushColor: '#70442e', brushWidth: 4, pointer: null, undo: [], redo: [] };
  }
}

function savedMeasurementsMarkup() {
  const measurements = loadNailMeasurements();
  if (!measurements.length) {
    return '<section class="saved-measurements"><div class="panel-title-row"><h4>Medidas salvas</h4><span class="small muted">neste navegador</span></div><p class="field-hint">Nenhuma medida salva. Ao medir, você pode marcar “Salvar esta medida” ou apenas usar o resultado.</p></section>';
  }
  const options = measurements.map((item) => `<option value="${attr(item.id)}">${esc(item.name)} · ${Number(item.widthMm).toFixed(1)} × ${Number(item.lengthMm).toFixed(1)} mm</option>`).join('');
  return `<section class="saved-measurements"><div class="panel-title-row"><h4>Medidas salvas</h4><span class="small muted">neste navegador</span></div><div class="field"><label for="saved-measure-select">Perfil de unha</label><select id="saved-measure-select" data-saved-measure-select><option value="">Selecione uma medida</option>${options}</select></div><div class="button-row saved-measure-actions"><button class="button button-primary button-sm" type="button" data-action="apply-saved-measurement">Aplicar</button><button class="button button-secondary button-sm" type="button" data-action="edit-saved-measurement">Editar</button><button class="button button-secondary button-sm" type="button" data-action="remeasure-saved-measurement">Refazer foto</button><button class="button button-danger button-sm" type="button" data-action="delete-saved-measurement">Excluir</button></div><div class="saved-measure-edit" data-saved-measure-edit hidden><div class="field"><label for="saved-measure-edit-name">Nome</label><input id="saved-measure-edit-name" type="text" maxlength="40" data-saved-measure-edit-field="name"/></div><div class="field-inline"><div class="field"><label for="saved-measure-edit-width">Largura · mm</label><input id="saved-measure-edit-width" type="number" min="1" max="40" step="0.1" data-saved-measure-edit-field="widthMm"/></div><div class="field"><label for="saved-measure-edit-length">Comprimento · mm</label><input id="saved-measure-edit-length" type="number" min="1" max="60" step="0.1" data-saved-measure-edit-field="lengthMm"/></div></div><div class="button-row"><button class="button button-primary button-sm" type="button" data-action="save-saved-measurement">Salvar edição</button><button class="button button-quiet button-sm" type="button" data-action="cancel-saved-measurement-edit">Cancelar</button></div></div></section>`;
}

function erasedPath(layer) {
  return `<path d="${attr(layer.path || '')}" fill="none" stroke="black" stroke-width="${clamp(Number(layer.width) || 20, 4, 100)}" stroke-linecap="round" stroke-linejoin="round"/>`;
}

function elementMarkup(layer) {
  const width = clamp(Number(layer.width) || 64, 18, 312);
  const height = clamp(Number(layer.height) || width, 18, 500);
  const common = `data-layer-id="${attr(layer.id)}" class="layer-hitbox" transform="rotate(${Number(layer.rotation) || 0} ${Number(layer.x) + width / 2} ${Number(layer.y) + height / 2})"`;
  if (layer.type === 'path') {
    const dx = Number(layer.x) - Number(layer.originX ?? layer.x);
    const dy = Number(layer.y) - Number(layer.originY ?? layer.y);
    return `<g data-layer-id="${attr(layer.id)}" class="layer-hitbox" transform="translate(${dx} ${dy}) rotate(${Number(layer.rotation) || 0} ${Number(layer.x) + width / 2} ${Number(layer.y) + height / 2})" style="color:${attr(safeColor(layer.color))}"><path d="${attr(layer.path || '')}" fill="none" stroke="currentColor" stroke-width="${clamp(Number(layer.strokeWidth) || 4, 1, 36)}" stroke-linecap="round" stroke-linejoin="round" pointer-events="stroke"/></g>`;
  }
  if (layer.type === 'image') {
    const imageSource = String(layer.dataUrl || '');
    const isDataImage = /^data:image\/(?:png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(imageSource);
    const isBundledSvg = /^\/assets\/elements\/user-imports\/(?:animals|florals|alternative|dates|seasons|objects)\/[a-z0-9-]+\.svg$/i.test(imageSource);
    if (!isDataImage && !isBundledSvg) return '';
    const fit = layer.fitMode === 'cover' ? 'xMidYMid slice' : layer.freeAspectRatio ? 'none' : 'xMidYMid meet';
    return `<g ${common}><image x="${Number(layer.x)}" y="${Number(layer.y)}" width="${width}" height="${height}" href="${attr(imageSource)}" preserveAspectRatio="${fit}"/></g>`;
  }
  const inner = safeIconContent(layer.svg, layer.id);
  if (!inner) return '';
  const primary = safeColor(layer.color);
  const secondary = safeColor(layer.secondaryColor, '#d5a98e');
  const detail = safeColor(layer.detailColor, '#e6c77e');
  return '<g ' + common + ' style="color:' + attr(primary) + ';--guria-primary:' + attr(primary) + ';--guria-secondary:' + attr(secondary) + ';--guria-detail:' + attr(detail) + '"><svg x="' + Number(layer.x) + '" y="' + Number(layer.y) + '" width="' + width + '" height="' + height + '" viewBox="' + attr(safeViewBox(layer.svg)) + '" preserveAspectRatio="' + (layer.freeAspectRatio ? 'none' : 'xMidYMid meet') + '">' + inner + '</svg></g>';
}

function drawLayer(layer, index, elements, includeSelection = false) {
  if (layer.type === 'erase') return '';
  const laterErase = elements.slice(index + 1).filter((item) => item.type === 'erase');
  const id = `erase-mask-${index}`;
  const mask = laterErase.length
    ? `<defs><mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="${BOARD.width}" height="${BOARD.height}"><rect width="${BOARD.width}" height="${BOARD.height}" fill="white"/>${laterErase.map(erasedPath).join('')}</mask></defs>`
    : '';
  return `${mask}${laterErase.length ? `<g mask="url(#${id})">${elementMarkup(layer)}</g>` : elementMarkup(layer)}`;
}

function selectedOverlay(layer) {
  if (!layer || layer.type === 'path' || layer.type === 'erase') return '';
  const x = Number(layer.x) || BOARD.boardX;
  const y = Number(layer.y) || BOARD.boardY;
  const w = Number(layer.width) || 64;
  const h = Number(layer.height) || 64;
  const cx = x + w / 2;
  const cy = y + h / 2;
  return `<g transform="rotate(${Number(layer.rotation) || 0} ${cx} ${cy})" pointer-events="none"><rect class="selection-box" x="${x}" y="${y}" width="${w}" height="${h}"/><circle class="selection-handle" data-handle="resize" cx="${x + w}" cy="${y + h}" r="7" pointer-events="all"/></g>`;
}

function canvasContent(project, { editor = true, includeBackground = true } = {}) {
  const definitions = editor ? `<defs><pattern id="checkerboard" width="12" height="12" patternUnits="userSpaceOnUse"><rect width="12" height="12" fill="#fffefd"/><path d="M0 0h6v6H0zm6 6h6v6H6z" fill="#f0e8e2"/></pattern></defs>` : '';
  const bg = includeBackground && project.backgroundMode === 'color'
    ? `<rect x="${BOARD.boardX}" y="${BOARD.boardY}" width="${BOARD.boardWidth}" height="${BOARD.boardHeight}" fill="${attr(project.backgroundColor || '#f2ded3')}"/>`
    : editor ? `<rect class="paper" x="${BOARD.boardX}" y="${BOARD.boardY}" width="${BOARD.boardWidth}" height="${BOARD.boardHeight}" fill="url(#checkerboard)"/>` : '';
  const layers = project.elements.map((layer, index) => drawLayer(layer, index, project.elements)).join('');
  const selected = editor ? selectedOverlay(project.elements.find((item) => item.id === editorState.selectedId)) : '';
  const stage = editor
    ? `<rect x="${BOARD.boardX}" y="${BOARD.boardY}" width="${BOARD.boardWidth}" height="${BOARD.boardHeight}" rx="5" fill="none" stroke="#dfcfc5" stroke-width="1.5"/><rect class="safe-area" x="${BOARD.boardX + 24}" y="${BOARD.boardY + 25}" width="${BOARD.boardWidth - 48}" height="${BOARD.boardHeight - 50}"/>`
    : '';
  return `${definitions}${bg}${layers}${selected}${stage}`;
}

export function artworkSvg(project, includeBackground = false) {
  const cropX = BOARD.boardX;
  const cropY = BOARD.boardY;
  const body = canvasContent(project, { editor: false, includeBackground });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${BOARD.boardWidth}" height="${BOARD.boardHeight}" viewBox="${cropX} ${cropY} ${BOARD.boardWidth} ${BOARD.boardHeight}">${body}</svg>`;
}

function canvasMarkup(project) {
  return `<svg id="design-canvas" class="editor-canvas" viewBox="0 0 ${BOARD.width} ${BOARD.height}" role="img" aria-label="Área de edição da arte" data-tool="${editorState.tool}" data-background="${project.backgroundMode}">${canvasContent(project)}</svg>`;
}

function layerListMarkup(project) {
  if (!project.elements.length) return '<p class="field-hint">Suas camadas aparecerão aqui quando você adicionar algo.</p>';
  return [...project.elements].reverse().map((layer, reverseIndex) => {
    const index = project.elements.length - reverseIndex - 1;
    const label = layer.name || (layer.type === 'path' ? 'Traço de pincel' : layer.type === 'erase' ? 'Borracha' : 'Imagem enviada');
    return `<div class="layer-item" role="group" tabindex="0" data-select-layer="${attr(layer.id)}" aria-label="Camada ${esc(label)}" aria-current="${editorState.selectedId === layer.id}"><span>${esc(label)}</span><span class="layer-actions"><button class="mini-action" type="button" title="Subir camada" aria-label="Subir camada" data-layer-move="up" data-layer-id="${attr(layer.id)}" ${index === project.elements.length - 1 ? 'disabled' : ''}>↑</button><button class="mini-action" type="button" title="Descer camada" aria-label="Descer camada" data-layer-move="down" data-layer-id="${attr(layer.id)}" ${index === 0 ? 'disabled' : ''}>↓</button><button class="mini-action" type="button" title="Excluir camada" aria-label="Excluir ${attr(label)}" data-layer-delete="${attr(layer.id)}">🗑</button></span></div>`;
  }).join('');
}

function propertiesMarkup(project, settings) {
  const selected = project.elements.find((item) => item.id === editorState.selectedId);
  const presets = `${project.sizePreset === 'Personalizado' ? '<option value="Personalizado" selected>Personalizado · medidas manuais</option>' : ''}${settings.presets.map((preset) => `<option value="${attr(preset.label)}" ${project.sizePreset === preset.label ? 'selected' : ''}>${esc(preset.label)} · ${preset.width} × ${preset.length} mm</option>`).join('')}`;
  const formats = settings.formats.map((format) => `<option ${project.format === format ? 'selected' : ''}>${esc(format)}</option>`).join('');
  const fingers = ['Polegar esquerdo', 'Indicador esquerdo', 'Médio esquerdo', 'Anelar esquerdo', 'Mínimo esquerdo', 'Polegar direito', 'Indicador direito', 'Médio direito', 'Anelar direito', 'Mínimo direito'];
  const fingerOptions = fingers.map((finger) => `<option ${project.finger === finger ? 'selected' : ''}>${esc(finger)}</option>`).join('');
  const selectedWidthMax = selected && ['icon', 'image'].includes(selected.type) ? (selected.freeAspectRatio ? BOARD.boardWidth : layerWidthLimit(selected)) : 180;
  const selectedAspect = selected ? (Number(selected.width) || 64) / (Number(selected.height) || 64) : 1;
  const selectedHeightMax = selected && ['icon', 'image'].includes(selected.type)
    ? Math.floor(selected.freeAspectRatio ? BOARD.boardHeight : Math.min(BOARD.boardHeight, BOARD.boardWidth / selectedAspect))
    : 180;
  const selectedWidth = selected ? clamp(Math.round(Number(selected.width) || 64), 18, selectedWidthMax) : 64;
  const selectedHeight = selected ? clamp(Math.round(Number(selected.height) || 64), 18, selectedHeightMax) : 64;
  const savedMeasurements = savedMeasurementsMarkup();
  const selectedProperty = selected && ['icon', 'image'].includes(selected.type)
    ? `<div class="divider"></div>
      <div class="panel-title-row"><h3 class="panel-title">Elemento selecionado</h3><button type="button" class="button button-danger button-sm" data-action="delete-selected">Excluir</button></div>
      <p class="small muted">${esc(selected.name || 'Imagem')}</p>
      ${selected.type === 'icon' ? '<div class="field"><label for="element-color">Cor principal</label><input id="element-color" type="color" value="' + attr(selected.color || '#70442e') + '" data-property="color"/></div>' +
        (selected.monochrome ? paletteMarkup() : '<div class="field-inline"><div class="field"><label for="element-secondary-color">Cor secundária</label><input id="element-secondary-color" type="color" value="' + attr(selected.secondaryColor || '#d5a98e') + '" data-property="secondaryColor"/></div><div class="field"><label for="element-detail-color">Detalhes</label><input id="element-detail-color" type="color" value="' + attr(selected.detailColor || '#e6c77e') + '" data-property="detailColor"/></div></div>' + paletteMarkup()) : ''}
      <div class="field"><label for="element-size">Largura visual</label><input id="element-size" type="range" min="18" max="${selectedWidthMax}" value="${selectedWidth}" data-property="width"/><p class="field-hint">${selectedWidth}px de largura</p></div>
      <div class="field"><label for="element-height">Altura visual</label><input id="element-height" type="range" min="18" max="${selectedHeightMax}" value="${selectedHeight}" data-property="height"/><p class="field-hint">${selectedHeight}px de altura</p></div>
      <label class="aspect-toggle"><input type="checkbox" data-property="freeAspectRatio" ${selected.freeAspectRatio ? 'checked' : ''}/> Ajustar proporções livremente</label>
      ${selected.type === 'image' ? `<div class="button-row"><button type="button" class="button button-secondary button-sm" data-action="cover-nail">Preencher unha</button><button type="button" class="button button-quiet button-sm" data-action="fit-image">Mostrar inteira</button></div>${/^data:image\/(?:png|jpeg|webp);base64,/i.test(String(selected.dataUrl || '')) ? '<button type="button" class="button button-secondary button-full" data-action="remove-background">✦ Remover fundo</button><p class="field-hint">A imagem é processada no navegador. No primeiro uso, será baixado um modelo de IA (cerca de 94–183 MB, conforme o dispositivo).</p>' : ''}` : ''}
      <div class="button-row"><button type="button" class="button button-secondary button-sm" data-action="rotate-left">↶ Girar</button><button type="button" class="button button-secondary button-sm" data-action="rotate-right">↷ Girar</button><button type="button" class="button button-secondary button-sm" data-action="duplicate-selected">Duplicar</button></div>`
    : selected && ['path', 'erase'].includes(selected.type) ? `<div class="divider"></div><div class="panel-title-row"><h3 class="panel-title">${selected.type === 'erase' ? 'Traço de borracha' : 'Traço selecionado'}</h3><button type="button" class="button button-danger button-sm" data-action="delete-selected">Excluir</button></div>` : '';
  const backgroundHelp = project.backgroundMode === 'transparent'
    ? 'A cor fica guardada e poderá ser aplicada ao selecionar “Com cor”.'
    : 'Essa cor aparece na prévia e será incluída na exportação.';
  return `<section class="card panel-section"><div class="panel-title-row"><h3 class="panel-title">Formato</h3><span class="small muted">configuração</span></div><div class="field"><label for="target-finger">Unha atual</label><select id="target-finger" data-project-field="finger">${fingerOptions}</select></div><div class="field"><label for="nail-format">Formato da unha</label><select id="nail-format" data-project-field="format">${formats}</select></div><div class="field"><label for="size-preset">Tamanho padrão</label><select id="size-preset" data-project-field="sizePreset">${presets}</select></div><div class="field-inline"><div class="field"><label for="width-mm">Largura (mm)</label><input id="width-mm" type="number" min="1" max="40" step="0.1" value="${Number(project.widthMm) || 10}" data-project-field="widthMm"/></div><div class="field"><label for="length-mm">Comprimento (mm)</label><input id="length-mm" type="number" min="1" max="60" step="0.1" value="${Number(project.lengthMm) || 14}" data-project-field="lengthMm"/></div></div><p class="format-note">Valores estimados: confira a medida com uma régua antes de imprimir.</p>${savedMeasurements}<div class="divider"></div><div class="field"><label for="background-mode">Fundo da prévia e impressão</label><select id="background-mode" data-project-field="backgroundMode"><option value="transparent" ${project.backgroundMode === 'transparent' ? 'selected' : ''}>Transparente</option><option value="color" ${project.backgroundMode === 'color' ? 'selected' : ''}>Com cor</option></select></div><div class="field"><label for="background-color">Cor do fundo</label><input id="background-color" type="color" value="${attr(safeColor(project.backgroundColor, '#f2ded3'))}" data-project-field="backgroundColor"/><p class="field-hint">${backgroundHelp}</p></div>${selectedProperty}</section>
    <section class="card panel-section"><div class="panel-title-row"><h3 class="panel-title">Pincel e borracha</h3><span class="small muted">toque para desenhar</span></div><div class="field"><label for="brush-color">Cor do traço</label><input id="brush-color" type="color" value="${attr(editorState.brushColor)}" data-brush="color"/></div><div class="field"><label for="brush-width">Espessura · ${editorState.brushWidth}px</label><input id="brush-width" type="range" min="1" max="26" value="${editorState.brushWidth}" data-brush="width"/><div class="brush-preview"><span class="brush-dot" style="width:${clamp(editorState.brushWidth,3,26)}px;height:${clamp(editorState.brushWidth,3,26)}px;background:${attr(editorState.brushColor)}"></span></div></div></section>
    <section class="card panel-section"><div class="panel-title-row"><h3 class="panel-title">Camadas</h3><span class="small muted">${project.elements.length}</span></div><div id="layer-list" class="layer-list">${layerListMarkup(project)}</div></section>`;
}

function libraryMarkup(catalog) {
  const category = catalog.categories.find((item) => item.id === editorState.categoryId) || catalog.categories[0];
  const query = String(editorState.librarySearch || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const visibleElements = category.elements.filter((item) => !query || (item.name + ' ' + (item.tags || []).join(' ')).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(query));
  return `<section class="card panel-section"><div class="panel-title-row"><h3 class="panel-title">Biblioteca</h3><span class="small muted">${catalog.categories.length} categorias</span></div><div class="category-grid">${catalog.categories.map((item) => `<button type="button" class="category-button" data-category="${attr(item.id)}" aria-pressed="${category.id === item.id}"><span class="category-symbol">${esc(item.icon)}</span><span><strong>${esc(item.name)}</strong><small>${item.elements.length} elementos</small></span></button>`).join('')}</div><div class="divider"></div><div class="field library-search-field"><label for="library-search">Buscar nesta categoria</label><input id="library-search" type="search" placeholder="Ex.: rosa, estrela, laço..." value="${attr(editorState.librarySearch || '')}" data-library-search/></div><div class="element-grid">${visibleElements.map((item) => `<button type="button" class="element-button" data-library-item data-search-text="${attr(item.name + ' ' + (item.tags || []).join(' '))}" data-add-asset="${attr(item.id)}"><img src="${attr(item.asset)}" alt="" loading="lazy" decoding="async"/><span>${esc(item.name)}</span></button>`).join('')}</div><p class="library-empty" ${visibleElements.length ? 'hidden' : ''}>Nenhum elemento encontrado nesta categoria.</p></section>`;
}

export function renderEditor(project, catalog, settings) {
  resetEditor(project);
  return `<div class="editor-topline"><div class="editor-selection"><span class="status-pill"><span class="status-dot"></span>Unha selecionada</span><select aria-label="Unha atual" data-project-field="finger">${['Polegar esquerdo','Indicador esquerdo','Médio esquerdo','Anelar esquerdo','Mínimo esquerdo','Polegar direito','Indicador direito','Médio direito','Anelar direito','Mínimo direito'].map((finger) => `<option ${project.finger === finger ? 'selected' : ''}>${esc(finger)}</option>`).join('')}</select><span class="small muted">${esc(project.format || 'Amendoada')}</span></div><div class="button-row"><button class="button button-secondary button-sm" type="button" data-action="undo" title="Desfazer" ${editorState.undo.length ? '' : 'disabled'}>↶ Desfazer</button><button class="button button-secondary button-sm" type="button" data-action="redo" title="Refazer" ${editorState.redo.length ? '' : 'disabled'}>↷ Refazer</button><label class="button button-secondary button-sm" for="upload-art">＋ Upload</label><input id="upload-art" class="upload-input" type="file" accept="image/png,image/jpeg,image/webp"/><button class="button button-secondary button-sm" type="button" data-action="open-print">▤ Cartela</button><button class="button button-secondary button-sm" type="button" data-action="new-project">＋ Novo projeto</button><button class="button button-primary button-sm" type="button" data-action="save-project">Salvar</button></div></div><div class="editor-layout"><section class="card workspace-card"><div class="workspace-bar"><div class="workspace-title"><strong>Arte 2D · ${esc(project.name)}</strong><button class="button button-quiet button-sm" type="button" data-action="rename-design" aria-label="Renomear design ${esc(project.name)}">✎ Renomear</button></div><span class="small muted">fundo ${project.backgroundMode === 'color' ? 'colorido' : 'transparente'}</span></div><div class="canvas-stage">${canvasMarkup(project)}</div><div class="editor-tools" role="toolbar" aria-label="Ferramentas de edição"><button class="tool-button" data-tool="select" aria-pressed="${editorState.tool === 'select'}"><span>↖</span>Selecionar</button><button class="tool-button" data-tool="brush" aria-pressed="${editorState.tool === 'brush'}"><span>✎</span>Pincel</button><button class="tool-button" data-tool="eraser" aria-pressed="${editorState.tool === 'eraser'}"><span>⌫</span>Borracha</button><button class="tool-button" data-action="clear-selection"><span>○</span>Limpar seleção</button></div></section><aside class="editor-panel"><div id="editor-settings" class="editor-settings">${propertiesMarkup(project, settings)}</div>${libraryMarkup(catalog)}<section class="card panel-section"><div class="panel-title-row"><h3 class="panel-title">Aperfeiçoar com GurIA</h3></div><p class="field-hint">A imagem atual será enviada ao provider configurado como referência. O original permanece salvo até você aceitar o resultado.</p><button class="button button-secondary button-full" type="button" data-action="improve-ai" ${project.elements.length ? '' : 'disabled'}>✦ Melhorar com IA</button><p id="improve-status" class="ai-status" aria-live="polite"></p></section></aside></div>`;
}

function getPoint(svg, event) {
  const point = svg.createSVGPoint();
  point.x = event.clientX;
  point.y = event.clientY;
  const transformed = point.matrixTransform(svg.getScreenCTM().inverse());
  return { x: transformed.x, y: transformed.y };
}

function refreshCanvas(project, container) {
  const svg = container.querySelector('#design-canvas');
  if (!svg) return;
  svg.dataset.tool = editorState.tool;
  svg.dataset.background = project.backgroundMode;
  svg.innerHTML = canvasContent(project);
}

function refreshLayers(project, container) {
  const list = container.querySelector('#layer-list');
  if (list) list.innerHTML = layerListMarkup(project);
}

function addMeasurementControl(container) {
  const formatNote = container.querySelector('.format-note');
  if (!formatNote) return;
  formatNote.textContent = 'Use a régua como referência para estimar as dimensões reais da unha.';
  if (container.querySelector('[data-action="measure-nail"]')) return;
  const measureButton = document.createElement('button');
  measureButton.type = 'button';
  measureButton.className = 'button button-secondary button-full measure-open-button';
  measureButton.dataset.action = 'measure-nail';
  measureButton.textContent = '⌖ Medir unha com câmera';
  formatNote.before(measureButton);
}

function refreshInspector(project, container, settings) {
  const inspector = container.querySelector('#editor-settings');
  if (inspector) {
    inspector.innerHTML = propertiesMarkup(project, settings);
    addMeasurementControl(inspector);
  }
}

function pickedLayer(project) {
  return project.elements.find((item) => item.id === editorState.selectedId);
}

function updateSelectionControls(project, container) {
  const layer = pickedLayer(project);
  const width = container.querySelector('[data-property="width"]');
  const height = container.querySelector('[data-property="height"]');
  if (width && layer) {
    width.max = String((layer.type === 'icon' || layer.type === 'image') && !layer.freeAspectRatio ? layerWidthLimit(layer) : BOARD.boardWidth);
    width.value = String(clamp(Math.round(layer.width || 64), Number(width.min) || 18, Number(width.max) || BOARD.boardWidth));
  }
  if (height && layer) {
    height.max = String(Math.floor(layer.freeAspectRatio ? BOARD.boardHeight : Math.min(BOARD.boardHeight, BOARD.boardWidth / ((Number(layer.width) || 64) / (Number(layer.height) || 64)))));
    height.value = String(clamp(Math.round(layer.height || 64), Number(height.min) || 18, Number(height.max) || BOARD.boardHeight));
  }
  for (const key of ['color', 'secondaryColor', 'detailColor']) {
    const control = container.querySelector('[data-property="' + key + '"]');
    if (control && layer?.[key]) control.value = safeColor(layer[key]);
  }
  const ratioControl = container.querySelector('[data-property="freeAspectRatio"]');
  if (ratioControl && layer) ratioControl.checked = Boolean(layer.freeAspectRatio);
}

function resizeLayerDimension(layer, dimension, requested) {
  const width = Number(layer.width) || 64, height = Number(layer.height) || width;
  if (!layer.freeAspectRatio) {
    const aspect = width / height;
    return dimension === 'width'
      ? resizeLayerToWidth(layer, requested)
      : resizeLayerToWidth(layer, Number(requested) * aspect);
  }
  const nextWidth = dimension === 'width' ? clamp(Number(requested) || 18, 18, BOARD.boardWidth) : width;
  const nextHeight = dimension === 'height' ? clamp(Number(requested) || 18, 18, BOARD.boardHeight) : height;
  const centerX = (Number(layer.x) || BOARD.boardX) + width / 2;
  const centerY = (Number(layer.y) || BOARD.boardY) + height / 2;
  return {
    ...layer,
    ...(layer.type === 'image' ? { fitMode: 'contain' } : {}),
    width: nextWidth,
    height: nextHeight,
    x: clamp(centerX - nextWidth / 2, BOARD.boardX, BOARD.boardX + BOARD.boardWidth - nextWidth),
    y: clamp(centerY - nextHeight / 2, BOARD.boardY, BOARD.boardY + BOARD.boardHeight - nextHeight)
  };
}

function updateToolButtons(container) {
  container.querySelectorAll('[data-tool]').forEach((button) => {
    if (button.tagName.toLowerCase() === 'button') button.setAttribute('aria-pressed', String(button.dataset.tool === editorState.tool));
  });
  const canvas = container.querySelector('#design-canvas');
  if (canvas) canvas.dataset.tool = editorState.tool;
}

function refreshHistoryButtons(container) {
  const undo = container.querySelector('[data-action="undo"]');
  const redo = container.querySelector('[data-action="redo"]');
  if (undo) undo.disabled = !editorState.undo.length;
  if (redo) redo.disabled = !editorState.redo.length;
}

export function bindEditor(container, project, catalog, { settings, onChange, onSave, onRename, onNewProject, onPrint, onImprove, onStateChange, notify }) {
  addMeasurementControl(container);
  const deleteLayer = (layer) => {
    if (!layer) return;
    const name = layer.name || (layer.type === 'image' ? 'imagem' : 'elemento');
    if (!window.confirm(`Apagar “${name}” da arte? Esta ação pode ser desfeita com Desfazer.`)) return;
    remember(project);
    project.elements = project.elements.filter((item) => item.id !== layer.id);
    editorState.selectedId = project.elements.at(-1)?.id ?? null;
    update(true, true);
  };
  const update = (save = true, inspector = false) => {
    refreshCanvas(project, container);
    refreshLayers(project, container);
    updateSelectionControls(project, container);
    refreshHistoryButtons(container);
    if (inspector) refreshInspector(project, container, settings);
    if (save) onChange?.(project);
  };
  const applyNailMeasurement = ({ widthMm, lengthMm }) => {
    project.widthMm = widthMm;
    project.lengthMm = lengthMm;
    project.sizePreset = 'Personalizado';
    update(true, true);
    notify?.(`Medidas aplicadas: ${widthMm.toFixed(1)} × ${lengthMm.toFixed(1)} mm.`);
  };
  const saveNailMeasurement = (measurement) => {
    try {
      upsertNailMeasurement(measurement);
      update(false, true);
      notify?.(`Medida “${measurement.name}” salva neste navegador.`);
    } catch (error) { notify?.(error.message || 'Não foi possível salvar essa medida.', true); }
  };
  const openMeasurement = (existing = null) => openNailMeasurement(applyNailMeasurement, notify, {
    id: existing?.id,
    initialName: existing?.name || '',
    saveByDefault: Boolean(existing),
    onSave: saveNailMeasurement
  });

  container.querySelectorAll('button[data-tool]').forEach((button) => button.addEventListener('click', () => {
    editorState.tool = button.dataset.tool;
    updateToolButtons(container);
    if (editorState.tool !== 'select') editorState.selectedId = null;
    update(false, true);
  }));

  container.querySelectorAll('[data-category]').forEach((button) => button.addEventListener('click', () => {
    editorState.categoryId = button.dataset.category;
    onStateChange?.();
  }));
  const librarySearch = container.querySelector('[data-library-search]');
  librarySearch?.addEventListener('input', () => {
    editorState.librarySearch = librarySearch.value;
    const query = librarySearch.value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    let visible = 0;
    container.querySelectorAll('[data-library-item]').forEach((item) => {
      const text = (item.dataset.searchText || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      item.hidden = Boolean(query && !text.includes(query));
      if (!item.hidden) visible++;
    });
    const empty = container.querySelector('.library-empty');
    if (empty) empty.hidden = visible > 0;
  });

  container.addEventListener('change', (event) => {
    const control = event.target.closest('[data-project-field]');
    if (!control) return;
    const key = control.dataset.projectField;
    project[key] = ['widthMm', 'lengthMm'].includes(key) ? clamp(Number(control.value) || 1, 1, key === 'widthMm' ? 40 : 60) : control.value;
    if (key === 'sizePreset') {
      const preset = window.guriaSettings?.presets?.find((item) => item.label === control.value || item.id === control.value);
      if (preset) { project.widthMm = preset.width; project.lengthMm = preset.length; }
    }
    if (key === 'widthMm' || key === 'lengthMm') project.sizePreset = 'Personalizado';
    onChange?.(project);
    onStateChange?.();
  });

  const updateBrush = (event) => {
    const control = event.target.closest('[data-brush]');
    if (!control || (control.dataset.brush === 'width' && event.type !== 'input') || (control.dataset.brush === 'color' && event.type !== 'change')) return;
    if (control.dataset.brush === 'color') editorState.brushColor = control.value;
    if (control.dataset.brush === 'width') editorState.brushWidth = Number(control.value);
    const label = control.closest('.field')?.querySelector('label');
    if (label && control.dataset.brush === 'width') label.textContent = 'Espessura · ' + editorState.brushWidth + 'px';
    const dot = control.closest('.field')?.querySelector('.brush-dot');
    if (dot) { dot.style.width = clamp(editorState.brushWidth, 3, 26) + 'px'; dot.style.height = clamp(editorState.brushWidth, 3, 26) + 'px'; dot.style.background = editorState.brushColor; }
  };
  container.addEventListener('input', updateBrush);
  container.addEventListener('change', updateBrush);

  const updateProperty = (event) => {
    const control = event.target.closest('[data-property]');
    if (!control || (['width', 'height'].includes(control.dataset.property) && event.type !== 'input') || (!['width', 'height'].includes(control.dataset.property) && event.type !== 'change')) return;
    const layer = pickedLayer(project);
    if (!layer) return;
    remember(project);
    const property = control.dataset.property;
    if (property === 'color') layer.color = safeColor(control.value);
    if (property === 'secondaryColor') layer.secondaryColor = safeColor(control.value);
    if (property === 'detailColor') layer.detailColor = safeColor(control.value);
    if (property === 'freeAspectRatio') {
      layer.freeAspectRatio = Boolean(control.checked);
      if (!layer.freeAspectRatio && layer.type === 'image' && Number(layer.aspectRatio) > 0) {
        Object.assign(layer, resizeLayerToWidth(layer, layer.width));
      }
    }
    if (property === 'width' || property === 'height') Object.assign(layer, resizeLayerDimension(layer, property, control.value));
    update(true);
  };
  container.addEventListener('input', updateProperty);
  container.addEventListener('change', updateProperty);

  container.addEventListener('click', (event) => {
    const button = event.target.closest('[data-palette]');
    if (!button) return;
    const layer = pickedLayer(project);
    if (!layer || layer.type !== 'icon') return;
    const [primary, secondary, detail] = button.dataset.palette.split(',');
    remember(project);
    layer.color = safeColor(primary);
    layer.secondaryColor = safeColor(secondary);
    layer.detailColor = safeColor(detail);
    update(true, true);
  });

  container.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const action = button.dataset.action;
    const layer = pickedLayer(project);
    if (action === 'rename-design') {
      const requestedName = window.prompt('Renomear design:', project.name || 'Meu design');
      if (requestedName === null) return;
      try {
        if (onRename) onRename(project, requestedName);
        else {
          const name = String(requestedName).trim().slice(0, 80);
          if (!name) throw new Error('Digite um nome para o design.');
          project.name = name;
          onChange?.(project);
        }
        onStateChange?.();
        notify?.(`Design renomeado para “${project.name}”.`);
      } catch (error) { notify?.(error.message || 'Não foi possível renomear o design.', true); }
      return;
    }
    if (action === 'new-project') { onNewProject?.(); return; }
    if (action === 'apply-saved-measurement' || action === 'edit-saved-measurement' || action === 'remeasure-saved-measurement' || action === 'delete-saved-measurement' || action === 'save-saved-measurement' || action === 'cancel-saved-measurement-edit') {
      const select = container.querySelector('[data-saved-measure-select]');
      const saved = loadNailMeasurements();
      const measurement = saved.find((item) => item.id === select?.value);
      if (action === 'cancel-saved-measurement-edit') {
        const editor = container.querySelector('[data-saved-measure-edit]');
        if (editor) editor.hidden = true;
        return;
      }
      if (!measurement) { notify?.('Selecione uma medida salva primeiro.', true); return; }
      if (action === 'apply-saved-measurement') { applyNailMeasurement(measurement); return; }
      if (action === 'edit-saved-measurement') {
        const editor = container.querySelector('[data-saved-measure-edit]');
        if (!editor) return;
        editor.querySelector('[data-saved-measure-edit-field="name"]').value = measurement.name;
        editor.querySelector('[data-saved-measure-edit-field="widthMm"]').value = measurement.widthMm;
        editor.querySelector('[data-saved-measure-edit-field="lengthMm"]').value = measurement.lengthMm;
        editor.hidden = false;
        editor.querySelector('[data-saved-measure-edit-field="name"]').focus();
        return;
      }
      if (action === 'remeasure-saved-measurement') { openMeasurement(measurement); return; }
      if (action === 'delete-saved-measurement') {
        if (!window.confirm(`Excluir a medida “${measurement.name}”?`)) return;
        deleteNailMeasurement(measurement.id);
        update(false, true);
        notify?.(`Medida “${measurement.name}” excluída.`);
        return;
      }
      if (action === 'save-saved-measurement') {
        const editor = container.querySelector('[data-saved-measure-edit]');
        const name = editor?.querySelector('[data-saved-measure-edit-field="name"]')?.value;
        const widthMm = editor?.querySelector('[data-saved-measure-edit-field="widthMm"]')?.value;
        const lengthMm = editor?.querySelector('[data-saved-measure-edit-field="lengthMm"]')?.value;
        try {
          upsertNailMeasurement({ id: measurement.id, name, widthMm, lengthMm });
          update(false, true);
          notify?.(`Medida “${String(name).trim()}” atualizada.`);
        } catch (error) { notify?.(error.message || 'Confira o nome e as dimensões da medida.', true); }
        return;
      }
    }
    if (action === 'save-project') onSave?.(project);
    if (action === 'open-print') onPrint?.(project);
    if (action === 'improve-ai') onImprove?.(project);
    if (action === 'clear-selection') { editorState.selectedId = null; editorState.tool = 'select'; updateToolButtons(container); update(false, true); }
    if (action === 'delete-selected' && layer) deleteLayer(layer);
    if (action === 'duplicate-selected' && layer) {
      remember(project); const copy = structuredClone(layer); copy.id = makeId(); copy.name = `${layer.name || 'Elemento'} — cópia`; copy.x += 16; copy.y += 16; if (copy.type !== 'path') Object.assign(copy, clampLayer(copy)); project.elements.push(copy); editorState.selectedId = copy.id; update(true, true);
    }
    if (action === 'cover-nail' && layer?.type === 'image') {
      remember(project); Object.assign(layer, coverLayerToBoard(layer)); update(true, true);
    }
    if (action === 'remove-background' && layer?.type === 'image') {
      const removeButton = button;
      if (removeButton.disabled) return;
      removeButton.disabled = true;
      removeButton.setAttribute('aria-busy', 'true');
      removeButton.textContent = 'Carregando IA…';
      removeImageBackground(layer.dataUrl, (progress) => {
        if (!removeButton.isConnected) return;
        if (progress.stage === 'segmenting') removeButton.textContent = 'Removendo fundo…';
        else if (progress.stage === 'fallback') removeButton.textContent = 'Ativando modo compatível…';
        else if (progress.status === 'progress' && Number.isFinite(progress.progress)) removeButton.textContent = `Carregando IA · ${Math.round(progress.progress)}%`;
      }).then((dataUrl) => {
        if (!removeButton.isConnected || !project.elements.some((item) => item.id === layer.id)) return;
        remember(project);
        layer.dataUrl = dataUrl;
        update(true, true);
        notify?.('Fundo removido. Use Desfazer para recuperar a imagem original.');
      }).catch((error) => {
        notify?.(error.message || 'Não foi possível remover o fundo desta imagem.', true);
      }).finally(() => {
        if (removeButton.isConnected) {
          removeButton.disabled = false;
          removeButton.removeAttribute('aria-busy');
          removeButton.textContent = '✦ Remover fundo';
        }
      });
      return;
    }
    if (action === 'fit-image' && layer?.type === 'image') {
      remember(project); Object.assign(layer, resizeLayerToWidth(layer, layerWidthLimit(layer))); update(true, true);
    }
    if ((action === 'rotate-left' || action === 'rotate-right') && layer) {
      remember(project); layer.rotation = (Number(layer.rotation) || 0) + (action === 'rotate-left' ? -15 : 15); update(true);
    }
    if (action === 'undo' && editorState.undo.length) {
      editorState.redo.push(JSON.stringify(project.elements)); project.elements = JSON.parse(editorState.undo.pop()); editorState.selectedId = project.elements.at(-1)?.id ?? null; onChange?.(project); onStateChange?.();
    }
    if (action === 'redo' && editorState.redo.length) {
      editorState.undo.push(JSON.stringify(project.elements)); project.elements = JSON.parse(editorState.redo.pop()); editorState.selectedId = project.elements.at(-1)?.id ?? null; onChange?.(project); onStateChange?.();
    }
  });

  container.addEventListener('click', (event) => {
    if (!event.target.closest('[data-action="measure-nail"]')) return;
    openMeasurement();
  });

  container.querySelectorAll('[data-add-asset]').forEach((button) => button.addEventListener('click', async () => {
    if (project.elements.length >= 100) { notify?.('Este projeto já tem muitas camadas. Remova uma antes de adicionar outra.'); return; }
    const item = catalog.categories.flatMap((entry) => entry.elements.map((element) => ({ ...element, category: entry.name }))).find((element) => element.id === button.dataset.addAsset);
    if (!item) return;
    try {
      let element;
      if (item.renderAsImage) {
        if (!/^\/assets\/elements\/user-imports\/(?:animals|florals|alternative|dates|seasons|objects)\/[a-z0-9-]+\.svg$/i.test(String(item.asset || ''))) throw new Error('O caminho da imagem não é seguro.');
        element = { id: makeId(), type: 'image', name: item.name, category: item.category, dataUrl: item.asset, asset: item.asset, aspectRatio: Number(item.aspectRatio) > 0 ? Number(item.aspectRatio) : 1, fitMode: 'contain', freeAspectRatio: false, x: BOARD.boardX + 118 + (project.elements.length % 4) * 8, y: BOARD.boardY + 180 + (project.elements.length % 3) * 10, width: 70, height: 70, rotation: 0 };
      } else {
        const svg = await loadElementSvg(item.asset);
        element = { id: makeId(), type: 'icon', name: item.name, category: item.category, asset: item.asset, svg, color: safeColor(item.colors?.primary), secondaryColor: safeColor(item.colors?.secondary, '#d5a98e'), detailColor: safeColor(item.colors?.detail, '#e6c77e'), monochrome: Boolean(item.monochrome), freeAspectRatio: false, x: BOARD.boardX + 118 + (project.elements.length % 4) * 8, y: BOARD.boardY + 180 + (project.elements.length % 3) * 10, width: 70, height: 70, rotation: 0 };
      }
      remember(project);
      project.elements.push(element); editorState.selectedId = element.id; editorState.tool = 'select'; updateToolButtons(container); update(true, true);
    } catch (error) { notify?.(error.message || 'Não foi possível adicionar esse elemento.', true); }
  }));

  container.addEventListener('keydown', (event) => {
    const layerButton = event.target.closest('[data-select-layer]');
    if (!layerButton || event.target.closest('button')) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      editorState.selectedId = layerButton.dataset.selectLayer;
      editorState.tool = 'select'; updateToolButtons(container); update(false, true); refreshLayers(project, container);
    }
  });

  container.addEventListener('click', (event) => {
    const deleteButton = event.target.closest('[data-layer-delete]');
    if (deleteButton) {
      event.stopPropagation();
      deleteLayer(project.elements.find((item) => item.id === deleteButton.dataset.layerDelete));
      return;
    }
    const moveButton = event.target.closest('[data-layer-move]');
    if (moveButton) {
      event.stopPropagation();
      const index = project.elements.findIndex((item) => item.id === moveButton.dataset.layerId);
      const nextIndex = index + (moveButton.dataset.layerMove === 'up' ? 1 : -1);
      if (index < 0 || nextIndex < 0 || nextIndex >= project.elements.length) return;
      remember(project);
      [project.elements[index], project.elements[nextIndex]] = [project.elements[nextIndex], project.elements[index]];
      update(true);
      return;
    }
    const layerButton = event.target.closest('[data-select-layer]');
    if (!layerButton) return;
    editorState.selectedId = layerButton.dataset.selectLayer;
    editorState.tool = 'select'; updateToolButtons(container); update(false, true);
    refreshLayers(project, container);
  });

  const canvas = container.querySelector('#design-canvas');
  if (canvas) {
    canvas.addEventListener('pointerdown', (event) => {
      if (event.target.closest('[data-handle]')) {
        const point = getPoint(canvas, event); const selected = pickedLayer(project);
        if (!selected) return;
        remember(project); editorState.pointer = { mode: 'resize', id: selected.id, x: point.x, y: point.y, width: selected.width, height: selected.height };
        canvas.setPointerCapture(event.pointerId); event.preventDefault(); return;
      }
      const hit = event.target.closest('[data-layer-id]');
      if (editorState.tool === 'select' && hit) {
        const layer = project.elements.find((item) => item.id === hit.dataset.layerId);
        if (!layer) return;
        editorState.selectedId = layer.id; remember(project);
        editorState.pointer = { mode: 'move', id: layer.id, ...getPoint(canvas, event), x0: layer.x, y0: layer.y };
        canvas.setPointerCapture(event.pointerId); refreshLayers(project, container); refreshCanvas(project, container); refreshInspector(project, container, settings); event.preventDefault(); return;
      }
      const point = getPoint(canvas, event);
      if (point.x < BOARD.boardX || point.x > BOARD.boardX + BOARD.boardWidth || point.y < BOARD.boardY || point.y > BOARD.boardY + BOARD.boardHeight) return;
      if (editorState.tool === 'brush' || editorState.tool === 'eraser') {
        remember(project);
        const layer = { id: makeId(), type: editorState.tool === 'eraser' ? 'erase' : 'path', name: editorState.tool === 'eraser' ? 'Borracha' : 'Traço de pincel', color: editorState.brushColor, width: editorState.tool === 'eraser' ? Math.max(12, editorState.brushWidth * 3) : editorState.brushWidth, strokeWidth: editorState.brushWidth, path: `M ${point.x.toFixed(1)} ${point.y.toFixed(1)}`, x: point.x, y: point.y, originX: point.x, originY: point.y, rotation: 0 };
        project.elements.push(layer); editorState.selectedId = layer.id; editorState.pointer = { mode: 'draw', id: layer.id };
        canvas.setPointerCapture(event.pointerId); refreshCanvas(project, container); refreshInspector(project, container, settings); event.preventDefault();
      }
    });
    canvas.addEventListener('pointermove', (event) => {
      const pointer = editorState.pointer;
      if (!pointer) return;
      const point = getPoint(canvas, event);
      const layer = project.elements.find((item) => item.id === pointer.id);
      if (!layer) return;
      if (pointer.mode === 'move') {
        const x = pointer.x0 + point.x - pointer.x; const y = pointer.y0 + point.y - pointer.y;
        if (layer.type === 'path') {
          layer.x = clamp(x, BOARD.boardX, BOARD.boardX + BOARD.boardWidth);
          layer.y = clamp(y, BOARD.boardY, BOARD.boardY + BOARD.boardHeight);
        } else {
          Object.assign(layer, clampLayer({ ...layer, x, y }));
        }
      } else if (pointer.mode === 'resize') {
        if (layer.freeAspectRatio) {
          layer.width = clamp(pointer.width + point.x - pointer.x, 18, BOARD.boardX + BOARD.boardWidth - layer.x);
          layer.height = clamp(pointer.height + point.y - pointer.y, 18, BOARD.boardY + BOARD.boardHeight - layer.y);
        } else {
          const maxScale = Math.min(
            (BOARD.boardX + BOARD.boardWidth - layer.x) / pointer.width,
            (BOARD.boardY + BOARD.boardHeight - layer.y) / pointer.height
          );
          const minScale = Math.max(18 / pointer.width, 18 / pointer.height);
          const requestedScale = 1 + Math.max((point.x - pointer.x) / pointer.width, (point.y - pointer.y) / pointer.height);
          const scale = clamp(requestedScale, minScale, Math.max(minScale, maxScale));
          layer.width = pointer.width * scale;
          layer.height = pointer.height * scale;
        }
      } else if (pointer.mode === 'draw') {
        const x = clamp(point.x, BOARD.boardX, BOARD.boardX + BOARD.boardWidth);
        const y = clamp(point.y, BOARD.boardY, BOARD.boardY + BOARD.boardHeight);
        layer.path += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
      }
      refreshCanvas(project, container); updateSelectionControls(project, container); event.preventDefault();
    });
    const finish = () => {
      if (!editorState.pointer) return;
      editorState.pointer = null; refreshLayers(project, container); onChange?.(project);
    };
    canvas.addEventListener('pointerup', finish);
    canvas.addEventListener('pointercancel', finish);
  }

  const upload = container.querySelector('#upload-art');
  upload?.addEventListener('change', async () => {
    const file = upload.files?.[0];
    if (!file) return;
    try {
      const allowed = ['image/png', 'image/jpeg', 'image/webp'];
      if (!allowed.includes(file.type) || file.size > 4 * 1024 * 1024) throw new Error('Envie PNG, JPG ou WEBP de até 4 MB.');
      const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
      const isPng = bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71;
      const isJpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
      const isWebp = String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
      if (!(isPng || isJpeg || isWebp)) throw new Error('O conteúdo do arquivo não corresponde a uma imagem PNG, JPG ou WEBP.');
      const sourceDataUrl = await readFile(file);
      const sourceImage = await loadImage(sourceDataUrl);
      if (sourceImage.naturalWidth > 6000 || sourceImage.naturalHeight > 6000) throw new Error('A imagem precisa ter até 6.000 px em cada lado.');
      const compactScale = Math.min(1200 / sourceImage.naturalWidth, 1200 / sourceImage.naturalHeight, 1);
      const compactCanvas = document.createElement('canvas');
      compactCanvas.width = Math.max(1, Math.round(sourceImage.naturalWidth * compactScale));
      compactCanvas.height = Math.max(1, Math.round(sourceImage.naturalHeight * compactScale));
      compactCanvas.getContext('2d').drawImage(sourceImage, 0, 0, compactCanvas.width, compactCanvas.height);
      const webp = compactCanvas.toDataURL('image/webp', 0.9);
      const dataUrl = webp.startsWith('data:image/webp') ? webp : sourceDataUrl;
      if (dataUrl.length > 4_500_000) throw new Error('A imagem ficou grande demais para o armazenamento do navegador. Reduza ou comprima o arquivo e tente novamente.');
      const image = dataUrl === sourceDataUrl ? sourceImage : await loadImage(dataUrl);
      if (project.elements.length >= 100) throw new Error('Este projeto já tem muitas camadas.');
      remember(project);
      const layer = { id: makeId(), type: 'image', name: file.name.slice(0, 60), dataUrl, aspectRatio: image.naturalWidth / image.naturalHeight, fitMode: 'contain', x: BOARD.boardX + (BOARD.boardWidth - 64) / 2, y: BOARD.boardY + (BOARD.boardHeight - 64) / 2, width: 64, height: 64, rotation: 0 };
      Object.assign(layer, resizeLayerToWidth(layer, layerWidthLimit(layer)));
      project.elements.push(layer); editorState.selectedId = layer.id; editorState.tool = 'select'; updateToolButtons(container); update(true, true);
    } catch (error) { notify?.(error.message || 'Não foi possível importar essa imagem.', true); }
    upload.value = '';
  });

}

function makeId() { return globalThis.crypto?.randomUUID?.() ?? `layer-${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function readFile(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error('Não foi possível ler o arquivo.')); reader.readAsDataURL(file); }); }
function loadImage(dataUrl) { return new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(new Error('O arquivo de imagem não pôde ser aberto.')); image.src = dataUrl; }); }

export async function addImageLayer(project, dataUrl, name = 'Arte da GurIA') {
  const image = await loadImage(dataUrl);
  remember(project);
  const layer = { id: makeId(), type: 'image', name, dataUrl, aspectRatio: image.naturalWidth / image.naturalHeight, fitMode: 'contain', x: BOARD.boardX + (BOARD.boardWidth - 64) / 2, y: BOARD.boardY + (BOARD.boardHeight - 64) / 2, width: 64, height: 64, rotation: 0 };
  Object.assign(layer, resizeLayerToWidth(layer, layerWidthLimit(layer)));
  project.elements.push(layer);
  editorState.selectedId = layer.id;
  return layer;
}

export function resetEditorForProject(project) {
  activeProjectId = null;
  resetEditor(project);
}
