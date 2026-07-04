# Floor 7 — Pathology Lab (Forensics)
PUC Intra CTF: Zombie Outbreak — Floor Escape

No live server needed — all three challenges are CTFd **file-attachment**
challenges. Flags are **Static, case-sensitive**.

## Challenge setup

| Challenge | File(s) to attach | Mechanism | Flag |
|---|---|---|---|
| Antidote — Sample Image Metadata | `antidote_stairs/sample_042.jpg` | `exiftool` reads the JPEG Comment field | `PUCTF{3x1f_p4th0l0gy_d4t4_f0und}` |
| Stairs — Hidden Archive | *(same file)* `sample_042.jpg` | A ZIP is appended after the JPEG's EOI marker; `binwalk`/`unzip` finds it | `PUCTF{b1nw4lk_z1p_3xtr4ct3d_st41rw3ll}` |
| Lift — Surveillance PCAP | `lift/lab_traffic.pcap` | Decoy HTTPS noise + one plaintext FTP session; follow the data-channel TCP stream | `PUCTF{pc4p_ftp_3l3v4t0r_0v3rr1d3_f0und}` |

Antidote and Stairs share one file — attach `sample_042.jpg` to both
challenge entries in CTFd (or just to Antidote, and reference "the same
image from the Antidote challenge" in the Stairs description).

## Player solve paths

**Antidote:**
```bash
exiftool sample_042.jpg
```
Comment field holds the flag and a pointer to the hidden archive.

**Stairs:**
```bash
binwalk sample_042.jpg      # confirms an embedded ZIP + its offset
unzip sample_042.jpg        # extracts stairwell_access.txt despite the warning
cat stairwell_access.txt
```
The "extra bytes... attempting to process anyway" warning from `unzip` is
expected — that's the JPEG data sitting before the ZIP's actual start.

**Lift:**
1. Open `lab_traffic.pcap` in Wireshark.
2. `Statistics → Conversations → TCP` shows several short port-443 streams
   (decoy) and one port-21 stream (FTP control) plus its passive-mode data
   stream.
3. Apply filter `ftp` to read the control-channel commands (`USER`, `PASS`,
   `RETR elevator_override.txt`).
4. Right-click any packet in the **data** stream (the one on the passive
   port from the `227` response) → Follow → TCP Stream. The flag is the
   full stream content.

Equivalent CLI (`tshark`):
```bash
tshark -r lab_traffic.pcap -Y ftp                     # see the control flow
tshark -r lab_traffic.pcap -q -z follow,tcp,ascii,4    # stream index from conversations output
```

## Organizer notes

- `organizer/generate_floor7_image.py` and `organizer/generate_pcap.py` regenerate
  both challenge files deterministically (seeded RNG). **Do not upload `organizer/`
  to CTFd** — it contains the plaintext flags and generation logic.
- The base image is a procedurally generated abstract pattern (no real/copyrighted
  photo used) — fine to swap for a nicer microscopy-style image later; only the
  COM-marker insertion + ZIP append steps matter for the challenge mechanics.
- The pcap is fully synthetic (built with Scapy, no real network capture) so it
  reproduces identically every run and has no dependency on live services.
- All three solves were verified blind with `exiftool`, `unzip`, `binwalk`, and
  `tshark` against only the public files before delivery.
