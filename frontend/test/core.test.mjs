import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { clampLayer, coverLayerToBoard, layerWidthLimit, multiSheetLayout, resizeLayerToWidth, sheetLayout } from '../src/geometry.js';
import { blankProject, clearSessionStorage, deleteNailMeasurement, loadNailMeasurements, loadProjects, saveProjects, setStorageScope, upsertNailMeasurement } from '../src/store.js';
import { artworkSvg, renderEditor } from '../src/editor.js';
import { createArtworkPreviewUrl } from '../src/print.js';

test('sheet layout respects A4 margins and requested quantity', () => {
  const layout = sheetLayout({ widthMm: 210, heightMm: 297, marginMm: 10, spacingMm: 4, stickerWidthMm: 10, stickerHeightMm: 14, quantity: 100 });
  assert.equal(layout.columns, 13);
  assert.equal(layout.rows, 15);
  assert.equal(layout.placed, 100);
  assert.equal(layout.overflow, 0);
});

test('sheet layout reports overflow instead of exceeding its capacity', () => {
  const layout = sheetLayout({ widthMm: 210, heightMm: 297, marginMm: 10, spacingMm: 4, stickerWidthMm: 40, stickerHeightMm: 60, quantity: 50 });
  assert.equal(layout.placed, layout.capacity);
  assert.equal(layout.overflow, 50 - layout.capacity);
});

test('sheet layout uses independent horizontal and vertical margins', () => {
  const layout = sheetLayout({ widthMm: 210, heightMm: 297, horizontalMarginMm: 20, verticalMarginMm: 8, spacingMm: 4, stickerWidthMm: 10, stickerHeightMm: 14, quantity: 10 });
  assert.equal(layout.horizontalMarginMm, 20);
  assert.equal(layout.verticalMarginMm, 8);
  assert.equal(layout.columns, 12);
  assert.equal(layout.rows, 15);
});

test('mixed cart sheets place requested quantities at each design\'s own size below an optional header', () => {
  const layout = multiSheetLayout({
    widthMm: 100, heightMm: 100, horizontalMarginMm: 10, verticalMarginMm: 5,
    spacingMm: 2, headerHeightMm: 20,
    items: [
      { id: 'small', quantity: 2, widthMm: 8, heightMm: 12 },
      { id: 'large', quantity: 1, widthMm: 12, heightMm: 18 }
    ]
  });
  assert.equal(layout.requested, 3);
  assert.equal(layout.placed, 3);
  assert.equal(layout.overflow, 0);
  assert.equal(layout.positions[0].widthMm, 8);
  assert.equal(layout.positions[2].heightMm, 18);
  assert.equal(layout.positions[0].y, 25);
  const fullPage = multiSheetLayout({
    widthMm: 100, heightMm: 100, horizontalMarginMm: 10, verticalMarginMm: 5,
    spacingMm: 2, headerHeightMm: 0,
    items: [{ id: 'small', quantity: 2, widthMm: 8, heightMm: 12 }]
  });
  assert.equal(fullPage.positions[0].y, 5);
});

test('layer geometry stays inside the editable nail area', () => {
  const layer = clampLayer({ id: 'sample', x: 900, y: -50, width: 90, height: 120, rotation: 375 });
  assert.equal(layer.x, 276);
  assert.equal(layer.y, 30);
  assert.equal(layer.rotation, 15);
});

test('uploaded images can grow to the nail bounds while keeping their aspect ratio', () => {
  const image = { type: 'image', aspectRatio: 0.8, x: 146, y: 200, width: 128, height: 160, fitMode: 'contain' };
  assert.equal(layerWidthLimit(image), 312);
  const enlarged = resizeLayerToWidth(image, 312);
  assert.equal(enlarged.width, 312);
  assert.equal(enlarged.height, 390);
  assert.equal(enlarged.x, 54);
  assert.equal(enlarged.y, 85);
  assert.equal(enlarged.fitMode, 'contain');
});

test('covering the nail fills the printable area and keeps the source aspect ratio for cropping', () => {
  const image = { type: 'image', aspectRatio: 0.8, width: 128, height: 160 };
  const covered = coverLayerToBoard(image);
  assert.deepEqual([covered.x, covered.y, covered.width, covered.height], [54, 30, 312, 500]);
  assert.equal(covered.aspectRatio, 0.8);
  assert.equal(covered.fitMode, 'cover');
});

test('a new project preserves editable dimensions and an empty layer stack', () => {
  const project = blankProject('Teste de arte');
  assert.equal(project.name, 'Teste de arte');
  assert.equal(project.widthMm, 10);
  assert.equal(project.lengthMm, 14);
  assert.deepEqual(project.elements, []);
});

test('nail measurements can be saved, edited, and removed from local storage', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const values = new Map();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, String(value)),
      removeItem: (key) => values.delete(key)
    }
  });
  try {
    const first = upsertNailMeasurement({ name: 'Unha Clara', widthMm: 12.5, lengthMm: 14.1 });
    assert.equal(first.length, 1);
    assert.deepEqual([first[0].name, first[0].widthMm, first[0].lengthMm], ['Unha Clara', 12.5, 14.1]);
    const edited = upsertNailMeasurement({ id: first[0].id, name: 'Clara', widthMm: 12, lengthMm: 13 }, first);
    assert.equal(edited.length, 1);
    assert.equal(loadNailMeasurements()[0].name, 'Clara');
    assert.deepEqual(deleteNailMeasurement(first[0].id, edited), []);
    assert.throws(() => upsertNailMeasurement({ name: 'Inválida', widthMm: 41, lengthMm: 10 }), /largura/i);
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor);
    else delete globalThis.localStorage;
  }
});

test('project caches stay isolated between anonymous event sessions', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const values = new Map();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, String(value)),
      removeItem: (key) => values.delete(key)
    }
  });
  try {
    setStorageScope('session-a');
    saveProjects([blankProject('Projeto A')]);
    setStorageScope('session-b');
    assert.deepEqual(loadProjects(), []);
    saveProjects([blankProject('Projeto B')]);
    setStorageScope('session-a');
    assert.equal(loadProjects()[0].name, 'Projeto A');
    clearSessionStorage();
    assert.deepEqual(loadProjects(), []);
    setStorageScope('session-b');
    assert.equal(loadProjects()[0].name, 'Projeto B');
  } finally {
    setStorageScope(null);
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor);
    else delete globalThis.localStorage;
  }
});

test('every local catalog asset exists and the requested category groups are present', async () => {
  const catalog = JSON.parse(await readFile(new URL('../data/catalog.json', import.meta.url), 'utf8'));
  assert.equal(catalog.categories.length, 11);
  for (const element of catalog.categories.flatMap((category) => category.elements)) {
    const assetPath = new URL(`..${element.asset}`, import.meta.url);
    const source = await readFile(assetPath, 'utf8');
    assert.match(source, /^<svg\b/);
    assert.doesNotMatch(source, /<script|onload=|javascript:/i);
  }
});

test('the supplied SVGs are listed in existing categories and stay image layers in designs', async () => {
  const catalog = JSON.parse(await readFile(new URL('../data/catalog.json', import.meta.url), 'utf8'));
  const animals = catalog.categories.find((category) => category.id === 'animals');
  const florals = catalog.categories.find((category) => category.id === 'florals');
  assert.equal(animals.elements.length, 11);
  assert.equal(florals.elements.length, 6);
  for (const name of ['Arara', 'Calopsita', 'Capivara', 'Cavalo', 'Joaninha', 'Vaca']) {
    assert.ok(animals.elements.some((element) => element.name === name));
  }
  for (const name of ['Flor tradicional', 'Rosa vermelha']) {
    assert.ok(florals.elements.some((element) => element.name === name));
  }
  const imported = animals.elements.find((element) => element.name === 'Panda');
  assert.equal(imported.renderAsImage, true);
  assert.equal(imported.colors, undefined);
  const project = blankProject();
  project.elements.push({
    id: 'panda-imported', type: 'image', name: imported.name, dataUrl: imported.asset,
    aspectRatio: imported.aspectRatio, fitMode: 'contain', x: 120, y: 140, width: 70, height: 70
  });
  assert.ok(artworkSvg(project).includes(`href="${imported.asset}"`));
});

test('the new SVG collection is categorized and monochrome art exposes a working single-color control', async () => {
  const [catalog, settings] = await Promise.all([
    readFile(new URL('../data/catalog.json', import.meta.url), 'utf8').then(JSON.parse),
    readFile(new URL('../data/size-presets.json', import.meta.url), 'utf8').then(JSON.parse)
  ]);
  const expectedAdds = { alternative: 10, dates: 9, seasons: 15, florals: 2, objects: 7 };
  for (const [categoryId, count] of Object.entries(expectedAdds)) {
    const category = catalog.categories.find((item) => item.id === categoryId);
    assert.ok(category);
    assert.equal(category.elements.filter((item) => item.id.startsWith('import-')).length, count);
  }

  const alternative = catalog.categories.find((item) => item.id === 'alternative');
  const cross = alternative.elements.find((item) => item.name === 'Cruz gótica');
  const sparkle = alternative.elements.find((item) => item.name === 'Brilho');
  assert.equal(cross.monochrome, true);
  assert.equal(sparkle.monochrome, true);
  assert.match(await readFile(new URL(`..${cross.asset}`, import.meta.url), 'utf8'), /var\(--guria-primary/);

  const project = blankProject();
  project.elements.push({
    id: 'cross', type: 'icon', name: cross.name, asset: cross.asset,
    svg: await readFile(new URL(`..${cross.asset}`, import.meta.url), 'utf8'),
    color: cross.colors.primary, monochrome: true, width: 70, height: 70, x: 100, y: 100
  });
  const markup = renderEditor(project, catalog, settings);
  assert.match(markup, /data-property="color"/);
  assert.doesNotMatch(markup, /data-property="secondaryColor"|data-property="detailColor"/);
  assert.match(markup, /viewBox="0 0 810 809\.999993"/);

  const complex = alternative.elements.find((item) => item.name === 'Caveira com espinhos');
  assert.equal(complex.renderAsImage, true);
  assert.equal(complex.colors, undefined);
});

test('print previews embed imported SVGs so their artwork survives standalone export', async () => {
  const project = blankProject();
  project.elements.push({
    id: 'imported-flower', type: 'image', dataUrl: '/assets/elements/user-imports/florals/flower-test.svg',
    aspectRatio: 1, x: 100, y: 100, width: 70, height: 70
  });
  project.elements.push({
    id: 'imported-alternative', type: 'image', dataUrl: '/assets/elements/user-imports/alternative/alternative-test.svg',
    aspectRatio: 1, x: 180, y: 100, width: 70, height: 70
  });
  const originalFetch = globalThis.fetch;
  let previewUrl;
  const bundledAssets = new Set([
    '/assets/elements/user-imports/florals/flower-test.svg',
    '/assets/elements/user-imports/alternative/alternative-test.svg'
  ]);
  globalThis.fetch = async (asset) => ({
    ok: bundledAssets.has(asset),
    text: async () => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path d="M1 1h8v8H1z"/></svg>'
  });
  try {
    previewUrl = await createArtworkPreviewUrl(project);
    const svg = await (await originalFetch(previewUrl)).text();
    const embedded = [...svg.matchAll(/href="data:image\/svg\+xml;base64,([^"]+)"/g)];
    assert.equal(embedded.length, 2);
    for (const match of embedded) assert.match(Buffer.from(match[1], 'base64').toString('utf8'), /<path d="M1 1h8v8H1z"\/>/);
  } finally {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    globalThis.fetch = originalFetch;
  }
});

test('the home wordmark is a compact PNG with transparency', async () => {
  const logo = await readFile(new URL('../assets/guria-wordmark.png', import.meta.url));
  assert.equal(logo.toString('ascii', 12, 16), 'IHDR');
  assert.equal(logo[25], 6);
  assert.ok(logo.readUInt32BE(16) < 600);
  assert.ok(logo.readUInt32BE(20) < 650);
});

test('the Instagram button uses the supplied safe local logo', async () => {
  const [main, logo] = await Promise.all([
    readFile(new URL('../src/main.js', import.meta.url), 'utf8'),
    readFile(new URL('../assets/logo-instagram.svg', import.meta.url), 'utf8')
  ]);
  assert.match(main, /assets\/logo-instagram\.svg/);
  assert.match(main, /https:\/\/www\.instagram\.com\/guria\.nails\//);
  assert.match(logo, /^<svg\b/);
  assert.doesNotMatch(logo, /<(?:script|foreignObject)\b|\bon\w+\s*=|\b(?:href|xlink:href)\s*=|javascript:/i);
});

test('transparent background keeps its color control and uploaded art can fill the nail', async () => {
  const [catalog, settings] = await Promise.all([
    readFile(new URL('../data/catalog.json', import.meta.url), 'utf8').then(JSON.parse),
    readFile(new URL('../data/size-presets.json', import.meta.url), 'utf8').then(JSON.parse)
  ]);
  const project = blankProject();
  project.elements.push({
    id: 'uploaded-logo', type: 'image', name: 'Logo', dataUrl: 'data:image/png;base64,aGVsbG8=',
    aspectRatio: 0.8, fitMode: 'contain', x: 54, y: 85, width: 312, height: 390, rotation: 0
  });

  const markup = renderEditor(project, catalog, settings);
  assert.match(markup, /id="background-color" type="color"[^>]*data-project-field="backgroundColor"/);
  assert.match(markup, /A cor fica guardada/);
  assert.match(markup, /id="element-size" type="range" min="18" max="312"/);
  assert.match(markup, /data-action="cover-nail"/);
  assert.match(markup, /data-action="fit-image"/);
  assert.match(markup, /data-action="remove-background"/);
  assert.match(markup, /data-action="rename-design"/);
  assert.match(markup, /data-action="new-project"/);
  assert.match(markup, /Medidas salvas/);
  assert.match(markup, /preserveAspectRatio="xMidYMid meet"/);
  assert.match(markup, /data-action="delete-selected"/);
  assert.match(markup, /data-layer-delete="uploaded-logo"/);
});
