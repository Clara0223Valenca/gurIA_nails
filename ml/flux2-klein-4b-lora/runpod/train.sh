#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="${PROJECT_ROOT:-/workspace/guria-nails-flux2-klein}"
AI_TOOLKIT_ROOT="${AI_TOOLKIT_ROOT:-/app/ai-toolkit}"
PROFILE="${1:-quality}"

if [[ ! -f "${AI_TOOLKIT_ROOT}/run.py" && -f "/workspace/ai-toolkit/run.py" ]]; then
  AI_TOOLKIT_ROOT="/workspace/ai-toolkit"
fi

if [[ ! -f "${AI_TOOLKIT_ROOT}/run.py" ]]; then
  echo "AI Toolkit nao encontrado em /app/ai-toolkit nem /workspace/ai-toolkit." >&2
  echo "Use o template oficial do AI Toolkit no RunPod ou execute runpod/install_ai_toolkit.sh." >&2
  exit 2
fi

if [[ -f "${AI_TOOLKIT_ROOT}/venv/bin/activate" ]]; then
  # shellcheck disable=SC1091
  source "${AI_TOOLKIT_ROOT}/venv/bin/activate"
fi

case "${PROFILE}" in
  smoke)
    CONFIG="${PROJECT_ROOT}/configs/smoke_flux2_klein_4b_24gb.yaml"
    ;;
  quality)
    CONFIG="${PROJECT_ROOT}/configs/train_flux2_klein_4b_24gb.yaml"
    ;;
  safe)
    CONFIG="${PROJECT_ROOT}/configs/train_flux2_klein_4b_24gb_safe.yaml"
    ;;
  *)
    echo "Perfil invalido: ${PROFILE}. Use smoke, quality ou safe." >&2
    exit 2
    ;;
esac

mkdir -p "${PROJECT_ROOT}/output" "${PROJECT_ROOT}/environment" "${PROJECT_ROOT}/logs"
export HF_HOME="${HF_HOME:-${PROJECT_ROOT}/cache/huggingface}"
mkdir -p "${HF_HOME}"

python "${PROJECT_ROOT}/scripts/validate_dataset.py" \
  "${PROJECT_ROOT}/dataset" \
  --expected-canonical-count 140 \
  --expected-reviewed-count 50 \
  --report "${PROJECT_ROOT}/reports/validation-report-runpod.json"

nvidia-smi | tee "${PROJECT_ROOT}/environment/nvidia-smi.txt"
python --version 2>&1 | tee "${PROJECT_ROOT}/environment/python.txt"
(
  cd "${AI_TOOLKIT_ROOT}"
  git rev-parse HEAD
) | tee "${PROJECT_ROOT}/environment/ai-toolkit.commit"
python -m pip freeze > "${PROJECT_ROOT}/environment/requirements-lock.txt"

echo "Treinando com perfil '${PROFILE}' e config '${CONFIG}'."
cd "${AI_TOOLKIT_ROOT}"
STARTED_AT="$(date +%s)"
set +e
python -u run.py "${CONFIG}" 2>&1 | tee "${PROJECT_ROOT}/logs/train-${PROFILE}.log"
TRAIN_EXIT_CODE="${PIPESTATUS[0]}"
set -e
FINISHED_AT="$(date +%s)"
ELAPSED_SECONDS="$((FINISHED_AT - STARTED_AT))"
{
  echo "profile=${PROFILE}"
  echo "elapsed_seconds=${ELAPSED_SECONDS}"
  echo "exit_code=${TRAIN_EXIT_CODE}"
} > "${PROJECT_ROOT}/environment/last-${PROFILE}-run.env"
echo "Perfil '${PROFILE}' terminou com código ${TRAIN_EXIT_CODE} em ${ELAPSED_SECONDS} segundos."
exit "${TRAIN_EXIT_CODE}"
