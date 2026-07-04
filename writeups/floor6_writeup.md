# Floor 6 — Security & Surveillance Office
## PUC Intra CTF: Zombie Outbreak | OSINT | 750 pts

---

> *Floor 6. The security office. Monitors everywhere, most of them dark. One system is still alive — the SafeCampus student check-in portal. Patient Zero's last known location was logged here before everything went wrong.*

---

## Challenge Overview

| # | Name | Type | Points |
|---|---|---|---|
| 1 | Patient Zero Profile | Antidote | 100 |
| 2 | Geolocation Trace | Stairs | 250 |
| 3 | Synthesizer Binary | Lift | 400 |

**Target:** `http://<target>:5006`

---

## Antidote — Patient Zero Profile (100 pts)

### What's going on?

You hit the landing page at port 5006. It's a generic IT status page for Premier University — lists internal services by name, including "SafeCampus Check-In System: ONLINE." But there's no link, no URL, no path to the actual system. Just a name.

This is OSINT. You find things by following breadcrumbs.

### Step 1 — robots.txt

`robots.txt` is always the first stop on any web target. It tells search engine crawlers which paths to avoid — which means it tells you exactly which paths the admin didn't want indexed.

```bash
curl -s http://<target>:5006/robots.txt
```

```
User-agent: *
Disallow: /osint/
Disallow: /admin/
```

Two disallowed paths. `/admin/` is a dead end — common decoy. `/osint/` is more promising given the challenge theme.

### Step 2 — Finding the SafeCampus path

The landing page named the service **"SafeCampus."** The robots entry points to `/osint/`. Put them together: try `/osint/safecampus/`.

That path returns 404 as a bare directory — but the standard web convention is to serve `index.html` from a directory. Try:

```bash
curl -s http://<target>:5006/osint/safecampus/index.html
```

That works. You get a directory listing of recent student check-ins: **5 entries**, listed by name and student ID only, in chronological order — no status, no department shown at this level.

### Step 3 — Checking each profile

You have to open all five. There's no way to filter without looking:

```
profile_2031.html  — Areeba Chowdhury     → CHECKED IN
profile_2042.html  — Tanvir Hasan         → CHECKED IN
profile_2055.html  — Nusrat Jahan         → CHECKED IN
profile_2068.html  — Rafiul Islam         → MISSING ← this one
profile_2077.html  — Mehzabin Akter       → CHECKED IN
```

Note: `profile_2077` is in the same department (Biotechnology) as `profile_2068` — a deliberate trap to stop you from just filtering by dept.

`profile_2068` is flagged MISSING. The bio reads:

> *"Feeling dizzy after lab work. Going to rest in the old library basement. PUCTF{p4t13nt_z3r0_l0c4t10n_f0und}"*

There's also a last-seen photo linked from this profile.

### Flag
```
PUCTF{p4t13nt_z3r0_l0c4t10n_f0und}
```

---

## Stairs — Geolocation Trace (250 pts)

### What's going on?

The photo `last_seen.jpg` on Patient Zero's profile was taken by a campus security camera just before the outbreak. If the camera embedded GPS coordinates in the image, you can trace exactly where he went.

### Step 1 — Extract GPS EXIF

```bash
curl -s -o last_seen.jpg http://<target>:5006/osint/safecampus/last_seen.jpg
exiftool -GPSLatitude -GPSLongitude last_seen.jpg
```

Output:
```
GPS Latitude  : 22 deg 21' 24.84" N
GPS Longitude : 91 deg 46' 59.52" E
```

### Step 2 — Convert DMS to decimal

GPS coordinates from EXIF come in **Degrees Minutes Seconds (DMS)** format. To work with them, convert to decimal:

```
22 + (21 / 60) + (24.84 / 3600) = 22.3569° N
91 + (46 / 60) + (59.52 / 3600) = 91.7832° E
```

### Step 3 — Cross-reference campus locations

The SafeCampus portal has a locations reference page that wasn't linked from anywhere:

```bash
curl -s http://<target>:5006/osint/safecampus/campus_locations.html
```

It's a table of campus zones and their coordinate ranges:

| Zone | Latitude (N) | Longitude (E) |
|---|---|---|
| Cafeteria | 22.3510 – 22.3530 | 91.7800 – 91.7820 |
| Main Library — Ground Floor | 22.3550 – 22.3560 | 91.7820 – 91.7830 |
| **Old Library — Basement Level** | **22.3565 – 22.3575** | **91.7825 – 91.7840** |
| Hazari Lane Main Gate | 22.3580 – 22.3600 | 91.7840 – 91.7860 |

The coordinates `22.3569, 91.7832` fall inside **Old Library — Basement Level**. That matches exactly what Patient Zero's bio said: *"going to rest in the old library basement."*

### Step 4 — Navigate to the zone page

The site uses consistent lowercase-underscore slugs throughout. "Old Library — Basement Level" becomes `old_library_basement.html`:

```bash
curl -s http://<target>:5006/osint/safecampus/old_library_basement.html
```

```
Restricted area. Last known signal match for PUC-2068.
PUCTF{g30l0c4t10n_0ld_l1br4ry_st41rs}
```

### Why this is genuine OSINT

Every step here mirrors real open-source intelligence techniques: enumerating hidden paths, extracting metadata from images, converting coordinate formats, and cross-referencing data sources. No single step gives you the answer — you chain them together. That's OSINT.

### Flag
```
PUCTF{g30l0c4t10n_0ld_l1br4ry_st41rs}
```

---

## Lift — Synthesizer Binary (400 pts)

### What's going on?

A compiled binary called `synth_v2` was found on the security office's backup drive. According to the story, it simulates the antidote mixing machine that controls the elevator's chemical lock. Run it and it prompts for **4 integers**.

```bash
./synth_v2
Enter mixing ratios (4 integers): 1 2 3 4
Mixture unstable.
```

You need the right combination. The answer is hardcoded somewhere in the binary.

### Step 1 — Try strings first

```bash
strings synth_v2 | grep -i puctf
```

Nothing. The flag isn't stored as plaintext — it's been encoded inside the binary to prevent this exact shortcut. You'll need to actually reverse it.

### Step 2 — Find the comparison values

Look at the disassembly to find where the program checks your input:

```bash
objdump -d synth_v2 | grep -B2 "cmp"
```

Or open in **Ghidra**: decompile `main()` and the logic becomes immediately readable:

```c
if (a == 23 && b == 7 && c == 91 && d == 4) {
    print_decoded(enc_flag, sizeof(enc_flag), 0x42);
}
```

Four magic values: **23, 7, 91, 4**.

In the raw assembly they appear as hex: `0x17`, `0x07`, `0x5b`, `0x04`. The `cmp` instructions comparing your input against these values are easy to spot.

### Step 3 — Run it with the correct values

```bash
./synth_v2
Enter mixing ratios (4 integers): 23 7 91 4
SUCCESS! PUCTF{r3v3rs3d_synth3s1z3r_3l3v4t0r_unl0ck}
```

### Bonus path — no execution needed

If you're running in a restricted environment and can't execute the binary, you can decode the flag statically. The disassembly also reveals the XOR key (`0x42`) used to encode the flag, and you can see the raw `enc_flag[]` byte array in the `.rodata` section. XOR each byte with `0x42` manually:

```python
enc = [0x11,0x17,0x01,0x01,0x07,0x11,0x11,0x63,0x62,...]
print(''.join(chr(b ^ 0x42) for b in enc))
```

This is why `strings` couldn't find it — the flag was never stored as plaintext, only as XOR-encoded bytes.

### Flag
```
PUCTF{r3v3rs3d_synth3s1z3r_3l3v4t0r_unl0ck}
```

---

## Scoreboard

```
[✓] PUCTF{p4t13nt_z3r0_l0c4t10n_f0und}          100 pts
[✓] PUCTF{g30l0c4t10n_0ld_l1br4ry_st41rs}        250 pts
[✓] PUCTF{r3v3rs3d_synth3s1z3r_3l3v4t0r_unl0ck}  400 pts
                                           TOTAL: 750 pts
```

*One floor left. The lobby. The exit.*
