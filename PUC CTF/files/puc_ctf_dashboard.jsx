import { useState, useEffect, useRef, useCallback } from "react";

const PALETTE = {
  void: "#050507",
  surface: "#0a0a0d",
  card: "#0f0f13",
  cardHover: "#141418",
  border: "#1c1c24",
  borderBright: "#2a2a38",
  red: "#d42222",
  redDim: "#8a1515",
  redGlow: "rgba(212,34,34,0.15)",
  amber: "#e07c00",
  amberDim: "#7a4400",
  teal: "#007a7a",
  purple: "#6622bb",
  blue: "#1155cc",
  slate: "#3a3a50",
  text: "#c8c0b0",
  textDim: "#6a6478",
  textBright: "#e8e0d0",
  solved: "#0d1a0d",
  solvedBorder: "#1a3a1a",
  solvedText: "#2d6b2d",
};

const CAT_META = {
  OSINT:     { color: "#e07c00", bg: "#1a0e00", icon: "🕵" },
  Forensics: { color: "#007a7a", bg: "#001a1a", icon: "🔬" },
  Crypto:    { color: "#8844dd", bg: "#110022", icon: "🔐" },
  Web:       { color: "#2277dd", bg: "#001122", icon: "🌐" },
  Misc:      { color: "#555570", bg: "#111118", icon: "⚙" },
};

const DIFF_LABELS = { 1: "EASY", 2: "MEDIUM", 3: "HARD", 4: "EXPERT", 5: "IMPOSSIBLE" };

const CHALLENGES = [
  {id:1,name:"Dead Signal",cat:"OSINT",floor:"F1",pts:50,solves:38,diff:1,desc:"A distress signal was intercepted from a building near Premier University. Find the exact coordinates of the transmission source.",files:["signal.wav"],solved:true},
  {id:2,name:"Rotting Evidence",cat:"Forensics",floor:"F1",pts:100,solves:22,diff:2,desc:"The infected left behind a corrupted image file. Something is hidden in the noise. Recover what's inside before the trail goes cold.",files:["evidence.png"],solved:true},
  {id:3,name:"Sanity Check",cat:"Misc",floor:"F1",pts:25,solves:41,diff:1,desc:"Welcome to the outbreak. Prove you're still human. Read the rules and grab the flag — if you can find it.",files:[],solved:true},
  {id:4,name:"Phantom IP",cat:"OSINT",floor:"F2",pts:150,solves:14,diff:2,desc:"An anonymous threat actor uploaded files to a compromised server. Trace their digital footprint through the access logs.",files:["access.log"],solved:true},
  {id:5,name:"Bleed.exe",cat:"Web",floor:"F2",pts:200,solves:9,diff:3,desc:"A zombie-controlled web portal is bleeding data. Exploit the vulnerability before the horde arrives and the server goes dark.",files:[],solved:false},
  {id:6,name:"Cipher Outbreak",cat:"Crypto",floor:"F2",pts:175,solves:11,diff:2,desc:"The resistance encrypted their comms but the key is dangerously weak. Break it before the next transmission window closes.",files:["encrypted.txt"],solved:true},
  {id:7,name:"Shallow Grave",cat:"Forensics",floor:"F3",pts:250,solves:7,diff:3,desc:"Disk image recovered from an infected terminal. Find what was deleted in the last 48 hours before the outbreak began.",files:["grave.img"],solved:false},
  {id:8,name:"XSS-mobi",cat:"Web",floor:"F3",pts:225,solves:8,diff:3,desc:"Patient zero's mobile app leaks data through a client-side flaw. Exploit the cross-site vector and capture the exfiltrated key.",files:[],solved:true},
  {id:9,name:"Broken Keys",cat:"Crypto",floor:"F3",pts:300,solves:5,diff:4,desc:"RSA with a twist — the modulus has a weak prime factor hidden in plain sight. Factor it before the encryption locks you out.",files:["keys.pem"],solved:true},
  {id:10,name:"Ghost Protocol",cat:"OSINT",floor:"F4",pts:350,solves:3,diff:4,desc:"A classified memo was leaked on the dark web. Reconstruct its origin through chained metadata trails and geolocation markers.",files:["memo.pdf"],solved:false},
  {id:11,name:"Shellshock Mk2",cat:"Web",floor:"F4",pts:400,solves:2,diff:5,desc:"The quarantine server runs a vulnerable CGI endpoint. Pop a shell before the automated purge cycles trigger.",files:[],solved:false},
  {id:12,name:"Vinad",cat:"Crypto",floor:"F4",pts:375,solves:2,diff:5,desc:"A custom GF(2)-based encryption scheme. The function space is far smaller than the authors believed.",files:["vinad.py","ct.txt"],solved:false},
  {id:13,name:"Exfil Chain",cat:"Forensics",floor:"F5",pts:450,solves:1,diff:5,desc:"Five-stage network capture. Each layer conceals the next flag. Unravel the full chain before the evidence degrades.",files:["chain.pcap"],solved:false},
  {id:14,name:"Last Beacon",cat:"OSINT",floor:"F5",pts:475,solves:1,diff:5,desc:"The final survivor sent one last transmission. Find them before the horde closes in and the signal is gone forever.",files:["beacon.wav","meta.txt"],solved:false},
  {id:15,name:"Epoch Zero",cat:"Crypto",floor:"F5",pts:500,solves:0,diff:5,desc:"The master key to the entire outbreak network. Zero solves. This is the end — or the beginning.",files:["epoch.enc"],solved:false},
];

const INITIAL_LEADERS = [
  {name:"ZombieKillers",score:2150},
  {name:"HazariHackers",score:1800},
  {name:"ByteBusters",score:1200},
  {name:"CipherSquad",score:950},
  {name:"NullPointers",score:700},
  {name:"HexHunters",score:525},
];

const ACTIVITY_INIT = [
  {team:"ZombieKillers",chall:"Epoch Zero",type:"fail",ago:2},
  {team:"HazariHackers",chall:"Last Beacon",type:"solve",ago:5},
  {team:"ByteBusters",chall:"Ghost Protocol",type:"solve",ago:9},
  {team:"CipherSquad",chall:"Vinad",type:"fail",ago:11},
  {team:"PortCityPredictors",chall:"Broken Keys",type:"solve",ago:18},
  {team:"NullPointers",chall:"Bleed.exe",type:"fail",ago:24},
];

const FLOORS = ["F1","F2","F3","F4","F5"];

function useTicker(initial = 10032) {
  const [secs, setSecs] = useState(initial);
  useEffect(() => {
    const id = setInterval(() => setSecs(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, []);
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  const fmt = (n) => String(n).padStart(2, "0");
  return { secs, display: `${fmt(h)}:${fmt(m)}:${fmt(s)}`, short: `${fmt(h)}:${fmt(m)}` };
}

function DiffPips({ diff }) {
  return (
    <div style={{ display: "flex", gap: 3, marginTop: 6 }}>
      {[1,2,3,4,5].map(i => (
        <div key={i} style={{
          width: 5, height: 5, borderRadius: "50%",
          background: i <= diff ? PALETTE.red : PALETTE.border,
          boxShadow: i <= diff ? `0 0 4px ${PALETTE.red}` : "none",
          transition: "all 0.2s",
        }} />
      ))}
    </div>
  );
}

function ChallengeCard({ c, onClick }) {
  const [hover, setHover] = useState(false);
  const meta = CAT_META[c.cat] || CAT_META.Misc;
  return (
    <div
      onClick={() => onClick(c)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      tabIndex={0}
      onKeyDown={e => e.key === "Enter" && onClick(c)}
      style={{
        background: c.solved ? PALETTE.solved : (hover ? PALETTE.cardHover : PALETTE.card),
        border: `1px solid ${c.solved ? PALETTE.solvedBorder : (hover ? PALETTE.borderBright : PALETTE.border)}`,
        borderLeft: `3px solid ${c.solved ? PALETTE.solvedText : meta.color}`,
        padding: "14px 14px 12px",
        cursor: "pointer",
        position: "relative",
        overflow: "hidden",
        transition: "all 0.18s ease",
        outline: "none",
        boxShadow: hover && !c.solved ? `0 0 0 1px ${meta.color}22, inset 0 0 40px ${meta.color}08` : "none",
      }}
    >
      {c.solved && (
        <div style={{
          position: "absolute", top: 8, right: 8,
          width: 18, height: 18, borderRadius: "50%",
          background: PALETTE.solvedBorder,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 10, color: PALETTE.solvedText, fontWeight: 700,
        }}>✓</div>
      )}
      <div style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 9, letterSpacing: 2,
        color: meta.color, marginBottom: 5,
        textTransform: "uppercase",
      }}>{c.cat} · {c.floor}</div>
      <div style={{
        fontFamily: "'Bebas Neue', display-swap",
        fontSize: 15, letterSpacing: 1.5,
        color: c.solved ? PALETTE.textDim : PALETTE.textBright,
        marginBottom: 8, lineHeight: 1.2,
      }}>{c.name}</div>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 22, fontWeight: 700,
        color: c.solved ? PALETTE.redDim : PALETTE.red,
        lineHeight: 1,
      }}>{c.pts}</div>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 9, color: PALETTE.textDim, marginTop: 3,
      }}>{c.solves} solve{c.solves !== 1 ? "s" : ""}</div>
      <DiffPips diff={c.diff} />
    </div>
  );
}

function StatCell({ label, value, sub, bar, barPct, accent }) {
  return (
    <div style={{
      padding: "16px 24px",
      borderRight: `1px solid ${PALETTE.border}`,
      flex: 1,
    }}>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 9, letterSpacing: 3, color: PALETTE.textDim,
        textTransform: "uppercase", marginBottom: 6,
      }}>{label}</div>
      <div style={{
        fontFamily: "'Bebas Neue', display-swap",
        fontSize: 30, fontWeight: 400, lineHeight: 1,
        color: accent ? PALETTE.red : PALETTE.textBright,
        letterSpacing: 1,
      }}>{value}</div>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 9, color: PALETTE.textDim, marginTop: 3,
      }}>{sub}</div>
      {bar && (
        <div style={{ height: 2, background: PALETTE.border, marginTop: 8, borderRadius: 1 }}>
          <div style={{
            height: "100%", width: `${barPct}%`,
            background: `linear-gradient(90deg, ${PALETTE.redDim}, ${PALETTE.red})`,
            borderRadius: 1, transition: "width 0.8s ease",
          }} />
        </div>
      )}
    </div>
  );
}

function LeaderRow({ rank, name, score, maxScore, isMe }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "7px 0", borderBottom: `1px solid ${PALETTE.border}`,
    }}>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10, fontWeight: 700,
        color: rank <= 3 ? PALETTE.red : PALETTE.textDim,
        width: 18, textAlign: "right", flexShrink: 0,
      }}>{rank}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: "'Bebas Neue', display-swap",
          fontSize: 13, letterSpacing: 1,
          color: isMe ? PALETTE.textBright : PALETTE.textDim,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>{name}{isMe ? " ◀" : ""}</div>
        <div style={{ height: 2, background: PALETTE.border, marginTop: 3, borderRadius: 1 }}>
          <div style={{
            height: "100%",
            width: `${maxScore > 0 ? Math.round((score / maxScore) * 100) : 0}%`,
            background: isMe ? PALETTE.red : PALETTE.redDim,
            borderRadius: 1, transition: "width 0.6s ease",
          }} />
        </div>
      </div>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11,
        color: rank === 1 ? PALETTE.red : PALETTE.textDim,
        flexShrink: 0,
      }}>{score.toLocaleString()}</div>
    </div>
  );
}

function Modal({ chall, onClose, onSolve }) {
  const [flag, setFlag] = useState("");
  const [shake, setShake] = useState(false);
  const [correct, setCorrect] = useState(false);
  const inputRef = useRef(null);
  const meta = CAT_META[chall.cat] || CAT_META.Misc;

  useEffect(() => {
    setFlag(""); setShake(false); setCorrect(false);
    setTimeout(() => inputRef.current?.focus(), 80);
  }, [chall.id]);

  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const submit = () => {
    if (!flag.trim()) return;
    if (flag.trim() === "PUCTF{fl4g_h3r3}" && !chall.solved) {
      setCorrect(true);
      setTimeout(() => { onSolve(chall.id); onClose(); }, 800);
    } else {
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.85)",
        display: "flex", alignItems: "center", justifyContent: "center",
        backdropFilter: "blur(2px)",
      }}
    >
      <div style={{
        background: PALETTE.card, border: `1px solid ${meta.color}44`,
        width: 520, maxWidth: "94vw",
        boxShadow: `0 0 60px ${meta.color}20, 0 0 0 1px ${meta.color}22`,
        animation: shake ? "shake 0.4s ease" : "none",
        position: "relative",
        overflow: "hidden",
      }}>
        <style>{`
          @keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-6px)} 40%{transform:translateX(6px)} 60%{transform:translateX(-4px)} 80%{transform:translateX(4px)} }
          @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
          @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=JetBrains+Mono:wght@400;700&display=swap');
        `}</style>

        <div style={{ height: 3, background: meta.color }} />

        <div style={{ padding: "20px 22px 14px", borderBottom: `1px solid ${PALETTE.border}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: 3, color: meta.color, textTransform: "uppercase", marginBottom: 4 }}>
              {chall.cat} // {chall.floor}
            </div>
            <div style={{ fontFamily: "'Bebas Neue', display-swap", fontSize: 22, letterSpacing: 2, color: PALETTE.textBright, textTransform: "uppercase" }}>
              {chall.name}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: "'Bebas Neue', display-swap", fontSize: 34, color: correct ? "#2d9b2d" : PALETTE.red, lineHeight: 1, transition: "color 0.3s" }}>
              {correct ? "✓" : chall.pts}
            </div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: PALETTE.textDim, letterSpacing: 1 }}>PTS</div>
          </div>
        </div>

        <button onClick={onClose} style={{
          position: "absolute", top: 14, right: 14,
          background: "none", border: "none", color: PALETTE.textDim,
          cursor: "pointer", fontSize: 16, lineHeight: 1,
          padding: "2px 6px", fontFamily: "'JetBrains Mono', monospace",
        }}>✕</button>

        <div style={{ padding: "16px 22px" }}>
          <div style={{
            fontFamily: "system-ui, sans-serif", fontSize: 13,
            color: PALETTE.textDim, lineHeight: 1.7, marginBottom: 16,
          }}>{chall.desc}</div>

          {chall.files.length > 0 && (
            <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
              {chall.files.map(f => (
                <div key={f} style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                  color: PALETTE.textDim, border: `1px solid ${PALETTE.border}`,
                  padding: "4px 10px", cursor: "pointer", display: "flex", gap: 5, alignItems: "center",
                  transition: "all 0.15s",
                }}>
                  <span style={{ fontSize: 11 }}>📁</span>{f}
                </div>
              ))}
            </div>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <input
              ref={inputRef}
              value={flag}
              onChange={e => setFlag(e.target.value)}
              onKeyDown={e => e.key === "Enter" && submit()}
              disabled={chall.solved || correct}
              placeholder={chall.solved ? "Already cleared ✓" : "PUCTF{...}"}
              style={{
                flex: 1, background: PALETTE.void,
                border: `1px solid ${shake ? PALETTE.red : PALETTE.border}`,
                color: PALETTE.text,
                fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
                padding: "10px 12px", outline: "none",
                transition: "border-color 0.15s",
              }}
            />
            <button
              onClick={submit}
              disabled={chall.solved || correct}
              style={{
                background: chall.solved ? PALETTE.border : PALETTE.red,
                color: "#fff", border: "none",
                fontFamily: "'Bebas Neue', display-swap",
                fontSize: 14, letterSpacing: 2,
                padding: "10px 20px", cursor: chall.solved ? "default" : "pointer",
                whiteSpace: "nowrap", transition: "background 0.15s",
              }}
            >Submit Flag</button>
          </div>
        </div>

        <div style={{
          borderTop: `1px solid ${PALETTE.border}`, padding: "10px 22px",
          display: "flex", gap: 20,
        }}>
          {[
            ["FLOOR", chall.floor],
            ["SOLVES", chall.solves],
            ["DIFFICULTY", DIFF_LABELS[chall.diff]],
          ].map(([k, v]) => (
            <div key={k} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: PALETTE.textDim, letterSpacing: 1 }}>
              {k}: <span style={{ color: PALETTE.textDim === PALETTE.textDim ? "#555570" : "#fff", fontWeight: 700 }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function CTFDashboard() {
  const [challenges, setChallenges] = useState(CHALLENGES);
  const [activeFloor, setActiveFloor] = useState("all");
  const [searchQ, setSearchQ] = useState("");
  const [modal, setModal] = useState(null);
  const [activity, setActivity] = useState(ACTIVITY_INIT);
  const { display, short } = useTicker(10032);

  const myScore = challenges.filter(c => c.solved).reduce((s, c) => s + c.pts, 0);
  const solvedCount = challenges.filter(c => c.solved).length;
  const maxScore = challenges.reduce((s, c) => s + c.pts, 0);

  const leaders = [...INITIAL_LEADERS, { name: "PortCityPredictors", score: myScore }]
    .sort((a, b) => b.score - a.score);
  const myRank = leaders.findIndex(l => l.name === "PortCityPredictors") + 1;
  const maxLbScore = leaders[0]?.score || 1;

  const ordinal = (n) => {
    const s = ["th","st","nd","rd"];
    const v = n % 100;
    return (s[(v-20)%10] || s[v] || s[0]);
  };

  const filteredChallenges = challenges.filter(c => {
    const matchFloor = activeFloor === "all" || c.floor === activeFloor;
    const q = searchQ.toLowerCase();
    const matchSearch = !q || c.name.toLowerCase().includes(q) || c.cat.toLowerCase().includes(q);
    return matchFloor && matchSearch;
  });

  const handleSolve = useCallback((id) => {
    setChallenges(prev => prev.map(c => {
      if (c.id !== id) return c;
      return { ...c, solved: true, solves: c.solves + 1 };
    }));
    const solved = challenges.find(c => c.id === id);
    if (solved) {
      setActivity(prev => [{
        team: "PortCityPredictors",
        chall: solved.name,
        type: "solve",
        ago: 0,
      }, ...prev.slice(0, 5)]);
    }
  }, [challenges]);

  const floorCounts = FLOORS.reduce((acc, f) => {
    acc[f] = challenges.filter(c => c.floor === f).length;
    return acc;
  }, {});
  const floorSolvedCounts = FLOORS.reduce((acc, f) => {
    acc[f] = challenges.filter(c => c.floor === f && c.solved).length;
    return acc;
  }, {});

  return (
    <div style={{
      background: PALETTE.void,
      color: PALETTE.text,
      minHeight: "100vh",
      fontFamily: "system-ui, -apple-system, sans-serif",
      position: "relative",
      overflow: "hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=JetBrains+Mono:wght@400;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: ${PALETTE.void}; }
        ::-webkit-scrollbar-thumb { background: ${PALETTE.border}; }
        button:focus-visible, [tabindex]:focus-visible { outline: 2px solid ${PALETTE.red}; outline-offset: 2px; }
        @media (prefers-reduced-motion: reduce) { *, *::before, *::after { transition: none !important; animation: none !important; } }
      `}</style>

      {/* SCANLINE OVERLAY */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
        background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.04) 2px, rgba(0,0,0,0.04) 4px)",
      }} />

      {/* HAZARD BANNER */}
      <div style={{
        background: "#e8b800", display: "flex", alignItems: "stretch",
        position: "relative", zIndex: 10,
      }}>
        <div style={{
          background: "repeating-linear-gradient(45deg, #111 0, #111 12px, #e8b800 12px, #e8b800 24px)",
          width: 44, flexShrink: 0,
        }} />
        <div style={{
          fontFamily: "'Bebas Neue', display-swap",
          fontSize: 13, letterSpacing: 3, color: "#111",
          padding: "9px 18px", flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          ⚠ PUC INTRACTF 2026 — ZOMBIE OUTBREAK FLOOR ESCAPE — CHALLENGE DASHBOARD ACTIVE
        </div>
        <div style={{
          background: "repeating-linear-gradient(45deg, #111 0, #111 12px, #e8b800 12px, #e8b800 24px)",
          width: 44, flexShrink: 0,
        }} />
      </div>

      {/* NAV */}
      <nav style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 24px", height: 54,
        borderBottom: `1px solid ${PALETTE.border}`,
        background: "rgba(5,5,7,0.98)",
        position: "relative", zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontFamily: "'Bebas Neue', display-swap", fontSize: 24, letterSpacing: 3, color: PALETTE.textBright }}>
            <span style={{ color: PALETTE.red }}>PUC</span> CTF
          </div>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
            color: PALETTE.textDim, border: `1px solid ${PALETTE.border}`,
            padding: "2px 6px", letterSpacing: 1,
          }}>2026</div>
        </div>

        <div style={{ display: "flex" }}>
          {["Challenges","Scoreboard","Teams","About"].map(tab => (
            <div key={tab} style={{
              fontFamily: "'Bebas Neue', display-swap",
              fontSize: 13, letterSpacing: 2, color: tab === "Challenges" ? PALETTE.red : PALETTE.textDim,
              padding: "0 16px", height: 54, display: "flex", alignItems: "center",
              cursor: "pointer", borderBottom: `2px solid ${tab === "Challenges" ? PALETTE.red : "transparent"}`,
              transition: "all 0.15s",
            }}>{tab}</div>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
            color: PALETTE.red, border: `1px solid ${PALETTE.redDim}`,
            padding: "4px 10px", letterSpacing: 1,
            background: `${PALETTE.red}10`,
          }}>{display}</div>
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            background: `${PALETTE.red}18`, border: `1px solid ${PALETTE.red}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "'Bebas Neue', display-swap", fontSize: 14,
            color: PALETTE.red, cursor: "pointer", letterSpacing: 1,
          }}>B</div>
        </div>
      </nav>

      {/* HERO */}
      <div style={{
        padding: "24px 24px 18px",
        borderBottom: `1px solid ${PALETTE.border}`,
        position: "relative", zIndex: 1,
      }}>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
          color: PALETTE.red, letterSpacing: 3, marginBottom: 6,
          textTransform: "uppercase",
        }}>// PREMIER UNIVERSITY CHITTAGONG — HAZARI LANE CAMPUS</div>
        <div style={{
          fontFamily: "'Bebas Neue', display-swap", fontSize: 38,
          letterSpacing: 4, color: PALETTE.textBright, textTransform: "uppercase", lineHeight: 1,
        }}>
          ZOMBIE OUTBREAK <span style={{ color: PALETTE.red }}>—</span> FLOOR ESCAPE
        </div>
        <div style={{
          marginTop: 6, fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10, color: PALETTE.textDim, letterSpacing: 1,
          display: "flex", gap: 16,
        }}>
          <span>PUCTF{"{"}<span style={{ color: PALETTE.red }}>fl4g_h3r3</span>{"}"}</span>
          <span style={{ color: PALETTE.border }}>|</span>
          <span>15 CHALLENGES</span>
          <span style={{ color: PALETTE.border }}>|</span>
          <span>5 FLOORS</span>
          <span style={{ color: PALETTE.border }}>|</span>
          <span style={{ color: PALETTE.amber }}>OUTBREAK STATUS: ACTIVE</span>
        </div>
      </div>

      {/* STATS ROW */}
      <div style={{ display: "flex", borderBottom: `1px solid ${PALETTE.border}`, position: "relative", zIndex: 1 }}>
        <StatCell label="// Your Score" value={myScore.toLocaleString()} sub="pts secured" bar barPct={Math.round(myScore/maxScore*100)} accent />
        <StatCell label="// Solved" value={`${solvedCount}/${challenges.length}`} sub="challenges cleared" bar barPct={Math.round(solvedCount/challenges.length*100)} />
        <StatCell label="// Global Rank" value={`${myRank}${ordinal(myRank)}`} sub={`of ${leaders.length + 39} teams`} />
        <StatCell label="// Time Left" value={short} sub="until lockdown" accent />
      </div>

      {/* MAIN CONTENT */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 270px", position: "relative", zIndex: 1 }}>

        {/* CHALLENGES PANEL */}
        <div style={{ padding: "18px 24px", borderRight: `1px solid ${PALETTE.border}` }}>

          {/* Panel header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ fontFamily: "'Bebas Neue', display-swap", fontSize: 14, letterSpacing: 3, color: PALETTE.textDim }}>
              <span style={{ color: PALETTE.red, marginRight: 8 }}>▸</span>CHALLENGES
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
              <input
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                placeholder="search challenges..."
                aria-label="Search challenges"
                style={{
                  background: PALETTE.void,
                  border: `1px solid ${PALETTE.border}`,
                  borderRight: "none",
                  color: PALETTE.text, height: 32, width: 200,
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
                  padding: "0 12px", outline: "none",
                }}
              />
              <div style={{
                width: 32, height: 32, background: PALETTE.card,
                border: `1px solid ${PALETTE.border}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: PALETTE.textDim, fontSize: 13,
              }}>⌕</div>
            </div>
          </div>

          {/* Floor Tabs */}
          <div style={{ display: "flex", borderBottom: `1px solid ${PALETTE.border}`, marginBottom: 16, overflowX: "auto" }}>
            {[{ key: "all", label: "All", count: challenges.length, solved: solvedCount }]
              .concat(FLOORS.map(f => ({ key: f, label: `Floor ${f[1]}`, count: floorCounts[f], solved: floorSolvedCounts[f] })))
              .map(tab => (
              <div
                key={tab.key}
                onClick={() => setActiveFloor(tab.key)}
                tabIndex={0}
                onKeyDown={e => e.key === "Enter" && setActiveFloor(tab.key)}
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10, letterSpacing: 2, color: activeFloor === tab.key ? PALETTE.textBright : PALETTE.textDim,
                  padding: "8px 14px", cursor: "pointer",
                  borderBottom: `2px solid ${activeFloor === tab.key ? PALETTE.red : "transparent"}`,
                  transition: "all 0.15s", whiteSpace: "nowrap", textTransform: "uppercase",
                  background: activeFloor === tab.key ? `${PALETTE.red}08` : "transparent",
                }}
              >
                {tab.label}
                <span style={{ marginLeft: 5, color: activeFloor === tab.key ? PALETTE.red : "#2a2a38" }}>
                  {tab.solved > 0 ? `${tab.solved}/${tab.count}` : tab.count}
                </span>
              </div>
            ))}
          </div>

          {/* Cards Grid */}
          {filteredChallenges.length === 0 ? (
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: PALETTE.textDim, textAlign: "center", padding: "40px 0", letterSpacing: 1 }}>
              No challenges match that search.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              {filteredChallenges.map(c => (
                <ChallengeCard key={c.id} c={c} onClick={setModal} />
              ))}
            </div>
          )}
        </div>

        {/* SIDEBAR */}
        <div style={{ padding: "18px 16px", overflowY: "auto" }}>

          {/* Facility Map */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: 3, color: PALETTE.textDim, textTransform: "uppercase", marginBottom: 10, paddingBottom: 6, borderBottom: `1px solid ${PALETTE.border}` }}>
              // Facility Map
            </div>
            <div style={{ border: `1px solid ${PALETTE.border}`, padding: 10, background: "#080808" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 4 }}>
                {FLOORS.map((f, i) => {
                  const allSolved = challenges.filter(c => c.floor === f).every(c => c.solved);
                  const anySolved = challenges.filter(c => c.floor === f).some(c => c.solved);
                  const isActive = f === "F3" || (anySolved && !allSolved);
                  const isClear = allSolved;
                  return (
                    <div key={f} style={{
                      aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center",
                      fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700,
                      background: isClear ? "#0a1a0a" : isActive ? `${PALETTE.red}18` : PALETTE.border + "30",
                      color: isClear ? PALETTE.solvedText : isActive ? PALETTE.red : PALETTE.textDim,
                      border: `1px solid ${isClear ? PALETTE.solvedBorder : isActive ? PALETTE.redDim : "transparent"}`,
                    }}>{f}</div>
                  );
                })}
              </div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: PALETTE.textDim, textAlign: "center", marginTop: 6, letterSpacing: 1 }}>
                CLEARED ░ ACTIVE ▓ LOCKED
              </div>
            </div>
          </div>

          {/* Leaderboard */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: 3, color: PALETTE.textDim, textTransform: "uppercase", marginBottom: 10, paddingBottom: 6, borderBottom: `1px solid ${PALETTE.border}` }}>
              // Leaderboard
            </div>
            {leaders.map((l, i) => (
              <LeaderRow key={l.name} rank={i+1} name={l.name} score={l.score} maxScore={maxLbScore} isMe={l.name === "PortCityPredictors"} />
            ))}
          </div>

          {/* Activity Feed */}
          <div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: 3, color: PALETTE.textDim, textTransform: "uppercase", marginBottom: 10, paddingBottom: 6, borderBottom: `1px solid ${PALETTE.border}` }}>
              // Live Activity
            </div>
            {activity.map((a, i) => (
              <div key={i} style={{ display: "flex", gap: 8, padding: "6px 0", borderBottom: `1px solid ${PALETTE.border}`, alignItems: "flex-start" }}>
                <div style={{
                  width: 6, height: 6, borderRadius: "50%", marginTop: 5, flexShrink: 0,
                  background: a.type === "solve" ? PALETTE.solvedText : PALETTE.redDim,
                  boxShadow: a.type === "solve" ? `0 0 4px ${PALETTE.solvedText}` : `0 0 4px ${PALETTE.redDim}`,
                }} />
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: PALETTE.textDim, lineHeight: 1.5, flex: 1 }}>
                  <span style={{ color: PALETTE.textDim === PALETTE.textDim ? "#888" : "#fff" }}>{a.team}</span>{" "}
                  {a.type === "solve" ? <span style={{ color: PALETTE.solvedText }}>solved</span> : <span style={{ color: PALETTE.redDim }}>failed</span>}
                  {" "}{a.chall}
                </div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: PALETTE.border, flexShrink: 0 }}>
                  {a.ago === 0 ? "now" : `${a.ago}m`}
                </div>
              </div>
            ))}
          </div>

          {/* Category Legend */}
          <div style={{ marginTop: 24 }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: 3, color: PALETTE.textDim, textTransform: "uppercase", marginBottom: 10, paddingBottom: 6, borderBottom: `1px solid ${PALETTE.border}` }}>
              // Categories
            </div>
            {Object.entries(CAT_META).map(([cat, meta]) => {
              const total = challenges.filter(c => c.cat === cat).length;
              const solved = challenges.filter(c => c.cat === cat && c.solved).length;
              return (
                <div key={cat} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: `1px solid ${PALETTE.border}` }}>
                  <div style={{ width: 3, height: 14, background: meta.color, flexShrink: 0, borderRadius: 1 }} />
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: PALETTE.textDim, flex: 1 }}>{cat}</div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: solved === total ? PALETTE.solvedText : PALETTE.textDim }}>
                    {solved}/{total}
                  </div>
                  <div style={{ width: 40, height: 2, background: PALETTE.border, borderRadius: 1 }}>
                    <div style={{ height: "100%", width: `${Math.round(solved/total*100)}%`, background: meta.color, borderRadius: 1, transition: "width 0.4s" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* MODAL */}
      {modal && (
        <Modal
          chall={challenges.find(c => c.id === modal.id) || modal}
          onClose={() => setModal(null)}
          onSolve={handleSolve}
        />
      )}
    </div>
  );
}
