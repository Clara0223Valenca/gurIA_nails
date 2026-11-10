#!/usr/bin/env python3
"""Turn a clean white generation background into a soft, unmatted alpha channel."""

from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
from PIL import Image


def white_to_alpha(image: Image.Image, transparent_at: float = 6.0, opaque_at: float = 42.0) -> Image.Image:
    rgb = np.asarray(image.convert("RGB"), dtype=np.float32)
    distance = np.linalg.norm(255.0 - rgb, axis=2)
    alpha = np.clip((distance - transparent_at) / (opaque_at - transparent_at), 0.0, 1.0)

    # Reverse the white matte on partially transparent antialiased edge pixels.
    safe_alpha = np.maximum(alpha[..., None], 1.0 / 255.0)
    foreground = (rgb - 255.0 * (1.0 - safe_alpha)) / safe_alpha
    foreground = np.clip(foreground, 0.0, 255.0)
    foreground[alpha <= 0.0] = 0.0

    rgba = np.dstack((foreground.astype(np.uint8), np.round(alpha * 255.0).astype(np.uint8)))
    return Image.fromarray(rgba, mode="RGBA")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--transparent-at", type=float, default=6.0)
    parser.add_argument("--opaque-at", type=float, default=42.0)
    args = parser.parse_args()

    if args.opaque_at <= args.transparent_at:
        raise ValueError("--opaque-at must be greater than --transparent-at")
    with Image.open(args.input) as image:
        result = white_to_alpha(image, args.transparent_at, args.opaque_at)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    result.save(args.output)
    print(args.output)


if __name__ == "__main__":
    main()
