"""
Generates challenge_files/lift/keys.txt (n, e) and
challenge_files/lift/master_formula.enc (raw ciphertext bytes) for the
RSA e=3 cube-root attack challenge. Ensures m**3 < n so the ciphertext
needs NO modular reduction -- a direct integer cube root recovers m.

Run: python3 generate_rsa.py
"""
import os
from Crypto.Util.number import getPrime, bytes_to_long, long_to_bytes
import gmpy2

FLAG = b"PUCTF{rs4_3_cub3_r00t_m4st3r_f0rmul4}"
E = 3

m = bytes_to_long(FLAG)

while True:
    p = getPrime(512)
    q = getPrime(512)
    n = p * q
    if m ** 3 < n and pow(m, E, n) == m ** 3:
        c = m ** 3
        break

out_dir = os.path.join(os.path.dirname(__file__), "..", "challenge_files", "lift")

with open(os.path.join(out_dir, "keys.txt"), "w") as f:
    f.write(f"n = {n}\ne = {E}\n")

c_bytes = long_to_bytes(c)
with open(os.path.join(out_dir, "master_formula.enc"), "wb") as f:
    f.write(c_bytes)

# Verify the intended solve path recovers the exact flag
recovered_c = bytes_to_long(c_bytes)
root, exact = gmpy2.iroot(recovered_c, 3)
assert exact, "c is not a perfect cube — m**3 < n condition failed"
recovered_flag = long_to_bytes(int(root))
assert recovered_flag == FLAG, f"Mismatch: {recovered_flag}"

print("n bit length:", n.bit_length())
print("m**3 < n:", m ** 3 < n)
print("Recovered flag:", recovered_flag.decode())
print("Files written to:", out_dir)
