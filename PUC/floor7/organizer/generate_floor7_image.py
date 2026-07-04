"""
Builds challenge_files/antidote_stairs/sample_042.jpg for Floor 7.

Pipeline:
  1. Render a synthetic, non-photographic "microscope slide" pattern (no real
     photos/copyrighted images involved -- purely generated shapes).
  2. Write the JPEG.
  3. Insert a JPEG COM marker segment (what `exiftool -Comment` reads/writes)
     containing the Antidote flag + a pointer to the hidden archive.
  4. Append a ZIP (containing the Stairs flag) directly after the JPEG's EOI
     marker -- a classic JPEG/ZIP polyglot. JPEG decoders stop at EOI and
     ignore the trailing bytes; `unzip`/`binwalk` scan for the ZIP's End-Of-
     Central-Directory record near the end of the file and find it fine.

Run: python3 generate_floor7_image.py
"""
import os
import random
import zipfile
import io
from PIL import Image, ImageDraw

random.seed(42)

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "challenge_files", "antidote_stairs")
os.makedirs(OUT_DIR, exist_ok=True)

ANTIDOTE_COMMENT = (
    "PUCTF{3x1f_p4th0l0gy_d4t4_f0und} - check for hidden archive in this file"
)
STAIRS_FLAG = "PUCTF{b1nw4lk_z1p_3xtr4ct3d_st41rw3ll}"

# --- 1. Synthetic microscope-slide pattern (generated, not a real photo) ---
W, H = 640, 480
img = Image.new("RGB", (W, H), (235, 225, 235))
draw = ImageDraw.Draw(img)

for _ in range(120):
    x, y = random.randint(0, W), random.randint(0, H)
    r = random.randint(6, 22)
    shade = random.randint(120, 200)
    color = (shade, int(shade * 0.6), int(shade * 0.75))
    draw.ellipse([x - r, y - r, x + r, y + r], fill=color, outline=(80, 50, 60))

for _ in range(40):
    x, y = random.randint(0, W), random.randint(0, H)
    r = random.randint(2, 5)
    draw.ellipse([x - r, y - r, x + r, y + r], fill=(60, 30, 40))

draw.text((10, H - 20), "SAMPLE 042 - PATHOLOGY", fill=(40, 20, 30))

base_path = os.path.join(OUT_DIR, "_base.jpg")
img.save(base_path, "JPEG", quality=85)

# --- 2. Insert COM marker (0xFFFE) right after SOI (0xFFD8) ---
with open(base_path, "rb") as f:
    jpeg_bytes = f.read()

assert jpeg_bytes[0:2] == b"\xff\xd8", "Not a valid JPEG (missing SOI)"

comment_bytes = ANTIDOTE_COMMENT.encode("utf-8")
seg_len = len(comment_bytes) + 2  # length field includes itself
com_segment = b"\xff\xfe" + seg_len.to_bytes(2, "big") + comment_bytes

jpeg_with_comment = jpeg_bytes[0:2] + com_segment + jpeg_bytes[2:]

# --- 3. Build the hidden ZIP (Stairs flag) ---
zip_buffer = io.BytesIO()
with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
    zf.writestr("stairwell_access.txt", STAIRS_FLAG + "\n")
zip_bytes = zip_buffer.getvalue()

# --- 4. Concatenate JPEG+comment then ZIP (polyglot) ---
final_path = os.path.join(OUT_DIR, "sample_042.jpg")
with open(final_path, "wb") as f:
    f.write(jpeg_with_comment)
    f.write(zip_bytes)

os.remove(base_path)
print("Wrote:", final_path, f"({os.path.getsize(final_path)} bytes)")
