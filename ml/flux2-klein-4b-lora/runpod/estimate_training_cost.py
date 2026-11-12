#!/usr/bin/env python3
"""Extrapolate the full run from an actual smoke-test duration."""

from __future__ import annotations

import argparse


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--hourly-rate", type=float, required=True)
    parser.add_argument("--smoke-seconds", type=float, required=True)
    parser.add_argument("--smoke-steps", type=int, default=100)
    parser.add_argument("--training-steps", type=int, default=1600)
    parser.add_argument("--safety-margin", type=float, default=1.25)
    parser.add_argument("--budget", type=float, default=5.0)
    args = parser.parse_args()

    if args.hourly_rate <= 0 or args.smoke_seconds <= 0:
        parser.error("hourly-rate e smoke-seconds devem ser maiores que zero")
    if args.smoke_steps <= 0 or args.training_steps <= 0:
        parser.error("a quantidade de steps deve ser maior que zero")
    if args.safety_margin < 1:
        parser.error("safety-margin deve ser pelo menos 1")

    raw_hours = args.smoke_seconds / args.smoke_steps * args.training_steps / 3600
    planned_hours = raw_hours * args.safety_margin
    estimated_cost = planned_hours * args.hourly_rate
    max_hours = args.budget / args.hourly_rate

    print(f"Duração bruta extrapolada: {raw_hours:.2f} h")
    print(f"Duração planejada com margem: {planned_hours:.2f} h")
    print(f"Custo de compute estimado: US$ {estimated_cost:.2f}")
    print(f"Máximo teórico no orçamento: {max_hours:.2f} h")
    print("Estimativa, não garantia; downloads, amostras, checkpoints e armazenamento podem alterar o total.")
    if estimated_cost > args.budget:
        raise SystemExit("NÃO INICIE: a estimativa ultrapassa o orçamento informado.")


if __name__ == "__main__":
    main()
