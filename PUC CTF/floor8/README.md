# Floor 8 — Dr. Rahman's Office (Cryptography)
PUC Intra CTF: Zombie Outbreak — Floor Escape

No live server needed — all three challenges are CTFd **file-attachment**
challenges. Upload the corresponding file(s) from `challenge_files/` when
creating each challenge in CTFd, set the flag as a **Static, case-sensitive**
flag.

## Challenge setup

| Challenge | File(s) to attach | Mechanism | Flag |
|---|---|---|---|
| Antidote — The Personal Memo | `antidote/memo.txt` | Base64 decode | `PUCTF{b4se64_memo_r3v34l3d}` |
| Stairs — The Research Log | `stairs/research_log.txt` | Caesar cipher, shift back by 7 (key comes from Floor 9 antidote) | `PUCTF{c43s4r_r3s34rch_l0g_d3crypt3d}` |
| Lift — RSA-Encrypted Master Formula | `lift/keys.txt` + `lift/master_formula.enc` | RSA e=3 cube-root attack (no padding, m³ < n) | `PUCTF{rs4_3_cub3_r00t_m4st3r_f0rmul4}` |

## Player solve paths (for your write-up / hints)

**Antidote:**
```bash
base64 -d memo.txt
```

**Stairs:**
```python
def caesar(text, shift):
    out = []
    for ch in text:
        if ch.isupper(): out.append(chr((ord(ch)-65+shift)%26+65))
        elif ch.islower(): out.append(chr((ord(ch)-97+shift)%26+97))
        else: out.append(ch)
    return "".join(out)

print(caesar(open("research_log.txt").read(), -7))
```

**Lift:**
```python
import gmpy2
from Crypto.Util.number import bytes_to_long, long_to_bytes

n = int(open("keys.txt").read().split("n = ")[1].split("\n")[0])
c = bytes_to_long(open("master_formula.enc", "rb").read())
m, exact = gmpy2.iroot(c, 3)   # exact must be True
print(long_to_bytes(int(m)).decode())
```
Requires `pip install pycryptodome gmpy2`.

## Organizer notes

- `organizer/generate_research_log.py` and `organizer/generate_rsa.py` regenerate
  the challenge files. **Do not upload the `organizer/` folder to CTFd** —
  it contains the plaintext/solution, only `challenge_files/` is player-facing.
- The RSA generator loops until `m**3 < n` holds (no modular wraparound), so the
  cube root is exact — re-running it produces a different but equally valid
  1024-bit key pair if you want fresh values.
- All three solve paths were tested blind (only reading the public files, not
  the generation script's internal variables) before delivery.
