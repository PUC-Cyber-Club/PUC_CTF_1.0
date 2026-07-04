# Floor 6 — Security & Surveillance Office (OSINT)
PUC Intra CTF: Zombie Outbreak — Floor Escape

Floor 6 sits right before the final escape floor, so Antidote/Stairs are a
real multi-step recon chain instead of a single obvious link. Lift is
unchanged (binary reversing).

## Setup

```bash
cd challenge_files
pip install flask
python3 app.py     # serves everything on :5006
```

## The recon chain (Antidote + Stairs, 350 pts combined)

No page hands out the SafeCampus URL directly. Players have to work the
chain:

1. **`GET /`** — a generic IT status page. It names "SafeCampus Check-In
   System" as a live service but gives no link or path.
2. **`GET /robots.txt`** — `Disallow: /osint/` (and a decoy `/admin/`). This
   only confirms an `/osint/` area exists, not the full path.
3. **`GET /osint/safecampus/index.html`** — a directory of 5 recent
   check-ins, listed by name/ID only, in chronological order with **no
   status shown**. Players must open each one.
4. **Checking the 5 profiles** (`profile_2031`, `2042`, `2055`, `2068`,
   `2077`) — four are mundane "checked in" notes. One decoy (`2077`) is
   deliberately in the *same department* as the real one, to stop players
   from just filtering by department. `profile_2068.html` (Rafiul Islam) is
   the one flagged **MISSING**, with the suspicious "dizzy after lab work"
   bio and the **Antidote flag**: `PUCTF{p4t13nt_z3r0_l0c4t10n_f0und}`.
5. **`last_seen.jpg`**, linked only from that profile — extract GPS EXIF:
   ```bash
   exiftool -GPSLatitude -GPSLongitude last_seen.jpg
   # 22 deg 21' 24.84" N, 91 deg 46' 59.52" E -> 22.3569, 91.7832
   ```
6. **`campus_locations.html`** — a coordinate-range table for campus zones,
   deliberately not hyperlinked to the actual pages. `22.3569, 91.7832`
   falls inside "Old Library — Basement Level."
7. Players infer/guess the page name from that zone label (consistent with
   the site's lowercase-underscore naming pattern already seen elsewhere) and
   navigate to **`old_library_basement.html`** — **Stairs flag**:
   `PUCTF{g30l0c4t10n_0ld_l1br4ry_st41rs}`.

This was deliberately reworked to add real legwork (recon hint → sift
decoys → correlate coordinates) rather than a single click, since this is
the floor right before the final exit.

## Lift — Synthesizer Binary (400 pts, unchanged)

```bash
cd lift
./synth_v2
# Enter mixing ratios (4 integers): 23 7 91 4
# -> SUCCESS! PUCTF{r3v3rs3d_synth3s1z3r_3l3v4t0r_unl0ck}
```
`strings synth_v2` does not reveal the flag (XOR-encoded with `0x42`);
`objdump -d` reveals the comparison values.

## Flags

| Challenge | Flag |
|---|---|
| Antidote | `PUCTF{p4t13nt_z3r0_l0c4t10n_f0und}` |
| Stairs | `PUCTF{g30l0c4t10n_0ld_l1br4ry_st41rs}` |
| Lift | `PUCTF{r3v3rs3d_synth3s1z3r_3l3v4t0r_unl0ck}` |

## Organizer notes

- `organizer/generate_last_seen.py` regenerates the GPS-tagged image
  (seeded RNG, deterministic). `organizer/synth_v2.c` is the Lift source.
- The 5 profile pages and the locations table are static HTML, hand-written
  (no randomization needed for those).
- **Do not upload `organizer/` to CTFd.**
- Full chain re-verified end-to-end with curl + exiftool before delivery:
  root page → robots.txt → directory → all 5 profiles → image EXIF →
  locations table → final flag page.
