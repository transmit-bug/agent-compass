#!/usr/bin/env python3
"""Screen-Diff Gate — free local check for whether two screenshots are "unchanged",
avoiding AI calls on repeated frames.

Usage:
  python3 screen-diff.py <img_a> <img_b> [--threshold 1.0]
  python3 screen-diff.py <img_a> --hash        print the 64-bit dHash of img_a as hex

Output:
  SAME 0.00%  dHash_hamming=0/64     (exit 0 → screen unchanged, skip AI, reuse last analysis)
  CHANGED 13.13%  dHash_hamming=21/64 (exit 1 → screen changed, only now call the model)

Decision: pixel-diff % < threshold, or dHash Hamming distance <= 8, counts as SAME.
Zero-dependency: pure PIL, downscaled to 160x90 grayscale comparison, millisecond-level.
"""
import sys
import argparse
from PIL import Image


def load(p, size=(160, 90)):
    return list(Image.open(p).convert("L").resize(size).getdata())


def diff_pct(a, b):
    n = len(a)
    return sum(abs(x - y) for x, y in zip(a, b)) / n / 255 * 100


def dhash(p, size=(9, 8)):
    px = list(Image.open(p).convert("L").resize(size).getdata())
    return sum((px[i] > px[i + 1]) << i for i in range(64))


def hamming(a, b):
    return bin(a ^ b).count("1")


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("img_a")
    ap.add_argument("img_b", nargs="?")
    ap.add_argument("--hash", action="store_true",
                    help="print the 64-bit dHash of img_a as 16-char hex and exit "
                         "(stable cache key for a perceptually identical screen)")
    ap.add_argument("--threshold", type=float, default=1.0,
                    help="pixel-diff %% threshold; below is considered SAME (default 1.0)")
    ap.add_argument("--strict", action="store_true",
                    help="strict mode: record every frame except fully identical (back-to-back "
                         "screenshots measure 0.00%% identical; >0.05%% is a real state change)")
    args = ap.parse_args()

    if args.hash:
        print(f"{dhash(args.img_a):016x}")
        sys.exit(0)
    if not args.img_b:
        ap.error("img_b is required unless --hash is given")

    a, b = load(args.img_a), load(args.img_b)
    d = diff_pct(a, b)
    hd = hamming(dhash(args.img_a), dhash(args.img_b))
    if args.strict:
        # back-to-back screenshots = 0.00% identical; small changes like button state ~0.1%
        # must be recorded
        n = len(a)
        changed = sum(1 for x, y in zip(a, b) if abs(x - y) > 25)
        same = (changed / n * 100) < 0.05
    else:
        same = d < args.threshold or hd <= 8

    print(f"{'SAME' if same else 'CHANGED'}  diff={d:.2f}%  dHash_hamming={hd}/64")
    sys.exit(0 if same else 1)


if __name__ == "__main__":
    main()
