"""
Generates challenge_files/stairs/research_log.txt — Caesar shift +7 applied
to a short research-log narrative ending in the flag. Players decrypt with
shift=-7 (i.e. shift back by 7) using the key from the Floor 9 antidote.

Run: python3 generate_research_log.py
"""
import os

SHIFT = 7

PLAINTEXT = """RESEARCH LOG - ENTRY 14
The synthesis ratio remains unstable. Subject vitals dropping fast.
Backup notes are encoded the way I always do - check the memo first.
Fragment recovered: PUCTF{c43s4r_r3s34rch_l0g_d3crypt3d}
- Dr. Syed Mohammad Asif Iqbal"""


def caesar(text, shift):
    out = []
    for ch in text:
        if ch.isupper():
            out.append(chr((ord(ch) - 65 + shift) % 26 + 65))
        elif ch.islower():
            out.append(chr((ord(ch) - 97 + shift) % 26 + 97))
        else:
            out.append(ch)
    return "".join(out)


ciphertext = caesar(PLAINTEXT, SHIFT)

out_path = os.path.join(os.path.dirname(__file__), "..", "challenge_files", "stairs", "research_log.txt")
with open(out_path, "w") as f:
    f.write(ciphertext)

# Sanity check: decrypting with -SHIFT must recover the exact plaintext
recovered = caesar(ciphertext, -SHIFT)
assert recovered == PLAINTEXT, "Round-trip failed!"
print("Wrote:", out_path)
print("--- ciphertext ---")
print(ciphertext)
