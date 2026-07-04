"""
Seeds db.sqlite3 with the 'users' table for the Floor 9 SQLi challenge.
Run once before starting app.py: python init_db.py
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "db.sqlite3")

if os.path.exists(DB_PATH):
    os.remove(DB_PATH)

conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()
cur.execute(
    "CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT, password TEXT)"
)
# Real password is intentionally unguessable -> forces SQL injection, not brute force.
cur.execute(
    "INSERT INTO users (username, password) VALUES ('admin', 'Xq9!rZt7#vLp2026')"
)
conn.commit()
conn.close()
print(f"Seeded {DB_PATH}")
