"""
Builds challenge_files/stairs/exit_door.png with the Stairs flag embedded
via steghide (password: "antidote", found in the Antidote locker notes).

Run: python3 generate_exit_door.py
"""
import os
import random
import subprocess
from PIL import Image, ImageDraw

random.seed(5)

OUT_DIR = os.path.join(
    os.path.dirname(__file__), "..", "challenge_files", "stairs"
)
os.makedirs(OUT_DIR, exist_ok=True)

STAIRS_FLAG = "PUCTF{st3g0_3x1t_d00r_unl0ck3d_FR33D0M}\n"
PASSWORD = "antidote"

# --- Synthetic emergency-door illustration (procedural, no real photo) ---
W, H = 640, 480
img = Image.new("RGB", (W, H), (30, 30, 30))
draw = ImageDraw.Draw(img)

# Floor
draw.rectangle([0, H * 0.75, W, H], fill=(50, 45, 40))

# Door frame
fx, fy, fw, fh = W * 0.3, H * 0.12, W * 0.4, H * 0.63
draw.rectangle([fx, fy, fx + fw, fy + fh], fill=(20, 20, 20), outline=(180, 60, 40), width=6)

# Door panel
draw.rectangle([fx + 8, fy + 8, fx + fw - 8, fy + fh - 8], fill=(55, 55, 50))

# Emergency push-bar
bar_y = fy + fh * 0.55
draw.rectangle([fx + 20, bar_y, fx + fw - 20, bar_y + 14], fill=(180, 60, 40))

# Warning stripe bottom
for i in range(6):
    x = fx + i * (fw / 6)
    col = (180, 140, 0) if i % 2 == 0 else (30, 30, 30)
    draw.rectangle([x, fy + fh - 20, x + fw / 6, fy + fh], fill=col)

# EXIT sign above door
draw.rectangle([fx + fw * 0.2, fy - 38, fx + fw * 0.8, fy - 6], fill=(180, 30, 30))
draw.text((fx + fw * 0.27, fy - 35), "EXIT", fill=(255, 255, 255))

# Neon glow lines (atmosphere)
for offset in range(1, 5):
    draw.rectangle(
        [fx - offset * 3, fy - offset * 3, fx + fw + offset * 3, fy + fh + offset * 3],
        outline=(180, 40, 40, max(0, 80 - offset * 20)),
        width=1,
    )

img_path = os.path.join(OUT_DIR, "exit_door.jpg")
img.save(img_path, "JPEG", quality=95)

# --- Embed flag with steghide ---
flag_path = os.path.join(OUT_DIR, "exit_code.txt")
with open(flag_path, "w") as f:
    f.write(STAIRS_FLAG)

result = subprocess.run(
    ["steghide", "embed", "-cf", img_path, "-ef", flag_path, "-p", PASSWORD, "-f"],
    capture_output=True, text=True
)
print(result.stdout or result.stderr)
os.remove(flag_path)

print("Wrote:", img_path)

# --- Verify extraction round-trip ---
result = subprocess.run(
    ["steghide", "extract", "-sf", img_path, "-p", PASSWORD, "-f"],
    capture_output=True, text=True, cwd=OUT_DIR
)
extracted = open(os.path.join(OUT_DIR, "exit_code.txt")).read()
assert extracted.strip() == STAIRS_FLAG.strip(), f"Mismatch: {extracted}"
os.remove(os.path.join(OUT_DIR, "exit_code.txt"))
print("Steghide round-trip verified:", extracted.strip())
