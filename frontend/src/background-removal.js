const MODEL_ID = 'studioludens/birefnet-lite-512';
const TRANSFORMERS_URL = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.2';

let segmentationPipeline;
let segmentationDevice;
let transformersModule;

async function getSegmentationPipeline(onProgress) {
  if (segmentationPipeline) return { pipeline: segmentationPipeline, device: segmentationDevice };

  transformersModule ||= import(TRANSFORMERS_URL);
  const { pipeline } = await transformersModule;
  let adapter = null;
  try { adapter = await globalThis.navigator?.gpu?.requestAdapter(); } catch { /* use WebAssembly fallback */ }

  if (adapter?.features?.has('shader-f16')) {
    try {
      segmentationPipeline = await pipeline('image-segmentation', MODEL_ID, {
        device: 'webgpu',
        dtype: 'fp16',
        progress_callback: (event) => onProgress?.(event)
      });
      segmentationDevice = 'webgpu';
      return { pipeline: segmentationPipeline, device: segmentationDevice };
    } catch {
      onProgress?.({ stage: 'fallback' });
    }
  }

  onProgress?.({ stage: 'fallback' });
  segmentationPipeline = await pipeline('image-segmentation', MODEL_ID, {
    device: 'wasm',
    dtype: 'fp32',
    progress_callback: (event) => onProgress?.(event)
  });
  segmentationDevice = 'wasm';
  return { pipeline: segmentationPipeline, device: segmentationDevice };
}

async function segmentImage(imageUrl, onProgress) {
  const segmenter = await getSegmentationPipeline(onProgress);
  try {
    return await segmenter.pipeline(imageUrl);
  } catch (error) {
    if (segmenter.device !== 'webgpu') throw error;
    segmentationPipeline = null;
    segmentationDevice = null;
    onProgress?.({ stage: 'fallback' });
    const fallback = await getWasmPipeline(onProgress);
    return fallback(imageUrl);
  }
}

async function getWasmPipeline(onProgress) {
  transformersModule ||= import(TRANSFORMERS_URL);
  const { pipeline } = await transformersModule;
  segmentationPipeline = await pipeline('image-segmentation', MODEL_ID, {
    device: 'wasm',
    dtype: 'fp32',
    progress_callback: (event) => onProgress?.(event)
  });
  segmentationDevice = 'wasm';
  return segmentationPipeline;
}

export async function removeImageBackground(imageSource, onProgress) {
  if (typeof imageSource !== 'string' || !imageSource.startsWith('data:image/')) {
    throw new Error('Selecione uma imagem enviada ou gerada para remover o fundo.');
  }

  onProgress?.({ stage: 'loading' });
  const segment = await getSegmentationPipeline(onProgress);
  onProgress?.({ stage: 'segmenting' });

  const imageUrl = URL.createObjectURL(await (await fetch(imageSource)).blob());
  try {
    const result = await segmentImage(imageUrl, onProgress);
    const maskImage = Array.isArray(result)
      ? result.find((item) => item?.mask)?.mask
      : result?.mask || result;
    if (!maskImage?.toCanvas) throw new Error('A IA não conseguiu gerar a máscara desta imagem.');

    const maskCanvas = maskImage.toCanvas();
    const sourceImage = await loadImage(imageSource);
    const canvas = document.createElement('canvas');
    canvas.width = sourceImage.naturalWidth;
    canvas.height = sourceImage.naturalHeight;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('O navegador não conseguiu preparar a imagem.');

    context.drawImage(sourceImage, 0, 0, canvas.width, canvas.height);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    const alphaCanvas = document.createElement('canvas');
    alphaCanvas.width = canvas.width;
    alphaCanvas.height = canvas.height;
    const alphaContext = alphaCanvas.getContext('2d', { willReadFrequently: true });
    if (!alphaContext) throw new Error('O navegador não conseguiu aplicar a máscara.');
    alphaContext.imageSmoothingEnabled = true;
    alphaContext.imageSmoothingQuality = 'high';
    alphaContext.drawImage(maskCanvas, 0, 0, canvas.width, canvas.height);
    const mask = alphaContext.getImageData(0, 0, canvas.width, canvas.height).data;

    for (let pixel = 0, offset = 0; pixel < pixels.data.length; pixel += 4, offset += 4) {
      const maskAlpha = mask[offset];
      pixels.data[pixel + 3] = Math.round(pixels.data[pixel + 3] * maskAlpha / 255);
    }
    context.putImageData(pixels, 0, 0);

    const webp = canvas.toDataURL('image/webp', 0.94);
    const dataUrl = webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/png');
    if (dataUrl.length > 4_500_000) throw new Error('A imagem sem fundo ficou grande demais para salvar. Reduza as dimensões e tente novamente.');
    return dataUrl;
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Não foi possível abrir a imagem selecionada.'));
    image.src = source;
  });
}
