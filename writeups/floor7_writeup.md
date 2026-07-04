# Floor 7 — Pathology Lab
## PUC Intra CTF: Zombie Outbreak | Forensics | 750 pts

---

> *Floor 7. The pathology lab is dark except for a monitor still displaying microscope images from infected patients. A folder of sample images sits on the desktop. One of them is sample_042.jpg — the last file Dr. Rahman accessed before going dark.*

---

## Challenge Overview

| # | Name | Type | Points |
|---|---|---|---|
| 1 | Sample Image Metadata | Antidote | 100 |
| 2 | Hidden Archive | Stairs | 250 |
| 3 | Surveillance PCAP | Lift | 400 |

**Files provided:** `sample_042.jpg`, `lab_traffic.pcap`

---

## Antidote — Sample Image Metadata (100 pts)

### What's going on?

You're handed a JPEG called `sample_042.jpg`. Open it in an image viewer and it looks like a microscope slide — cells, noise, a timestamp in the corner. Nothing suspicious on the surface.

In forensics, the surface is never the whole story.

### The approach

Every digital image carries **EXIF metadata** — a block of data embedded in the file that can hold camera model, GPS coordinates, timestamps, copyright info, and most importantly: custom comment fields. Tools like `exiftool` read all of it in one shot.

```bash
exiftool sample_042.jpg
```

Buried in the output:

```
Comment: PUCTF{3x1f_p4th0l0gy_d4t4_f0und} - check for hidden archive in this file
```

Two things here: the flag, and a clue pointing to the Stairs challenge — there's a hidden archive inside this same image file.

### Flag
```
PUCTF{3x1f_p4th0l0gy_d4t4_f0und}
```

---

## Stairs — Hidden Archive (250 pts)

### What's going on?

The EXIF comment said "check for hidden archive in this file." Open the image in a hex editor and check the file size — it's noticeably larger than it should be for an image this resolution. Something extra is in there.

### How JPEG/ZIP polyglots work

JPEG files have a defined structure: they begin with `FFD8` (Start of Image) and end with `FFD9` (End of Image). Any data after `FFD9` is **ignored by image viewers** — they stop reading at the EOI marker.

ZIP archives, on the other hand, are located by their **End of Central Directory** record near the *end* of the file. ZIP readers scan backward from the end of the file to find this record. They don't care what's at the beginning.

This creates a classic polyglot: a file that is simultaneously a valid JPEG and a valid ZIP. Image viewers see the JPEG. ZIP tools see the archive. The data after the JPEG's EOI marker is invisible to anything that treats the file as an image.

### Finding and extracting the archive

```bash
# binwalk scans the whole file for known file signatures
binwalk sample_042.jpg
```

Output:
```
DECIMAL    HEXADECIMAL    DESCRIPTION
---------------------------------------------------------
51270      0xC846         Zip archive data, ... name: stairwell_access.txt
51427      0xC8E3         End of Zip archive, footer length: 22
```

The ZIP starts at byte offset 51270, right after the JPEG ends. Extract it:

```bash
binwalk -e sample_042.jpg
# or more directly:
unzip sample_042.jpg
```

`unzip` will print a warning — *"51270 extra bytes at beginning or within zipfile"* — and then extract cleanly anyway. The "extra bytes" are just the JPEG sitting before the ZIP.

```bash
cat stairwell_access.txt
```

### Flag
```
PUCTF{b1nw4lk_z1p_3xtr4ct3d_st41rw3ll}
```

---

## Lift — Surveillance PCAP (400 pts)

### What's going on?

`lab_traffic.pcap` is a network capture file. The story says it was recording when the elevator override command was last sent. Somewhere in this traffic is the override data.

Open it in **Wireshark**.

### Step 1 — Get an overview

Don't dive into individual packets immediately. Start with the big picture:

`Statistics → Conversations → TCP`

You'll see several short TCP sessions on **port 443** — these look like HTTPS, meaning they're encrypted and useless without the session keys. You can't read the payload.

But there's also a session on **port 21** — that's **FTP**. FTP is a 1980s protocol that sends everything, including credentials and file contents, in **plain cleartext**. This is your target.

### Step 2 — Read the FTP control channel

Apply a Wireshark display filter:

```
ftp
```

The control channel conversation becomes readable:

```
220 PUC-Biotech-Backup FTP Server Ready
USER labadmin
331 Password required
PASS B10h4z*rd!2026
230 User labadmin logged in.
PASV
227 Entering Passive Mode (10,50,9,50,200,5).
RETR elevator_override.txt
150 Opening BINARY mode data connection for elevator_override.txt (40 bytes).
226 Transfer complete.
```

The server transferred a file called `elevator_override.txt`. But the control channel only carries commands and responses — the actual file bytes travel on a **separate data connection**.

### Step 3 — Decode the passive mode port

The `227` response encodes the data channel address as six comma-separated numbers: the first four are the IP, the last two encode the port:

```
(10,50,9,50,200,5) → IP: 10.50.9.50, Port: 200×256 + 5 = 51205
```

The file was transferred over TCP port **51205** — a completely separate stream from the FTP control port 21.

### Step 4 — Follow the data stream

Filter for that port:

```
tcp.port == 51205
```

Right-click any packet → **Follow → TCP Stream**.

The reconstructed stream content is the file that was transferred:

```
PUCTF{pc4p_ftp_3l3v4t0r_0v3rr1d3_f0und}
```

**CLI equivalent using tshark:**

```bash
# Find the stream index for the data channel
tshark -r lab_traffic.pcap -T fields -e tcp.stream -e tcp.dstport | grep 51205
# Returns: 4

# Follow that stream
tshark -r lab_traffic.pcap -q -z follow,tcp,ascii,4
```

### Why this matters

The port 443 traffic was placed deliberately as a red herring — encrypted sessions that look important but yield nothing without decryption keys. The real data was on FTP, which was never designed with security in mind. This mirrors real-world situations where a network analyst has to sift through volumes of encrypted traffic to find the one unencrypted session that contains something sensitive.

Never use FTP on an internal network. SFTP or FTPS exist for a reason.

### Flag
```
PUCTF{pc4p_ftp_3l3v4t0r_0v3rr1d3_f0und}
```

---

## Scoreboard

```
[✓] PUCTF{3x1f_p4th0l0gy_d4t4_f0und}           100 pts
[✓] PUCTF{b1nw4lk_z1p_3xtr4ct3d_st41rw3ll}     250 pts
[✓] PUCTF{pc4p_ftp_3l3v4t0r_0v3rr1d3_f0und}    400 pts
                                          TOTAL: 750 pts
```

*Stairwell access confirmed. Descending to Floor 6.*
