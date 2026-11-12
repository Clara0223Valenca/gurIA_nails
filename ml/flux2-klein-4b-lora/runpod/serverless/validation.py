"""Validation shared by the Runpod handler and its unit tests."""

from __future__ import annotations

import re
from typing import Any

TRIGGER_WORD = "naildecalstyle"
ALLOWED_INPUT_KEYS = frozenset({"prompt", "seed", "width", "height"})
_TRIGGER_PATTERN = re.compile(r"(?<![a-z0-9_])naildecalstyle(?![a-z0-9_])", re.IGNORECASE)


class InputValidationError(ValueError):
    """A permanent client error that must not be retried."""


def _dimension(value: Any, name: str) -> int:
    if isinstance(value, bool) or not isinstance(value, int):
        raise InputValidationError(f"{name} deve ser um número inteiro.")
    if value < 512 or value > 1024 or value % 64 != 0:
        raise InputValidationError(f"{name} deve ficar entre 512 e 1024 e ser múltiplo de 64.")
    return value


def validate_job_input(payload: Any, *, lora_enabled: bool) -> dict[str, Any]:
    if not isinstance(payload, dict):
        raise InputValidationError("input deve ser um objeto JSON.")

    unknown = sorted(set(payload) - ALLOWED_INPUT_KEYS)
    if unknown:
        raise InputValidationError("Campos não permitidos: " + ", ".join(unknown) + ".")

    prompt = payload.get("prompt")
    if not isinstance(prompt, str) or not prompt.strip():
        raise InputValidationError("prompt é obrigatório.")
    prompt = " ".join(prompt.split())
    if len(prompt) > 1200:
        raise InputValidationError("prompt deve ter no máximo 1200 caracteres.")

    trigger_count = len(_TRIGGER_PATTERN.findall(prompt))
    if lora_enabled:
        if trigger_count > 1:
            raise InputValidationError(f"Use {TRIGGER_WORD} no máximo uma vez.")
        if trigger_count == 0:
            prompt = f"{TRIGGER_WORD}, {prompt}"
    elif trigger_count:
        raise InputValidationError(
            f"{TRIGGER_WORD} só pode ser usado quando o LoRA estiver habilitado."
        )

    seed = payload.get("seed", 42)
    if isinstance(seed, bool) or not isinstance(seed, int) or seed < 0 or seed > 4_294_967_295:
        raise InputValidationError("seed deve ser um inteiro entre 0 e 4294967295.")

    return {
        "prompt": prompt,
        "seed": seed,
        "width": _dimension(payload.get("width", 768), "width"),
        "height": _dimension(payload.get("height", 768), "height"),
    }
