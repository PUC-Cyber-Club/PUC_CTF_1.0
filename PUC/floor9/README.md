# Floor 9 — Biotech Lab & Server Room (Web Exploitation)
PUC Intra CTF: Zombie Outbreak — Floor Escape

A self-contained Flask app implementing all three Floor 9 challenges.

## Setup

```bash
pip install -r requirements.txt
python init_db.py     # seeds db.sqlite3 with the users table
python app.py          # runs on http://0.0.0.0:5009
```

For the live event, put this behind a reverse proxy (nginx) or run it in a
container per team/instance so one team's session/db state doesn't affect
another's.

## Challenge mapping

| Challenge | Route | Mechanism | Flag |
|---|---|---|---|
| Antidote — Residual Session | `GET /login` | Flag + hint sit in an HTML comment in the page source | `PUCTF{f9_r3s1du4l_s3ss10n_n0t3}` |
| Stairs — Default Credentials Override | `POST /login` | `username`/`password` are concatenated directly into the SQL query (`SELECT * FROM users WHERE username='$u' AND password='$p'`). Payload: `username=admin' OR '1'='1' -- `, any password. Redirects to `/stairwell/unlock`. | `PUCTF{sql1_st41rw3ll_4cc3ss_gr4nt3d}` |
| Lift — Elevator Control JWT | `GET /elevator/guest-token` issues a guest token. Secret is `elevator123` (crackable offline with `jwt_tool`/`hashcat` + small wordlist). Forge a token with `role: admin`, send to `POST /elevator/override` with `Authorization: Bearer <token>`. | `PUCTF{jwt_4dm1n_3l3v4t0r_unl0ck3d}` |

## Notes for organizers

- The real DB password (`Xq9!rZt7#vLp2026`) is unguessable on purpose — the
  challenge requires injection, not credential guessing.
- `JWT_SECRET` in `app.py` is intentionally weak. Swap it only if you also
  update the wordlist/hint you hand out, or the challenge becomes unsolvable.
- `app.run(debug=False)` — keep debug mode off during the actual event so the
  Werkzeug debugger/console isn't an unintended extra attack surface.
- Run via a production WSGI server (gunicorn/waitress) for the live event;
  the Flask dev server is fine for local testing only.

## Verified

All three flags were tested end-to-end (antidote source-view, SQLi bypass,
JWT forgery against the cracked secret) before delivery.
