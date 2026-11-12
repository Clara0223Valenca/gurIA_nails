"""Queue-based Runpod Serverless worker for GurIA Nails."""

from __future__ import annotations

import base64
import io
import os
import threading
import time
from pathlib import Path
from typing import Any

import runpod

from validation import InputValidationError, validate_job_input

ALLOWED_MODELS = {
    "black-forest-labs/FLUX.2-klein-4B": {"steps": 4, "guidance": 1.0},
    "black-forest-labs/FLUX.2-klein-base-4B": {"steps": 50, "guidance": 4.0},
}
MAX_ENCODED_IMAGE_BYTES = 8_000_000

_pipeline: Any | None = None
_pipeline_load_ms: int | None = None
_load_lock = threading.Lock()


def _env_bool(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    normalized = value.strip().lower()
    if normalized in {"1", "true", "yes", "on"}:
        return True
    if normalized in {"0", "false", "no", "off"}:
        return False
    raise RuntimeError(f"{name} deve ser true ou false.")


def _configuration() -> dict[str, Any]:
    model_id = os.getenv("GURIA_MODEL_ID", "black-forest-labs/FLUX.2-klein-4B").strip()
    if model_id not in ALLOWED_MODELS:
        raise RuntimeError(f"GURIA_MODEL_ID não permitido: {model_id}")

    lora_enabled = _env_bool("GURIA_LORA_ENABLED", False)
    lora_path: Path | None = None
    lora_scale = float(os.getenv("GURIA_LORA_SCALE", "1.0"))
    if not 0.0 <= lora_scale <= 2.0:
        raise RuntimeError("GURIA_LORA_SCALE deve ficar entre 0 e 2.")

    if lora_enabled:
        raw_path = os.getenv("GURIA_LORA_PATH", "").strip()
        if not raw_path:
            raise RuntimeError("GURIA_LORA_PATH é obrigatório quando o LoRA está habilitado.")
        trusted_root = Path(
            os.getenv("GURIA_LORA_ROOT", "/runpod-volume/guria-nails")
        ).resolve()
        lora_path = Path(raw_path).resolve(strict=True)
        if lora_path.suffix.lower() != ".safetensors":
            raise RuntimeError("GURIA_LORA_PATH deve apontar para um arquivo .safetensors.")
        if lora_path != trusted_root and trusted_root not in lora_path.parents:
            raise RuntimeError("O LoRA deve estar dentro de GURIA_LORA_ROOT.")

    return {
        "model_id": model_id,
        "lora_enabled": lora_enabled,
        "lora_path": lora_path,
        "lora_scale": lora_scale,
        "cpu_offload": _env_bool("GURIA_CPU_OFFLOAD", True),
    }


def _get_pipeline(config: dict[str, Any]) -> tuple[Any, bool]:
    global _pipeline, _pipeline_load_ms
    if _pipeline is not None:
        return _pipeline, False

    with _load_lock:
        if _pipeline is not None:
            return _pipeline, False

        import torch
        from diffusers import Flux2KleinPipeline

        started = time.perf_counter()
        cache_dir = os.getenv("HF_HOME", "/runpod-volume/huggingface")
        Path(cache_dir).mkdir(parents=True, exist_ok=True)
        pipeline = Flux2KleinPipeline.from_pretrained(
            config["model_id"],
            torch_dtype=torch.bfloat16,
            cache_dir=cache_dir,
        )
        if config["lora_enabled"]:
            lora_path: Path = config["lora_path"]
            pipeline.load_lora_weights(
                str(lora_path.parent),
                weight_name=lora_path.name,
                adapter_name="guria_nails",
            )
            pipeline.set_adapters(
                ["guria_nails"], adapter_weights=[config["lora_scale"]]
            )
        if config["cpu_offload"]:
            pipeline.enable_model_cpu_offload()
        else:
            pipeline.to("cuda")

        _pipeline = pipeline
        _pipeline_load_ms = round((time.perf_counter() - started) * 1000)
        print(
            f"Pipeline carregado em {_pipeline_load_ms} ms; "
            f"model={config['model_id']}; lora={config['lora_enabled']}.",
            flush=True,
        )
        return _pipeline, True


def handler(event: dict[str, Any]) -> dict[str, Any]:
    config = _configuration()
    try:
        request = validate_job_input(
            event.get("input"), lora_enabled=config["lora_enabled"]
        )
    except InputValidationError as exc:
        return {
            "ok": False,
            "error": {
                "code": "INVALID_INPUT",
                "message": str(exc),
                "retryable": False,
            },
        }

    pipeline, cold_start = _get_pipeline(config)
    model_defaults = ALLOWED_MODELS[config["model_id"]]

    import torch

    started = time.perf_counter()
    generator = torch.Generator(device="cpu").manual_seed(request["seed"])
    with torch.inference_mode():
        image = pipeline(
            prompt=request["prompt"],
            width=request["width"],
            height=request["height"],
            num_inference_steps=model_defaults["steps"],
            guidance_scale=model_defaults["guidance"],
            generator=generator,
        ).images[0].convert("RGB")
    generation_ms = round((time.perf_counter() - started) * 1000)

    buffer = io.BytesIO()
    image.save(buffer, format="WEBP", quality=92, method=6)
    image_bytes = buffer.getvalue()
    if len(image_bytes) > MAX_ENCODED_IMAGE_BYTES:
        raise RuntimeError("A imagem excedeu o limite seguro de resposta do worker.")

    return {
        "ok": True,
        "imageBase64": base64.b64encode(image_bytes).decode("ascii"),
        "mimeType": "image/webp",
        "width": request["width"],
        "height": request["height"],
        "seed": request["seed"],
        "hasAlpha": False,
        "model": config["model_id"],
        "loraEnabled": config["lora_enabled"],
        "timing": {
            "coldStart": cold_start,
            "pipelineLoadMs": _pipeline_load_ms,
            "generationMs": generation_ms,
        },
    }


runpod.serverless.start({"handler": handler})
