"""
Floor 6 — Security & Surveillance Office (Theme: OSINT)
PUC Intra CTF: Zombie Outbreak — Floor Escape

Recon chain (no direct links handed to players):
  GET /                                            -> generic IT status page,
                                                       names "SafeCampus" but no URL
  GET /robots.txt                                   -> Disallow: /osint/  (hint only)
  GET /osint/safecampus/index.html                  -> directory of 5 student
                                                       profiles, no status shown
  GET /osint/safecampus/profile_<id>.html            -> 4 decoys + Patient Zero
  GET /osint/safecampus/last_seen.jpg                -> GPS EXIF (Stairs clue)
  GET /osint/safecampus/campus_locations.html        -> coordinate -> zone table
  GET /osint/safecampus/old_library_basement.html    -> Stairs flag
  GET /static/<file>                                 -> CSS
"""
import os
from flask import Flask, send_from_directory

app = Flask(__name__)
BASE = os.path.dirname(__file__)
SITE_DIR = os.path.join(BASE, "site")
STATIC_DIR = os.path.join(BASE, "static")


@app.route("/")
def index():
    return send_from_directory(SITE_DIR, "index.html")


@app.route("/robots.txt")
def robots():
    return send_from_directory(SITE_DIR, "robots.txt")


@app.route("/osint/safecampus/<path:filename>")
def safecampus(filename):
    return send_from_directory(os.path.join(SITE_DIR, "osint", "safecampus"), filename)


@app.route("/static/<path:filename>")
def static_files(filename):
    return send_from_directory(STATIC_DIR, filename)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5006, debug=False)
