import { artworkSvg } from './editor.js';
import { sheetLayout } from './geometry.js';

const A4 = Object.freeze({ width: 210, height: 297 });
const pxPerMm = (dpi) => Math.max(72, Math.min(1200, Number(dpi) || 300)) / 25.4;

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

async function imageFromSvg(project, dpi) {
  const widthPx = Math.round(Number(project.widthMm) * pxPerMm(dpi));
  const heightPx = Math.round(Number(project.lengthMm) * pxPerMm(dpi));
  const source = artworkSvg(project, project.backgroundMode === 'color')
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

export async function createSheetPng(project, options) {
  const dpi = Math.max(72, Math.min(1200, Number(options.dpi) || 300));
  const layout = sheetLayout({ widthMm: options.paperWidthMm || A4.width, heightMm: options.paperHeightMm || A4.height, horizontalMarginMm: options.marginHorizontalMm ?? options.marginMm, verticalMarginMm: options.marginVerticalMm ?? options.marginMm, spacingMm: options.spacingMm, stickerWidthMm: options.stickerWidthMm || project.widthMm, stickerHeightMm: options.stickerHeightMm || project.lengthMm, quantity: options.quantity });
  if (!layout.placed) throw new Error('Não cabe nenhuma arte na cartela. Reduza a margem ou o tamanho do adesivo.');
  const { image } = await imageFromSvg({ ...project, widthMm: layout.stickerWidthMm, lengthMm: layout.stickerHeightMm }, dpi);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round((options.paperWidthMm || A4.width) * pxPerMm(dpi));
  canvas.height = Math.round((options.paperHeightMm || A4.height) * pxPerMm(dpi));
  const context = canvas.getContext('2d', { alpha: false });
  context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height);
  const scale = pxPerMm(dpi);
  for (let index = 0; index < layout.placed; index++) {
    const col = index % layout.columns; const row = Math.floor(index / layout.columns);
    const x = (layout.horizontalMarginMm + col * (layout.stickerWidthMm + layout.spacingMm)) * scale;
    const y = (layout.verticalMarginMm + row * (layout.stickerHeightMm + layout.spacingMm)) * scale;
    context.drawImage(image, x, y, layout.stickerWidthMm * scale, layout.stickerHeightMm * scale);
  }
  return { blob: await withDpi(await canvasBlob(canvas), dpi), layout, widthMm: options.paperWidthMm || A4.width, heightMm: options.paperHeightMm || A4.height };
}

export function previewLayout(options, project) {
  return sheetLayout({ widthMm: options.paperWidthMm || A4.width, heightMm: options.paperHeightMm || A4.height, horizontalMarginMm: options.marginHorizontalMm ?? options.marginMm, verticalMarginMm: options.marginVerticalMm ?? options.marginMm, spacingMm: options.spacingMm, stickerWidthMm: options.stickerWidthMm || project.widthMm, stickerHeightMm: options.stickerHeightMm || project.lengthMm, quantity: options.quantity });
}

export async function printSheet(project, options) {
  const layout = previewLayout(options, project);
  if (!layout.placed) throw new Error('Não há espaço suficiente para imprimir essa quantidade.');
  const svg = artworkSvg({ ...project, widthMm: layout.stickerWidthMm, lengthMm: layout.stickerHeightMm }, project.backgroundMode === 'color');
  const imgSource = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
  const win = window.open('', '_blank');
  if (!win) { URL.revokeObjectURL(imgSource); throw new Error('Permita abrir a janela de impressão e tente novamente.'); }
  const positions = Array.from({ length: layout.placed }, (_, index) => {
    const x = layout.horizontalMarginMm + (index % layout.columns) * (layout.stickerWidthMm + layout.spacingMm);
    const y = layout.verticalMarginMm + Math.floor(index / layout.columns) * (layout.stickerHeightMm + layout.spacingMm);
    return `<img alt="Adesivo ${index + 1}" src="${imgSource}" style="position:absolute;left:${x}mm;top:${y}mm;width:${layout.stickerWidthMm}mm;height:${layout.stickerHeightMm}mm;object-fit:fill">`;
  }).join('');
  win.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Cartela · Guria Nails</title><style>@page{size:A4 portrait;margin:0}*{box-sizing:border-box}html,body{margin:0;width:210mm;height:297mm;background:#fff}.sheet{position:relative;width:210mm;height:297mm;overflow:hidden}img{display:block}@media screen{body{margin:20px auto;box-shadow:0 1px 12px #aaa}}</style></head><body><main class="sheet">${positions}</main><script>addEventListener('load',()=>setTimeout(()=>print(),250));</script></body></html>`);
  win.addEventListener('pagehide', () => URL.revokeObjectURL(imgSource), { once: true });
  win.document.close();
  return layout;
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
