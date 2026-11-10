#!/usr/bin/env python3
"""Generate a deterministic demo image with the trained LoRA on distilled Klein 4B."""

from __future__ import annotations

import argparse
import os
from pathlib import Path

import torch
from diffusers import Flux2KleinPipeline

from white_to_alpha import white_to_alpha


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--lora", type=Path, required=True, help="Path to a .safetensors LoRA checkpoint")
    parser.add_argument(
        "--prompt",
        default="naildecalstyle, flat 2D illustration of a delicate blue butterfly with floral details, isolated on a solid white background.",
    )
    parser.add_argument("--output", type=Path, default=Path("/workspace/guria-nails-flux2-klein/demo.png"))
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--size", type=int, default=1024)
    parser.add_argument("--no-cpu-offload", action="store_true")
    parser.add_argument(
        "--background-removal",
        choices=("rembg", "white-key", "none"),
        default="rembg",
        help="rembg preserves white details; white-key is a fast offline fallback",
    )
    parser.add_argument("--keep-white", action="store_true", help="Deprecated alias for --background-removal none")
    args = parser.parse_args()

    if not args.lora.is_file():
        raise FileNotFoundError(args.lora)

    pipe = Flux2KleinPipeline.from_pretrained(
        "black-forest-labs/FLUX.2-klein-4B",
        torch_dtype=torch.bfloat16,
    )
    pipe.load_lora_weights(str(args.lora.parent), weight_name=args.lora.name)
    if args.no_cpu_offload:
        pipe.to("cuda")
    else:
        pipe.enable_model_cpu_offload()

    generator = torch.Generator(device="cpu").manual_seed(args.seed)
    image = pipe(
        prompt=args.prompt,
        num_inference_steps=4,
        guidance_scale=1.0,
        height=args.size,
        width=args.size,
        generator=generator,
    ).images[0]

    background_removal = "none" if args.keep_white else args.background_removal
    if background_removal == "rembg":
        project_root = Path(__file__).resolve().parents[1]
        os.environ.setdefault("U2NET_HOME", str(project_root / "cache" / "rembg"))
        try:
            from rembg import remove
        except ImportError as exc:
            raise RuntimeError(
                "rembg is not installed. Run 'python -m pip install -r runpod/requirements-inference.txt' "
                "or pass --background-removal white-key."
            ) from exc
        image = remove(image, post_process_mask=True)
    elif background_removal == "white-key":
        image = white_to_alpha(image)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    image.save(args.output)
    print(args.output)


if __name__ == "__main__":
    main()
