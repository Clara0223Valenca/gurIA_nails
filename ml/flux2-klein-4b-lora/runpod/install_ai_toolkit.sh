#!/usr/bin/env bash
set -euo pipefail

AI_TOOLKIT_ROOT="${AI_TOOLKIT_ROOT:-/workspace/ai-toolkit}"
AI_TOOLKIT_COMMIT="${AI_TOOLKIT_COMMIT:-0473387}"

if [[ -e "${AI_TOOLKIT_ROOT}" && ! -d "${AI_TOOLKIT_ROOT}/.git" ]]; then
  echo "O destino existe mas nao e um clone Git: ${AI_TOOLKIT_ROOT}" >&2
  exit 2
fi

if [[ ! -d "${AI_TOOLKIT_ROOT}/.git" ]]; then
  git clone --recursive https://github.com/ostris/ai-toolkit.git "${AI_TOOLKIT_ROOT}"
fi

cd "${AI_TOOLKIT_ROOT}"
git fetch origin "${AI_TOOLKIT_COMMIT}"
git checkout "${AI_TOOLKIT_COMMIT}"
git submodule update --init --recursive

python -m venv venv
source venv/bin/activate
python -m pip install --upgrade pip
python -m pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu130
python -m pip install -r requirements.txt

echo "AI Toolkit instalado em ${AI_TOOLKIT_ROOT} no commit $(git rev-parse HEAD)."
echo "Antes de treinar: source ${AI_TOOLKIT_ROOT}/venv/bin/activate"
