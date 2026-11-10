let catalogPromise;
let iconCache = new Map();

export function loadCatalog() {
  if (!catalogPromise) {
    catalogPromise = fetch('/data/catalog.json').then((response) => {
      if (!response.ok) throw new Error('Não foi possível carregar a biblioteca de elementos.');
      return response.json();
    });
  }
  return catalogPromise;
}

export async function loadElementSvg(path) {
  if (iconCache.has(path)) return iconCache.get(path);
  const response = await fetch(path);
  if (!response.ok) throw new Error('Este elemento não está disponível agora.');
  const svg = await response.text();
  if (!svg.startsWith('<svg') || /<script|onload=|javascript:/i.test(svg)) {
    throw new Error('O arquivo do elemento não passou pela validação.');
  }
  iconCache.set(path, svg);
  return svg;
}

export function findElement(catalog, elementId) {
  for (const category of catalog.categories) {
    const element = category.elements.find((item) => item.id === elementId);
    if (element) return { ...element, category: category.name, categoryId: category.id };
  }
  return null;
}

export function flattenCatalog(catalog) {
  return catalog.categories.flatMap((category) => category.elements.map((element) => ({
    ...element,
    category: category.name,
    categoryId: category.id,
    categoryIcon: category.icon
  })));
}
