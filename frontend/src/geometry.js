export const CANVAS = Object.freeze({ width: 420, height: 560, boardX: 54, boardY: 30, boardWidth: 312, boardHeight: 500 });

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function clampLayer(layer) {
  const width = clamp(Number(layer.width) || 64, 18, CANVAS.boardWidth);
  const height = clamp(Number(layer.height) || width, 18, CANVAS.boardHeight);
  return {
    ...layer,
    width,
    height,
    x: clamp(Number(layer.x) || CANVAS.boardX, CANVAS.boardX, CANVAS.boardX + CANVAS.boardWidth - width),
    y: clamp(Number(layer.y) || CANVAS.boardY, CANVAS.boardY, CANVAS.boardY + CANVAS.boardHeight - height),
    rotation: ((Number(layer.rotation) || 0) % 360 + 360) % 360
  };
}

function aspectRatioOf(layer) {
  const storedAspect = Number(layer.aspectRatio);
  if (Number.isFinite(storedAspect) && storedAspect > 0) return storedAspect;
  const width = Number(layer.width) || 64;
  const height = Number(layer.height) || width;
  return width / height;
}

export function layerWidthLimit(layer, board = CANVAS) {
  const aspectRatio = aspectRatioOf(layer);
  return Math.max(18, Math.floor(Math.min(board.boardWidth, board.boardHeight * aspectRatio)));
}

export function resizeLayerToWidth(layer, requestedWidth, board = CANVAS) {
  const aspectRatio = aspectRatioOf(layer);
  const width = clamp(Number(requestedWidth) || 18, 18, layerWidthLimit(layer, board));
  const height = width / aspectRatio;
  const centerX = (Number(layer.x) || board.boardX) + (Number(layer.width) || 64) / 2;
  const centerY = (Number(layer.y) || board.boardY) + (Number(layer.height) || Number(layer.width) || 64) / 2;
  return {
    ...layer,
    ...(layer.type === 'image' ? { fitMode: 'contain' } : {}),
    width,
    height,
    x: clamp(centerX - width / 2, board.boardX, board.boardX + board.boardWidth - width),
    y: clamp(centerY - height / 2, board.boardY, board.boardY + board.boardHeight - height)
  };
}

export function coverLayerToBoard(layer, board = CANVAS) {
  return {
    ...layer,
    aspectRatio: aspectRatioOf(layer),
    fitMode: 'cover',
    x: board.boardX,
    y: board.boardY,
    width: board.boardWidth,
    height: board.boardHeight
  };
}

export function sheetLayout({ widthMm, heightMm, marginMm, horizontalMarginMm, verticalMarginMm, spacingMm, stickerWidthMm, stickerHeightMm, quantity }) {
  const safeMarginX = Math.max(0, Number(horizontalMarginMm ?? marginMm) || 0);
  const safeMarginY = Math.max(0, Number(verticalMarginMm ?? marginMm) || 0);
  const gap = Math.max(0, Number(spacingMm) || 0);
  const stickerW = Math.max(1, Number(stickerWidthMm) || 10);
  const stickerH = Math.max(1, Number(stickerHeightMm) || 14);
  const columns = Math.max(0, Math.floor((widthMm - safeMarginX * 2 + gap) / (stickerW + gap)));
  const rows = Math.max(0, Math.floor((heightMm - safeMarginY * 2 + gap) / (stickerH + gap)));
  const capacity = columns * rows;
  return {
    columns,
    rows,
    capacity,
    placed: Math.min(capacity, Math.max(0, Math.floor(Number(quantity) || 0))),
    overflow: Math.max(0, Math.floor(Number(quantity) || 0) - capacity),
    stickerWidthMm: stickerW,
    stickerHeightMm: stickerH,
    marginMm: safeMarginX,
    horizontalMarginMm: safeMarginX,
    verticalMarginMm: safeMarginY,
    spacingMm: gap
  };
}

export function multiSheetLayout({ widthMm, heightMm, horizontalMarginMm = 0, verticalMarginMm = 0, spacingMm = 0, headerHeightMm = 0, items = [] }) {
  const safeWidth = Math.max(1, Number(widthMm) || 210);
  const safeHeight = Math.max(1, Number(heightMm) || 297);
  const marginX = Math.max(0, Number(horizontalMarginMm) || 0);
  const marginY = Math.max(0, Number(verticalMarginMm) || 0);
  const gap = Math.max(0, Number(spacingMm) || 0);
  const headerHeight = Math.max(0, Number(headerHeightMm) || 0);
  const normalized = items.map((item, index) => ({
    id: item.id ?? String(index),
    quantity: Math.max(0, Math.floor(Number(item.quantity) || 0)),
    widthMm: Math.max(1, Number(item.widthMm) || 10),
    heightMm: Math.max(1, Number(item.heightMm) || 14)
  }));
  const requested = normalized.reduce((sum, item) => sum + item.quantity, 0);
  if (!normalized.length || !requested) {
    return { placed: 0, requested, overflow: requested, positions: [], horizontalMarginMm: marginX, verticalMarginMm: marginY, spacingMm: gap, headerHeightMm: headerHeight };
  }

  const availableWidth = safeWidth - marginX * 2;
  const availableHeight = safeHeight - marginY * 2 - headerHeight;
  const rightEdge = safeWidth - marginX;
  const bottomEdge = safeHeight - marginY;
  const positions = [];
  let x = marginX;
  let y = marginY + headerHeight;
  let rowHeight = 0;
  let overflow = 0;
  for (let itemIndex = 0; itemIndex < normalized.length; itemIndex++) {
    const item = normalized[itemIndex];
    for (let count = 0; count < item.quantity; count++) {
      if (item.widthMm > availableWidth || item.heightMm > availableHeight) { overflow++; continue; }
      if (x > marginX && x + item.widthMm > rightEdge) {
        y += rowHeight + gap;
        x = marginX;
        rowHeight = 0;
      }
      if (y + item.heightMm > bottomEdge) { overflow++; continue; }
      positions.push({ itemIndex, itemId: item.id, x, y, widthMm: item.widthMm, heightMm: item.heightMm });
      x += item.widthMm + gap;
      rowHeight = Math.max(rowHeight, item.heightMm);
    }
  }
  const placed = positions.length;
  return {
    placed, requested, overflow: requested - placed, positions,
    horizontalMarginMm: marginX, verticalMarginMm: marginY,
    spacingMm: gap, headerHeightMm: headerHeight
  };
}

export function formatMeasurement(value) {
  const number = Number(value);
  return Number.isFinite(number) ? `${number.toFixed(number % 1 ? 1 : 0)} mm` : '—';
}
