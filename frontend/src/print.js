import { artworkSvg } from './editor.js';
import { multiSheetLayout } from './geometry.js';

const A4 = Object.freeze({ width: 210, height: 297 });
export const PRINT_HEADER_HEIGHT_MM = 20;
const pxPerMm = (dpi) => Math.max(72, Math.min(1200, Number(dpi) || 300)) / 25.4;
const bundledSvgPattern = /\/assets\/elements\/user-imports\/(?:animals|florals|alternative|dates|seasons|objects)\/[a-z0-9-]+\.svg/gi;
const svgAssetCache = new Map();

function base64Utf8(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

async function selfContainedArtwork(project, includeBackground = project.backgroundMode === 'color') {
  let source = artworkSvg(project, includeBackground);
  const paths = [...new Set([...source.matchAll(new RegExp(bundledSvgPattern.source, 'gi'))].map(([asset]) => asset))];
  for (const asset of paths) {
    let dataUri = svgAssetCache.get(asset);
    if (!dataUri) {
      const response = await fetch(asset);
      if (!response.ok) throw new Error('Não foi possível preparar uma arte da biblioteca para impressão.');
      const imported = await response.text();
      if (!/^\s*<svg\b/i.test(imported) || /<\s*(?:script|foreignObject)\b|\bon[a-z]+\s*=|(?:href|src)=["'](?!data:|#)/i.test(imported)) {
        throw new Error('Um SVG importado contém referências que não podem ser usadas na exportação.');
      }
      dataUri = 'data:image/svg+xml;base64,' + base64Utf8(imported);
      svgAssetCache.set(asset, dataUri);
    }
    source = source.split(`href="${asset}"`).join(`href="${dataUri}"`);
  }
  return source;
}

export async function createArtworkPreviewUrl(project) {
  const source = await selfContainedArtwork(project);
  return URL.createObjectURL(new Blob([source], { type: 'image/svg+xml;charset=utf-8' }));
}

function crc32(bytes) {
  let crc = -1;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ -1) >>> 0;
}

function readU32(bytes, offset) { return ((bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]) >>> 0; }
function writeU32(view, value) { view.setUint32(0, value >>> 0, false); }

function pngChunk(type, data) {
  const name = new TextEncoder().encode(type);
  const chunk = new Uint8Array(12 + data.length);
  const view = new DataView(chunk.buffer);
  writeU32(view, data.length);
  chunk.set(name, 4); chunk.set(data, 8);
  writeU32(new DataView(chunk.buffer, 8 + data.length, 4), crc32(chunk.subarray(4, 8 + data.length)));
  return chunk;
}

async function withDpi(blob, dpi) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  if (bytes.length < 33 || String.fromCharCode(...bytes.slice(1, 4)) !== 'PNG') return blob;
  const ihdrLength = readU32(bytes, 8);
  const insertAt = 8 + 12 + ihdrLength;
  const ppm = Math.round(Math.max(72, Math.min(1200, Number(dpi) || 300)) / 0.0254);
  const physData = new Uint8Array(9);
  const physView = new DataView(physData.buffer);
  physView.setUint32(0, ppm, false); physView.setUint32(4, ppm, false); physView.setUint8(8, 1);
  const phys = pngChunk('pHYs', physData);
  const combined = new Uint8Array(bytes.length + phys.length);
  combined.set(bytes.subarray(0, insertAt)); combined.set(phys, insertAt); combined.set(bytes.subarray(insertAt), insertAt + phys.length);
  return new Blob([combined], { type: 'image/png' });
}

async function imageFromSvg(project, dpi, widthMm = project.widthMm, heightMm = project.lengthMm) {
  const widthPx = Math.round(Number(widthMm) * pxPerMm(dpi));
  const heightPx = Math.round(Number(heightMm) * pxPerMm(dpi));
  const source = (await selfContainedArtwork(project))
    .replace(/width="\d+" height="\d+"/i, `width="${widthPx}" height="${heightPx}"`);
  const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.decoding = 'async';
    image.src = url;
    await image.decode();
    return { image, widthPx, heightPx };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function canvasBlob(canvas) {
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('O navegador não conseguiu criar o PNG.')), 'image/png'));
}

export async function createStickerPng(project, dpi = 300) {
  const { image, widthPx, heightPx } = await imageFromSvg(project, dpi);
  const canvas = document.createElement('canvas');
  canvas.width = widthPx; canvas.height = heightPx;
  canvas.getContext('2d', { alpha: true }).drawImage(image, 0, 0, widthPx, heightPx);
  return withDpi(await canvasBlob(canvas), dpi);
}

async function drawPrintHeader(context, options, dpi) {
  const header = options.header;
  if (!header?.enabled) return;
  const scale = pxPerMm(dpi);
  const left = Number(options.marginHorizontalMm) || 0;
  const centerY = ((Number(options.marginVerticalMm) || 0) + PRINT_HEADER_HEIGHT_MM / 2) * scale;
  const logoSource = /^data:image\/(?:png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(String(header.logoDataUrl || '')) ? header.logoDataUrl : '';
  if (logoSource) {
    const logo = new Image();
    logo.src = logoSource;
    await logo.decode();
    const logoSize = 12 * scale;
    const aspectRatio = logo.naturalWidth / logo.naturalHeight || 1;
    const logoWidth = aspectRatio >= 1 ? logoSize : logoSize * aspectRatio;
    const logoHeight = aspectRatio >= 1 ? logoSize / aspectRatio : logoSize;
    context.drawImage(logo, left * scale + 2 * scale + (logoSize - logoWidth) / 2, centerY - logoHeight / 2, logoWidth, logoHeight);
  }
  const text = String(header.text || '').trim();
  if (text) {
    context.save();
    context.fillStyle = '#70452f';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = `600 ${4 * scale}px Georgia, serif`;
    context.fillText(text, (Number(options.paperWidthMm) || A4.width) * scale / 2, centerY, ((Number(options.paperWidthMm) || A4.width) - left * 2 - 18) * scale);
    context.restore();
  }
}

export async function createSheetPng(items, options) {
  const dpi = Math.max(72, Math.min(1200, Number(options.dpi) || 300));
  const layout = previewLayout(options, items);
  if (!layout.placed) throw new Error('Não cabe nenhum adesivo na cartela. Reduza os tamanhos ou as margens.');
  const itemImages = new Map();
  for (const itemIndex of new Set(layout.positions.map((position) => position.itemIndex))) {
    const item = items[itemIndex];
    itemImages.set(itemIndex, await imageFromSvg(item.project, dpi, item.widthMm, item.heightMm));
  }
  const canvas = document.createElement('canvas');
  canvas.width = Math.round((options.paperWidthMm || A4.width) * pxPerMm(dpi));
  canvas.height = Math.round((options.paperHeightMm || A4.height) * pxPerMm(dpi));
  const context = canvas.getContext('2d', { alpha: false });
  context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height);
  await drawPrintHeader(context, options, dpi);
  const scale = pxPerMm(dpi);
  for (const position of layout.positions) {
    const image = itemImages.get(position.itemIndex).image;
    context.drawImage(image, position.x * scale, position.y * scale, position.widthMm * scale, position.heightMm * scale);
  }
  return { blob: await withDpi(await canvasBlob(canvas), dpi), layout, widthMm: options.paperWidthMm || A4.width, heightMm: options.paperHeightMm || A4.height };
}

export function previewLayout(options, items) {
  return multiSheetLayout({
    widthMm: options.paperWidthMm || A4.width,
    heightMm: options.paperHeightMm || A4.height,
    horizontalMarginMm: options.marginHorizontalMm,
    verticalMarginMm: options.marginVerticalMm,
    spacingMm: options.spacingMm,
    headerHeightMm: options.header?.enabled ? PRINT_HEADER_HEIGHT_MM : 0,
    items: items.map((item) => ({ id: item.id, quantity: item.quantity, widthMm: item.widthMm, heightMm: item.heightMm }))
  });
}

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

export async function printSheet(items, options) {
  const layout = previewLayout(options, items);
  if (!layout.placed) throw new Error('Não cabe nenhum adesivo na cartela. Reduza os tamanhos ou as margens.');
  const win = window.open('', '_blank');
  if (!win) throw new Error('Permita abrir a janela de impressão e tente novamente.');
  const imageSources = new Map();
  try {
    for (const itemIndex of new Set(layout.positions.map((position) => position.itemIndex))) {
      const svg = await selfContainedArtwork(items[itemIndex].project);
      imageSources.set(itemIndex, URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })));
    }
    const positions = layout.positions.map((position, index) => {
      const source = imageSources.get(position.itemIndex);
      return `<img alt="Adesivo ${index + 1}" src="${source}" style="position:absolute;left:${position.x}mm;top:${position.y}mm;width:${position.widthMm}mm;height:${position.heightMm}mm;object-fit:fill">`;
    }).join('');
    const headerText = options.header?.enabled ? escapeHtml(options.header.text || '') : '';
    const headerLogo = options.header?.enabled && /^data:image\/(?:png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(String(options.header.logoDataUrl || ''))
      ? `<img class="sheet-logo" src="${options.header.logoDataUrl}" alt="Logo"/>`
      : '';
    const header = options.header?.enabled
      ? `<header class="sheet-header" style="left:${layout.horizontalMarginMm}mm;top:${layout.verticalMarginMm}mm;width:${Number(options.paperWidthMm || A4.width) - layout.horizontalMarginMm * 2}mm;height:${PRINT_HEADER_HEIGHT_MM}mm">${headerLogo}<span>${headerText}</span></header>`
      : '';
    const paperWidth = Number(options.paperWidthMm) || A4.width;
    const paperHeight = Number(options.paperHeightMm) || A4.height;
    win.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${escapeHtml(options.cartName || 'Minha cartela')} · Guria Nails</title><style>@page{size:${paperWidth}mm ${paperHeight}mm;margin:0}*{box-sizing:border-box}html,body{margin:0;width:${paperWidth}mm;height:${paperHeight}mm;background:#fff}.sheet{position:relative;width:${paperWidth}mm;height:${paperHeight}mm;overflow:hidden}.sheet img{display:block}.sheet-header{position:absolute;display:flex;align-items:center;justify-content:center;border-bottom:.3mm solid #e5d7cd;color:#70452f;font:600 4mm Georgia,serif}.sheet-logo{position:absolute;left:2mm;width:12mm;height:12mm;object-fit:contain}@media screen{body{margin:20px auto;box-shadow:0 1px 12px #aaa}}</style></head><body><main class="sheet">${header}${positions}</main><script>addEventListener('load',()=>setTimeout(()=>print(),250));</script></body></html>`);
    win.addEventListener('pagehide', () => imageSources.forEach((source) => URL.revokeObjectURL(source)), { once: true });
    win.document.close();
  } catch (error) {
    win.close();
    imageSources.forEach((source) => URL.revokeObjectURL(source));
    throw error;
  }
  return layout;
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
