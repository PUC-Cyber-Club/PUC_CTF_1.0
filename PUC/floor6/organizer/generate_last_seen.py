"""
Builds challenge_files/site/osint/safecampus/last_seen.jpg -- a synthetic,
non-photographic CCTV-style frame with real GPS EXIF tags pointing to
fictional coordinates for "Old Library Basement".

Run: python3 generate_last_seen.py
"""
import os
import random
import piexif
from PIL import Image, ImageDraw, ImageFilter

random.seed(6)

OUT_DIR = os.path.join(
    os.path.dirname(__file__), "..", "challenge_files", "site", "osint", "safecampus"
)
os.makedirs(OUT_DIR, exist_ok=True)

LAT = 22.3569  # fictional coordinates for "Old Library Basement"
LON = 91.7832

# --- Synthetic grainy CCTV-style frame (procedurally generated, no real photo) ---
W, H = 640, 360
img = Image.new("RGB", (W, H), (16, 18, 16))
draw = ImageDraw.Draw(img)

draw.polygon([(0, H), (W * 0.38, H * 0.35), (W * 0.62, H * 0.35), (W, H)], fill=(32, 34, 30))
draw.polygon(
    [(W * 0.38, H * 0.35), (W * 0.62, H * 0.35), (W * 0.58, H * 0.1), (W * 0.42, H * 0.1)],
    fill=(44, 46, 40),
)
for _ in range(4000):
    x, y = random.randint(0, W - 1), random.randint(0, H - 1)
    g = random.randint(0, 40)
    img.putpixel((x, y), (g, g + 2, g))

img = img.filter(ImageFilter.GaussianBlur(0.6))
draw = ImageDraw.Draw(img)
draw.text((10, 10), "CAM-09F  REC", fill=(200, 60, 60))
draw.text((10, H - 24), "03:41:08", fill=(180, 180, 180))

jpg_path = os.path.join(OUT_DIR, "last_seen.jpg")
img.save(jpg_path, "JPEG", quality=80)


def deg_to_dms_rational(deg_float):
    deg_float = abs(deg_float)
    degrees = int(deg_float)
    minutes_float = (deg_float - degrees) * 60
    minutes = int(minutes_float)
    seconds_num = int(round((minutes_float - minutes) * 60 * 100))
    return [(degrees, 1), (minutes, 1), (seconds_num, 100)]


gps_ifd = {
    piexif.GPSIFD.GPSLatitudeRef: "N",
    piexif.GPSIFD.GPSLatitude: deg_to_dms_rational(LAT),
    piexif.GPSIFD.GPSLongitudeRef: "E",
    piexif.GPSIFD.GPSLongitude: deg_to_dms_rational(LON),
}
zeroth_ifd = {piexif.ImageIFD.Make: "PUC-Security", piexif.ImageIFD.Model: "CAM-9F-002"}
exif_dict = {"GPS": gps_ifd, "0th": zeroth_ifd}
exif_bytes = piexif.dump(exif_dict)
piexif.insert(exif_bytes, jpg_path)

print("Wrote:", jpg_path)
print(f"Embedded coords: {LAT} N, {LON} E")
