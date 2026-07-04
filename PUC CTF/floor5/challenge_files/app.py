"""
Floor 5 — Main Lobby / Exit (Theme: MISC / SYSTEMS)
PUC Intra CTF: Zombie Outbreak — Floor Escape

Routes:
  GET /                                    -> lobby WiFi kiosk landing page
  GET /robots.txt                           -> Disallow: /maintenance_locker_5F/
  GET /maintenance_locker_5F/               -> antidote flag + steghide password hint
  GET /files/exit_door.jpg                  -> steghide-embedded Stairs challenge image
  GET /static/<file>                        -> CSS
"""
import os
from flask import Flask, send_from_directory

app = Flask(__name__)
BASE = os.path.dirname(__file__)
SITE = os.path.join(BASE, "site")
STATIC = os.path.join(BASE, "static")


@app.route("/")
def index():
    return send_from_directory(SITE, "index.html")


@app.route("/robots.txt")
def robots():
    return send_from_directory(SITE, "robots.txt")


@app.route("/maintenance_locker_5F/")
@app.route("/maintenance_locker_5F")
def locker():
    return send_from_directory(
        os.path.join(SITE, "maintenance_locker_5F"), "index.html"
    )


@app.route("/files/<path:filename>")
def files(filename):
    return send_from_directory(os.path.join(SITE, "files"), filename)


@app.route("/static/<path:filename>")
def static_files(filename):
    return send_from_directory(STATIC, filename)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5005, debug=False)
