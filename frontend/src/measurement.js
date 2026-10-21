const phases = [
  { key: 'reference', label: 'referência', instruction: 'Na régua, marque dois traços cuja distância você conhece.' },
  { key: 'width', label: 'largura', instruction: 'Marque as duas laterais da unha no ponto mais largo.' },
  { key: 'length', label: 'comprimento', instruction: 'Marque a base da unha, junto à cutícula, e a ponta.' }
];

const distance = (first, second) => Math.hypot(second.x - first.x, second.y - first.y);

export function openNailMeasurement(onApply, notify) {
  const overlay = document.createElement('div');
  overlay.className = 'measure-backdrop';
  overlay.innerHTML = `<section class="measure-dialog" role="dialog" aria-modal="true" aria-labelledby="measure-title">
    <header class="measure-header"><div><p class="eyebrow">Ajuste das dimensões</p><h2 id="measure-title">Medir tamanho aproximado</h2></div><button class="icon-button" type="button" data-measure-close aria-label="Fechar medidor">×</button></header>
    <p class="measure-intro">Fotografe a unha e uma régua milimetrada lado a lado, na mesma superfície e no mesmo plano. A imagem é processada somente neste navegador.</p>
    <div class="measure-media"><video id="measure-video" autoplay muted playsinline hidden></video><canvas id="measure-canvas" class="measure-canvas" hidden></canvas><p id="measure-message" class="measure-message" aria-live="polite">Abrindo câmera… Se preferir, escolha uma foto abaixo.</p></div>
    <div class="button-row measure-source-actions"><button class="button button-primary" id="measure-capture" type="button" hidden>Capturar foto</button><label class="button button-secondary" for="measure-file">Escolher foto<input id="measure-file" class="upload-input" type="file" accept="image/png,image/jpeg,image/webp" capture="environment"/></label></div>
    <div id="measure-controls" class="measure-controls" hidden><div class="field measure-reference"><label for="measure-reference-mm">Distância marcada na régua (mm)</label><input id="measure-reference-mm" type="number" min="1" max="100" step="1" value="10"/><p class="field-hint">Use de preferência um trecho de 10 mm, bem visível na foto.</p></div><p id="measure-instruction" class="measure-instruction"></p><p id="measure-result" class="measure-result" aria-live="polite"></p><div class="button-row"><button class="button button-quiet button-sm" id="measure-reset" type="button">Refazer marcações</button><button class="button button-primary" id="measure-apply" type="button" disabled>Usar estas medidas</button></div><p class="field-hint">É uma estimativa: perspectiva, inclinação e posição da régua podem alterar o resultado. Confira as dimensões antes de imprimir.</p></div>
  </section>`;

  const video = overlay.querySelector('#measure-video');
  const canvas = overlay.querySelector('#measure-canvas');
  const context = canvas.getContext('2d');
  const message = overlay.querySelector('#measure-message');
  const controls = overlay.querySelector('#measure-controls');
  const instruction = overlay.querySelector('#measure-instruction');
  const result = overlay.querySelector('#measure-result');
  const capture = overlay.querySelector('#measure-capture');
  const apply = overlay.querySelector('#measure-apply');
  let stream = null;
  let closed = false;
  let phaseIndex = 0;
  let currentPoints = [];
  let marked = [];
  let capturedSource = null;
  let pixelsPerMm = 0;
  let measuredWidth = 0;
  let measuredLength = 0;

  const stopCamera = () => {
    stream?.getTracks().forEach((track) => track.stop());
    stream = null;
    video.srcObject = null;
  };

  const close = () => {
    if (closed) return;
    closed = true;
    stopCamera();
    window.removeEventListener('keydown', onKeyDown);
    overlay.remove();
  };

  const onKeyDown = (event) => { if (event.key === 'Escape') close(); };

  const redraw = () => {
    if (!canvas.width || !canvas.height) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    if (capturedSource) context.drawImage(capturedSource, 0, 0, canvas.width, canvas.height);
    context.lineCap = 'round';
    context.lineJoin = 'round';
    const scale = Math.max(1, canvas.width / 900);
    for (const segment of marked) {
      context.strokeStyle = segment.color;
      context.fillStyle = segment.color;
      context.lineWidth = 3 * scale;
      context.beginPath();
      context.moveTo(segment.points[0].x, segment.points[0].y);
      context.lineTo(segment.points[1].x, segment.points[1].y);
      context.stroke();
      for (const point of segment.points) {
        context.beginPath(); context.arc(point.x, point.y, 5 * scale, 0, Math.PI * 2); context.fill();
      }
      context.font = `600 ${Math.max(15, 17 * scale)}px system-ui`;
      context.fillText(segment.label, segment.points[1].x + 8 * scale, segment.points[1].y - 8 * scale);
    }
    if (currentPoints.length) {
      const point = currentPoints[0];
      context.fillStyle = '#70442e';
      context.beginPath(); context.arc(point.x, point.y, 6 * scale, 0, Math.PI * 2); context.fill();
    }
  };

  const showPhase = () => {
    const phase = phases[phaseIndex];
    if (!phase) return;
    instruction.textContent = `Etapa ${phaseIndex + 1} de 3 · ${phase.instruction} Toque em dois pontos na imagem.`;
    overlay.querySelector('.measure-reference').hidden = phase.key !== 'reference';
    result.textContent = '';
    apply.disabled = true;
  };

  const setImage = (source, width, height) => {
    const ratio = Math.min(1600 / width, 1600 / height, 1);
    canvas.width = Math.max(1, Math.round(width * ratio));
    canvas.height = Math.max(1, Math.round(height * ratio));
    capturedSource = source;
    video.hidden = true;
    capture.hidden = true;
    canvas.hidden = false;
    controls.hidden = false;
    message.textContent = 'Marque os pontos sobre a foto. Amplie a imagem com a câmera, se necessário, para facilitar a marcação.';
    redraw();
    showPhase();
  };

  overlay.querySelector('[data-measure-close]').addEventListener('click', close);
  overlay.addEventListener('click', (event) => { if (event.target === overlay) close(); });
  window.addEventListener('keydown', onKeyDown);
  document.body.append(overlay);

  const startCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      message.textContent = 'A câmera não está disponível neste navegador. Escolha uma foto com a régua ao lado da unha.';
      return;
    }
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      if (closed) { stopCamera(); return; }
      video.srcObject = stream;
      await video.play();
      video.hidden = false;
      capture.hidden = false;
      message.textContent = 'Enquadre a unha inteira e a régua lado a lado, sem inclinar a câmera.';
    } catch {
      stopCamera();
      message.textContent = 'Não foi possível abrir a câmera. Permita o acesso ou escolha uma foto com a régua ao lado da unha.';
    }
  };

  capture.addEventListener('click', () => {
    if (!video.videoWidth || !video.videoHeight) return;
    const source = document.createElement('canvas');
    source.width = video.videoWidth;
    source.height = video.videoHeight;
    source.getContext('2d').drawImage(video, 0, 0);
    stopCamera();
    setImage(source, source.width, source.height);
  });

  overlay.querySelector('#measure-file').addEventListener('change', (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) { notify?.('Escolha uma foto PNG, JPG ou WEBP.', true); return; }
    const image = new Image();
    const sourceUrl = URL.createObjectURL(file);
    image.onload = () => {
      stopCamera();
      setImage(image, image.naturalWidth, image.naturalHeight);
      URL.revokeObjectURL(sourceUrl);
    };
    image.onerror = () => { URL.revokeObjectURL(sourceUrl); message.textContent = 'Não foi possível abrir esta imagem. Escolha outro arquivo.'; };
    image.src = sourceUrl;
  });

  canvas.addEventListener('pointerdown', (event) => {
    if (canvas.hidden || phaseIndex >= phases.length) return;
    const bounds = canvas.getBoundingClientRect();
    const point = { x: (event.clientX - bounds.left) * canvas.width / bounds.width, y: (event.clientY - bounds.top) * canvas.height / bounds.height };
    currentPoints.push(point);
    redraw();
    if (currentPoints.length < 2) return;
    const pixels = distance(currentPoints[0], currentPoints[1]);
    const phase = phases[phaseIndex];
    if (pixels < Math.max(8, canvas.width / 500)) {
      currentPoints = [];
      redraw();
      message.textContent = 'Os dois pontos ficaram muito próximos. Toque em pontos mais afastados.';
      return;
    }
    if (phase.key === 'reference') {
      const referenceMm = Number(overlay.querySelector('#measure-reference-mm').value);
      if (!Number.isFinite(referenceMm) || referenceMm <= 0) {
        currentPoints = [];
        redraw();
        message.textContent = 'Informe quantos milímetros há entre os dois traços da régua.';
        return;
      }
      pixelsPerMm = pixels / referenceMm;
      marked.push({ points: currentPoints, color: '#9a6545', label: `${referenceMm} mm · referência` });
    } else if (phase.key === 'width') {
      measuredWidth = pixels / pixelsPerMm;
      marked.push({ points: currentPoints, color: '#8e5d42', label: 'largura' });
    } else {
      measuredLength = pixels / pixelsPerMm;
      marked.push({ points: currentPoints, color: '#70442e', label: 'comprimento' });
    }
    currentPoints = [];
    phaseIndex += 1;
    redraw();
    if (phaseIndex < phases.length) showPhase();
    else {
      instruction.textContent = 'Confira o resultado e aplique as dimensões ao projeto.';
      result.textContent = `Estimativa: ${measuredWidth.toFixed(1)} mm de largura × ${measuredLength.toFixed(1)} mm de comprimento.`;
      const valid = measuredWidth >= 1 && measuredWidth <= 40 && measuredLength >= 1 && measuredLength <= 60;
      apply.disabled = !valid;
      if (!valid) result.textContent += ' Confira a calibração: uma das medidas ficou fora do intervalo esperado.';
    }
  });

  overlay.querySelector('#measure-reset').addEventListener('click', () => {
    phaseIndex = 0; currentPoints = []; marked = []; pixelsPerMm = 0; measuredWidth = 0; measuredLength = 0;
    message.textContent = 'Marque os pontos sobre a foto.';
    redraw(); showPhase();
  });

  apply.addEventListener('click', () => {
    if (apply.disabled) return;
    const round = (value) => Math.round(value * 10) / 10;
    const dimensions = { widthMm: round(measuredWidth), lengthMm: round(measuredLength) };
    close();
    onApply?.(dimensions);
  });

  startCamera();
}
