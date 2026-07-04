# Floor 8 — Dr. Rahman's Office
## PUC Intra CTF: Zombie Outbreak | Cryptography | 750 pts

---

> *You make it to Floor 8. Dr. Rahman's office is unlocked — he left in a hurry. His computer is still on. Two files sit on the desktop: memo.txt and research_log.txt. A third, more ominous file is locked away: master_formula.enc.*

---

## Challenge Overview

| # | Name | Type | Points |
|---|---|---|---|
| 1 | The Personal Memo | Antidote | 100 |
| 2 | The Research Log | Stairs | 250 |
| 3 | RSA-Encrypted Master Formula | Lift | 400 |

**Files provided:** `memo.txt`, `research_log.txt`, `keys.txt`, `master_formula.enc`

---

## Antidote — The Personal Memo (100 pts)

### What's going on?

You download `memo.txt` and open it. It's a wall of seemingly random characters — letters, numbers, equals signs at the end. Looks like gibberish, but it has a very recognizable pattern if you've seen it before.

```
UFVDVEZ7YjRzZTY0X21lbW9fcjN2MzRsM2R9IFRoZSBtYWluIGZvcm11bGEgaXMgaW4gcmVzZWFyY2hfbG9nLnR4dCAtIGNhZXNhciBzaGlmdGVkLg==
```

That `==` padding at the end is the giveaway. This is **Base64**.

### The approach

Base64 is not encryption — it's encoding. It converts binary data into printable ASCII characters so it can be transmitted over text-based systems. Anyone can decode it with zero knowledge of any key or secret. Dr. Rahman described it as "the way I always do" — suggesting he thought it was more secure than it is.

### Decoding it

```bash
echo "UFVDVEZ7YjRzZTY0X21lbW9fcjN2MzRsM2R9IFRoZSBtYWluIGZvcm11bGEgaXMgaW4gcmVzZWFyY2hfbG9nLnR4dCAtIGNhZXNhciBzaGlmdGVkLg==" | base64 -d
```

Output:
```
PUCTF{b4se64_memo_r3v34l3d} The main formula is in research_log.txt - caesar shifted.
```

The flag decodes cleanly, and the rest of the message gives you the next hint: `research_log.txt` uses a Caesar cipher. Combined with the shift key `= 7` you found hidden in Floor 9's HTML comment — you have everything you need for the Stairs challenge.

### Flag
```
PUCTF{b4se64_memo_r3v34l3d}
```

---

## Stairs — The Research Log (250 pts)

### What's going on?

`research_log.txt` is a wall of shifted text. Letters are off — words look almost recognizable but wrong. This is a **Caesar cipher**: every letter in the alphabet has been shifted by a fixed number of positions.

```
YLJLHYJO SVN - LUAYF 14
Aol zfuaolzpz yhapv ylthpuz buzahisl. Zbiqlja cpahsz kyvwwpun mhza.
...
Myhntlua yljvclylk: WBJAM{j43z4y_y3z34yjo_s0n_k3jyfwa3k}
```

### The approach

A Caesar cipher with a known shift is trivially reversible. You already know the key: **shift = 7** from the Floor 9 antidote comment. To decrypt: shift every letter **back by 7** positions.

The encrypted flag in the file is `WBJAM{j43z4y...}` — shift each letter back 7 and you get `PUCTF{c43s4r...}`.

### Decrypting it

Write a quick Python script:

```python
def caesar_decrypt(text, shift):
    result = []
    for ch in text:
        if ch.isupper():
            result.append(chr((ord(ch) - 65 - shift) % 26 + 65))
        elif ch.islower():
            result.append(chr((ord(ch) - 97 - shift) % 26 + 97))
        else:
            result.append(ch)
    return ''.join(result)

print(caesar_decrypt(open('research_log.txt').read(), 7))
```

Output:
```
RESEARCH LOG - ENTRY 14
The synthesis ratio remains unstable. Subject vitals dropping fast.
Backup notes are encoded the way I always do - check the memo first.
Fragment recovered: PUCTF{c43s4r_r3s34rch_l0g_d3crypt3d}
- Dr. Rahman
```

Or use an online tool — CyberChef's "ROT13" with amount 7 works fine, though it's more satisfying to script it.

### Key insight

The cross-floor dependency is intentional here: the shift key isn't given in this challenge's files — it was embedded as a hint in Floor 9's antidote. If you skipped that flag or didn't read the full comment, you'd have to brute-force all 25 possible Caesar shifts. Which is also fast, but that's the penalty for not being thorough.

### Flag
```
PUCTF{c43s4r_r3s34rch_l0g_d3crypt3d}
```

---

## Lift — RSA-Encrypted Master Formula (400 pts)

### What's going on?

You're given two files:

**`keys.txt`:**
```
n = 87259294992993457308273091267520132022... (1023-bit number)
e = 3
```

**`master_formula.enc`:** 111 raw bytes — the ciphertext `c`.

`e = 3` is the first thing that jumps out. Standard RSA uses `e = 65537`. A public exponent of `3` is a red flag — it opens the door to a specific class of attacks.

### Understanding the vulnerability

In textbook RSA (no padding), encryption is:

```
c = m^e mod n
```

Where `m` is the plaintext as an integer and `c` is the ciphertext. With `e = 3`, if the plaintext `m` is small enough that `m³` doesn't exceed `n`, then modular reduction never actually happens:

```
c = m^3 mod n = m^3   (because m^3 < n)
```

Which means:

```
m = cube_root(c)
```

No need to factor `n`. No need for the private key. This is the **small public exponent cube-root attack**, and it works whenever the message is short relative to the modulus.

### Checking if the attack applies

The flag is about 38 bytes = ~304 bits. The modulus `n` is 1023 bits. So `m` is ~304 bits and `m³` is ~912 bits — which is less than 1023. The condition holds. The attack is valid.

### Solving it

```python
import gmpy2
from Crypto.Util.number import bytes_to_long, long_to_bytes

# Load the public key
with open('keys.txt') as f:
    content = f.read()
n = int(content.split('n = ')[1].split('\n')[0])

# Load ciphertext as integer
c = bytes_to_long(open('master_formula.enc', 'rb').read())

# Take the integer cube root
m, exact = gmpy2.iroot(c, 3)

# If exact is True, the attack worked — no modular reduction occurred
print("Exact cube root:", exact)
print(long_to_bytes(int(m)).decode())
```

Output:
```
Exact cube root: True
PUCTF{rs4_3_cub3_r00t_m4st3r_f0rmul4}
```

Install dependencies: `pip install pycryptodome gmpy2`

### Why `gmpy2` and not Python's built-in?

Python's `**` operator or `math.isqrt` won't give you an exact integer cube root of a 900+ bit number reliably. `gmpy2.iroot(c, 3)` is built on GMP (GNU Multiple Precision), handles arbitrarily large integers, and returns an `(root, exact)` tuple — the `exact` flag tells you whether the result is a perfect cube, which directly confirms the attack succeeded.

### Why this is a real vulnerability

RSA with `e = 3` and no padding (no OAEP, no PKCS#1 v1.5) has been known since the 1990s. Real-world exploits like Bleichenbacher's attack and Coppersmith's small-exponent attack are variations of this class of weakness. Modern implementations mandate OAEP padding and `e = 65537` (or larger) specifically to prevent these attacks.

### Flag
```
PUCTF{rs4_3_cub3_r00t_m4st3r_f0rmul4}
```

---

## Scoreboard

```
[✓] PUCTF{b4se64_memo_r3v34l3d}              100 pts
[✓] PUCTF{c43s4r_r3s34rch_l0g_d3crypt3d}    250 pts
[✓] PUCTF{rs4_3_cub3_r00t_m4st3r_f0rmul4}   400 pts
                                       TOTAL: 750 pts
```

*The stairwell door unlocks. Floor 7 awaits.*
