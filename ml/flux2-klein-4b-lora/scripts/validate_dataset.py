#!/usr/bin/env python3
"""Portable RunPod validator for the reviewed GurIA Nails dataset."""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
from pathlib import Path
import sys

from PIL import Image


TRIGGER = "naildecalstyle"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def read_caption(path: Path) -> str:
    return path.read_text(encoding="utf-8-sig", errors="strict").strip()


def validate(dataset_root: Path, expected_canonical: int, expected_reviewed: int) -> dict[str, object]:
    canonical_root = dataset_root / "train"
    reviewed_rgba_root = dataset_root / "reviewed" / "main_rgba"
    training_root = dataset_root / "reviewed" / "main_train_rgb"
    manifest_path = dataset_root / "review_manifest.csv"
    split_path = dataset_root / "splits" / "reviewed-main.txt"
    errors: list[str] = []
    warnings: list[str] = []

    for required in (canonical_root, reviewed_rgba_root, training_root):
        if not required.is_dir():
            errors.append(f"Missing directory: {required}")
    for required in (manifest_path, split_path):
        if not required.is_file():
            errors.append(f"Missing file: {required}")
    if errors:
        return {"status": "FAIL", "errors": errors, "warnings": warnings}

    canonical_images = sorted(canonical_root.glob("*.png"))
    reviewed_rgba_images = sorted(reviewed_rgba_root.glob("*.png"))
    training_images = sorted(training_root.glob("*.png"))
    training_captions = sorted(training_root.glob("*.txt"))
    with manifest_path.open("r", encoding="utf-8-sig", newline="") as handle:
        manifest = list(csv.DictReader(handle))
    approved_rows = [row for row in manifest if row.get("status") == "approved"]
    approved_by_name = {row["file_name"]: row for row in approved_rows}
    split_names = [line.strip() for line in read_caption(split_path).splitlines() if line.strip()]

    counts = (
        ("canonical PNGs", len(canonical_images), expected_canonical),
        ("manifest rows", len(manifest), expected_canonical),
        ("reviewed RGBA PNGs", len(reviewed_rgba_images), expected_reviewed),
        ("effective RGB PNGs", len(training_images), expected_reviewed),
        ("effective captions", len(training_captions), expected_reviewed),
        ("approved manifest rows", len(approved_rows), expected_reviewed),
        ("reviewed split names", len(split_names), expected_reviewed),
    )
    for label, actual, expected in counts:
        if actual != expected:
            errors.append(f"Expected {expected} {label}; found {actual}.")

    image_stems = {path.stem for path in training_images}
    caption_stems = {path.stem for path in training_captions}
    for stem in sorted(image_stems - caption_stems):
        errors.append(f"Missing caption for {stem}.png.")
    for stem in sorted(caption_stems - image_stems):
        errors.append(f"Orphan caption: {stem}.txt.")

    alpha_verified = 0
    rgb_verified = 0
    dimensions_preserved = 0
    hash_groups: dict[str, list[str]] = {}

    for canonical_path in canonical_images:
        try:
            with Image.open(canonical_path) as canonical:
                canonical.load()
                if canonical.format != "PNG":
                    errors.append(f"Extension/format mismatch: {canonical_path.name} is {canonical.format}.")
                if canonical.mode != "RGBA":
                    errors.append(f"Expected RGBA canonical image: {canonical_path.name}; got {canonical.mode}.")
                elif canonical.getchannel("A").getextrema()[0] < 255:
                    alpha_verified += 1
                else:
                    errors.append(f"No real transparent pixels in canonical image: {canonical_path.name}.")
        except Exception as exc:  # noqa: BLE001
            errors.append(f"Unreadable canonical image {canonical_path.name}: {exc}")
        canonical_hash = sha256(canonical_path)
        hash_groups.setdefault(canonical_hash, []).append(canonical_path.name)

    for training_path in training_images:
        caption_path = training_path.with_suffix(".txt")
        rgba_path = reviewed_rgba_root / training_path.name
        canonical_path = canonical_root / training_path.name
        row = approved_by_name.get(training_path.name)
        if row is None:
            errors.append(f"Missing approved manifest row: {training_path.name}.")
            continue
        for paired in (caption_path, rgba_path, canonical_path):
            if not paired.is_file():
                errors.append(f"Missing pair for {training_path.name}: {paired}")
            elif paired.stat().st_size == 0:
                errors.append(f"Empty file: {paired}")
        if not caption_path.is_file() or not rgba_path.is_file() or not canonical_path.is_file():
            continue

        try:
            caption = read_caption(caption_path)
        except UnicodeError as exc:
            errors.append(f"Caption is not valid UTF-8: {caption_path.name}: {exc}")
            continue
        if not caption:
            errors.append(f"Empty caption: {caption_path.name}.")
        if caption.lower().count(TRIGGER) != 1:
            errors.append(f"Trigger count is not one in {caption_path.name}.")
        if not caption.startswith(f"{TRIGGER}, "):
            errors.append(f"Trigger is not at the start of {caption_path.name}.")
        if caption != row.get("reviewed_caption", ""):
            errors.append(f"Caption differs from manifest: {caption_path.name}.")
        background = row.get("effective_background")
        if background == "white" and "solid white background" not in caption:
            errors.append(f"White background not described in {caption_path.name}.")
        if background == "light gray" and "solid light gray background" not in caption:
            errors.append(f"Light gray background not described in {caption_path.name}.")

        try:
            with Image.open(canonical_path) as canonical, Image.open(rgba_path) as rgba, Image.open(training_path) as rgb:
                canonical.load()
                rgba.load()
                rgb.load()
                if rgb.format != "PNG":
                    errors.append(f"Extension/format mismatch: {training_path.name} is {rgb.format}.")
                if rgb.mode != "RGB":
                    errors.append(f"Expected RGB effective image: {training_path.name}; got {rgb.mode}.")
                else:
                    rgb_verified += 1
                if canonical.size == rgba.size == rgb.size:
                    dimensions_preserved += 1
                else:
                    errors.append(f"Dimension mismatch for {training_path.name}.")
        except Exception as exc:  # noqa: BLE001
            errors.append(f"Unreadable reviewed image {training_path.name}: {exc}")

        canonical_hash = sha256(canonical_path)
        rgba_hash = sha256(rgba_path)
        rgb_hash = sha256(training_path)
        if canonical_hash != rgba_hash:
            errors.append(f"RGBA preservation copy differs: {training_path.name}.")
        if row.get("canonical_rgba_sha256") != canonical_hash:
            errors.append(f"Canonical hash differs from manifest: {training_path.name}.")
        if row.get("reviewed_rgba_sha256") != rgba_hash:
            errors.append(f"Reviewed RGBA hash differs from manifest: {training_path.name}.")
        if row.get("training_rgb_sha256") != rgb_hash:
            errors.append(f"Effective RGB hash differs from manifest: {training_path.name}.")

    duplicate_groups = [names for names in hash_groups.values() if len(names) > 1]
    warnings.extend(f"Exact duplicate canonical images: {', '.join(names)}" for names in duplicate_groups)
    if sorted(split_names) != sorted(path.name for path in training_images):
        errors.append("reviewed-main.txt does not exactly match effective training images.")

    return {
        "status": "PASS" if not errors else "FAIL",
        "dataset_root": str(dataset_root.resolve()),
        "expected_canonical_count": expected_canonical,
        "expected_reviewed_count": expected_reviewed,
        "canonical_image_count": len(canonical_images),
        "reviewed_rgba_image_count": len(reviewed_rgba_images),
        "effective_training_image_count": len(training_images),
        "effective_caption_count": len(training_captions),
        "real_alpha_verified_count": alpha_verified,
        "rgb_verified_count": rgb_verified,
        "dimensions_preserved_count": dimensions_preserved,
        "exact_duplicate_groups": duplicate_groups,
        "errors": errors,
        "warnings": warnings,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("dataset_root", nargs="?", type=Path, default=Path(__file__).resolve().parents[1] / "dataset")
    parser.add_argument("--expected-canonical-count", type=int, default=140)
    parser.add_argument("--expected-reviewed-count", type=int, default=50)
    parser.add_argument("--report", type=Path)
    args = parser.parse_args()

    report = validate(args.dataset_root, args.expected_canonical_count, args.expected_reviewed_count)
    rendered = json.dumps(report, ensure_ascii=False, indent=2)
    print(rendered)
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(rendered + "\n", encoding="utf-8")
    return 0 if report["status"] == "PASS" else 1


if __name__ == "__main__":
    sys.exit(main())
