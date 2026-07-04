"""
Floor 9 — Biotech Lab & Server Room (Theme: Web Exploitation)
PUC Intra CTF: Zombie Outbreak — Floor Escape

Routes:
  GET  /login                  -> Antidote (view source) + Stairs gateway (SQLi login form)
  POST /login                  -> vulnerable login (string-built SQL query, intentional)
  GET  /stairwell/unlock       -> Stairs flag (requires bypassed login)
  GET  /elevator/guest-token   -> issues a sample guest JWT (weak secret: 'elevator123')
  POST /elevator/override      -> Lift flag (requires forged admin JWT)
"""
import os
import sqlite3
import jwt
from flask import Flask, request, render_template, redirect, url_for, session, jsonify

app = Flask(__name__)
app.secret_key = os.urandom(24)

DB_PATH = os.path.join(os.path.dirname(__file__), "db.sqlite3")
JWT_SECRET = "elevator123"  # intentionally weak — crackable via jwt_tool/hashcat wordlist

STAIRS_FLAG = "PUCTF{sql1_st41rw3ll_4cc3ss_gr4nt3d}"
LIFT_FLAG = "PUCTF{jwt_4dm1n_3l3v4t0r_unl0ck3d}"


@app.route("/")
def index():
    return redirect(url_for("login"))


@app.route("/login", methods=["GET", "POST"])
def login():
    error = None
    if request.method == "POST":
        username = request.form.get("username", "")
        password = request.form.get("password", "")

        conn = sqlite3.connect(DB_PATH)
        cur = conn.cursor()
        # Intentionally vulnerable: raw string interpolation into SQL (challenge target)
        query = f"SELECT * FROM users WHERE username='{username}' AND password='{password}'"
        try:
            cur.execute(query)
            row = cur.fetchone()
        except sqlite3.Error:
            row = None
        conn.close()

        if row:
            session["authenticated"] = True
            return redirect(url_for("stairwell_unlock"))
        error = "Access denied. Invalid credentials."

    return render_template("login.html", error=error)


@app.route("/stairwell/unlock")
def stairwell_unlock():
    if not session.get("authenticated"):
        return redirect(url_for("login"))
    return render_template("unlock.html", flag=STAIRS_FLAG)


@app.route("/elevator/guest-token")
def elevator_guest_token():
    token = jwt.encode({"user": "guest", "role": "guest"}, JWT_SECRET, algorithm="HS256")
    return jsonify({"token": token})


@app.route("/elevator/override", methods=["POST"])
def elevator_override():
    auth = request.headers.get("Authorization", "")
    token = auth.replace("Bearer ", "").strip()
    if not token:
        return jsonify({"error": "Missing token"}), 401

    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except jwt.InvalidTokenError:
        return jsonify({"error": "Invalid token signature"}), 401

    if payload.get("role") == "admin":
        return jsonify({"status": "OVERRIDE ACCEPTED", "flag": LIFT_FLAG})
    return jsonify({"error": "Insufficient privileges"}), 403


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5009, debug=False)
