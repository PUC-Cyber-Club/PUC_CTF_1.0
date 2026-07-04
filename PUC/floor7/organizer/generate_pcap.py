"""
Builds challenge_files/lift/lab_traffic.pcap for Floor 7.

Contains:
  - A few decoy TCP connections on port 443 with random "encrypted-looking"
    bytes (no real TLS handshake content -- just noise to sift through).
  - One real plaintext FTP session (control channel, port 21) that opens a
    passive-mode data channel and transfers elevator_override.txt, which
    contains the Lift flag.

All traffic is synthetic / locally generated -- no real hosts are contacted,
this only builds packet bytes and writes them to a .pcap file.

Run: python3 generate_pcap.py
"""
import os
import random
from scapy.all import IP, TCP, Raw, Ether, wrpcap

random.seed(7)

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "challenge_files", "lift")
os.makedirs(OUT_DIR, exist_ok=True)

LIFT_FLAG = "PUCTF{pc4p_ftp_3l3v4t0r_0v3rr1d3_f0und}\n"
FLAG_BYTES = LIFT_FLAG.encode()

CLIENT_IP = "10.50.9.15"
FTP_SERVER_IP = "10.50.9.50"
DECOY_IPS = ["203.0.113.10", "203.0.113.20", "203.0.113.30"]

ETH_SRC = "02:00:00:00:00:01"
ETH_DST = "02:00:00:00:00:02"

packets = []
t = 1771300020.0  # arbitrary epoch timestamp, ~03:47 local


def tick(step=None):
    global t
    t += step if step else random.uniform(0.02, 0.4)
    return t


class TCPStream:
    """Tracks seq/ack state for one direction-aware TCP connection and
    emits scapy packets for handshake, data exchange, and teardown."""

    def __init__(self, src_ip, src_port, dst_ip, dst_port):
        self.src_ip, self.src_port = src_ip, src_port
        self.dst_ip, self.dst_port = dst_ip, dst_port
        self.seq_c = random.randint(1000000, 4000000000)  # client seq
        self.seq_s = random.randint(1000000, 4000000000)  # server seq

    def _pkt(self, ip_src, ip_dst, sport, dport, flags, seq, ack, payload=b""):
        p = (
            Ether(src=ETH_SRC, dst=ETH_DST)
            / IP(src=ip_src, dst=ip_dst)
            / TCP(sport=sport, dport=dport, flags=flags, seq=seq, ack=ack, window=65535)
        )
        if payload:
            p = p / Raw(load=payload)
        p.time = tick()
        return p

    def handshake(self):
        out = []
        out.append(self._pkt(self.src_ip, self.dst_ip, self.src_port, self.dst_port, "S", self.seq_c, 0))
        self.seq_s_init = self.seq_s
        out.append(self._pkt(self.dst_ip, self.src_ip, self.dst_port, self.src_port, "SA", self.seq_s, self.seq_c + 1))
        self.seq_c += 1
        self.seq_s += 1
        out.append(self._pkt(self.src_ip, self.dst_ip, self.src_port, self.dst_port, "A", self.seq_c, self.seq_s))
        packets.extend(out)

    def send(self, from_client, payload):
        if from_client:
            pkt = self._pkt(self.src_ip, self.dst_ip, self.src_port, self.dst_port, "PA", self.seq_c, self.seq_s, payload)
            self.seq_c += len(payload)
            ack_pkt = self._pkt(self.dst_ip, self.src_ip, self.dst_port, self.src_port, "A", self.seq_s, self.seq_c)
            packets.extend([pkt, ack_pkt])
        else:
            pkt = self._pkt(self.dst_ip, self.src_ip, self.dst_port, self.src_port, "PA", self.seq_s, self.seq_c, payload)
            self.seq_s += len(payload)
            ack_pkt = self._pkt(self.src_ip, self.dst_ip, self.src_port, self.dst_port, "A", self.seq_c, self.seq_s)
            packets.extend([pkt, ack_pkt])

    def teardown(self):
        out = []
        out.append(self._pkt(self.src_ip, self.dst_ip, self.src_port, self.dst_port, "FA", self.seq_c, self.seq_s))
        self.seq_c += 1
        out.append(self._pkt(self.dst_ip, self.src_ip, self.dst_port, self.src_port, "FA", self.seq_s, self.seq_c))
        self.seq_s += 1
        out.append(self._pkt(self.src_ip, self.dst_ip, self.src_port, self.dst_port, "A", self.seq_c, self.seq_s))
        packets.extend(out)


# --- Decoy HTTPS-looking connections (noise) ---
for i, decoy_ip in enumerate(DECOY_IPS):
    s = TCPStream(CLIENT_IP, 44000 + i, decoy_ip, 443)
    s.handshake()
    s.send(True, bytes(random.getrandbits(8) for _ in range(80)))   # ClientHello-ish noise
    s.send(False, bytes(random.getrandbits(8) for _ in range(220)))  # ServerHello/cert-ish noise
    s.send(True, bytes(random.getrandbits(8) for _ in range(48)))
    s.teardown()

# --- FTP control channel ---
ctl = TCPStream(CLIENT_IP, 51000, FTP_SERVER_IP, 21)
ctl.handshake()
ctl.send(False, b"220 PUC-Biotech-Backup FTP Server Ready\r\n")
ctl.send(True, b"USER labadmin\r\n")
ctl.send(False, b"331 Password required for labadmin\r\n")
ctl.send(True, b"PASS B10h4z*rd!2026\r\n")
ctl.send(False, b"230 User labadmin logged in.\r\n")
ctl.send(True, b"PASV\r\n")
# 10,50,9,50,200,5 -> port 200*256+5 = 51205
ctl.send(False, b"227 Entering Passive Mode (10,50,9,50,200,5).\r\n")
ctl.send(True, b"RETR elevator_override.txt\r\n")
ctl.send(False, f"150 Opening BINARY mode data connection for elevator_override.txt ({len(FLAG_BYTES)} bytes).\r\n".encode())

# --- FTP data channel (passive port 51205) ---
data = TCPStream(CLIENT_IP, 51001, FTP_SERVER_IP, 51205)
data.handshake()
data.send(False, FLAG_BYTES)
data.teardown()

# Back on control channel
ctl.send(False, b"226 Transfer complete.\r\n")
ctl.send(True, b"QUIT\r\n")
ctl.send(False, b"221 Goodbye.\r\n")
ctl.teardown()

# Sort by timestamp so Wireshark shows a sane chronological order
packets.sort(key=lambda p: p.time)

out_path = os.path.join(OUT_DIR, "lab_traffic.pcap")
wrpcap(out_path, packets)
print("Wrote:", out_path, f"({len(packets)} packets)")
