import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { clampLayer, coverLayerToBoard, layerWidthLimit, resizeLayerToWidth, sheetLayout } from '../src/geometry.js';
import { blankProject } from '../src/store.js';
import { renderEditor } from '../src/editor.js';

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

test('the home wordmark is a compact PNG with transparency', async () => {
  const logo = await readFile(new URL('../assets/guria-wordmark.png', import.meta.url));
  assert.equal(logo.toString('ascii', 12, 16), 'IHDR');
  assert.equal(logo[25], 6);
  assert.ok(logo.readUInt32BE(16) < 600);
  assert.ok(logo.readUInt32BE(20) < 650);
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
  assert.match(markup, /preserveAspectRatio="xMidYMid meet"/);
});
