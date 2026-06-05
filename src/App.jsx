import { useState, useEffect, useRef } from "react";
import { db, storage } from "./firebase";
import { ref, set, get, update, onValue } from "firebase/database";
import { ref as sRef, uploadBytes, getDownloadURL } from "firebase/storage";

// ─── Utils ───────────────────────────────────────────────────────
function genCode() { return Math.random().toString(36).slice(2, 7).toUpperCase(); }
function genUid() { return "u" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); }
function getVideoId(url) { const m = url.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/); return m ? m[1] : null; }
function fmt(s) { return `${Math.floor(s/60).toString().padStart(2,"0")}:${(s%60).toString().padStart(2,"0")}`; }
const COLORS = ["#7f77dd","#1d9e75","#d85a30","#d4537e","#378add","#ba7517","#e24b4a","#639922","#9b59b6","#16a085"];
function colorFor(n=""){let h=0;for(const c of n)h=(h*31+c.charCodeAt(0))%COLORS.length;return COLORS[h];}
function initials(n=""){return n.split(" ").map(w=>w[0]||"").join("").toUpperCase().slice(0,2)||"?";}

// ─── CSS ─────────────────────────────────────────────────────────
const CSS = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
:root{
  --bg:#12102a;--bg2:#1a1835;--surface:#211f42;--surface2:#2a2850;
  --border:#3a3860;--text:#e8e6f0;--muted:#8884aa;
  --accent:#7c4dff;--accent2:#5c35cc;--green:#1db974;--red:#e24b4a;--amber:#f0a500;
}
body{background:var(--bg);color:var(--text);font-family:'Segoe UI',system-ui,sans-serif;min-height:100vh;}
#root{min-height:100vh;}

/* Layout principal */
.game-layout{display:flex;min-height:100vh;}
.sidebar{width:220px;min-width:220px;background:var(--bg2);border-right:1px solid var(--border);display:flex;flex-direction:column;padding:16px 12px;gap:10px;position:sticky;top:0;height:100vh;overflow-y:auto;}
.main-area{flex:1;display:flex;flex-direction:column;min-width:0;}
.topbar{display:flex;align-items:center;justify-content:space-between;padding:14px 24px;border-bottom:1px solid var(--border);background:var(--bg2);}
.content{flex:1;padding:24px;max-width:780px;width:100%;margin:0 auto;}

/* Logo */
.logo{font-size:20px;font-weight:900;color:#fff;letter-spacing:-0.5px;margin-bottom:8px;text-align:center;}
.logo span{color:var(--accent);}

/* Scoreboard */
.score-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--muted);margin-bottom:4px;}
.score-row{display:flex;align-items:center;gap:8px;padding:7px 8px;border-radius:8px;transition:background .15s;}
.score-row.me{background:var(--surface);}
.score-avatar{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0;}
.score-name{flex:1;font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.score-pts{font-size:16px;font-weight:800;min-width:32px;text-align:right;}
.score-pts.pos{color:var(--green);}
.score-pts.neg{color:var(--red);}
.score-pts.zero{color:var(--muted);}
.voted-check{font-size:11px;color:var(--green);margin-left:2px;}

/* Boutons */
.btn{padding:10px 22px;border-radius:10px;border:none;cursor:pointer;font-size:14px;font-weight:600;transition:all .15s;}
.btn-primary{background:var(--accent);color:#fff;}
.btn-primary:hover{background:var(--accent2);}
.btn-primary:disabled{opacity:.4;cursor:not-allowed;}
.btn-outline{background:transparent;color:var(--text);border:1px solid var(--border);}
.btn-outline:hover{border-color:var(--accent);color:var(--accent);}
.btn-sm{padding:6px 14px;font-size:13px;border-radius:8px;}

/* Inputs */
input[type=text],input[type=url]{background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:10px 16px;color:var(--text);font-size:14px;outline:none;width:100%;}
input:focus{border-color:var(--accent);}
input::placeholder{color:var(--muted);}

/* Cards */
.card{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:20px 24px;}
.card+.card{margin-top:14px;}

/* Manche badge */
.manche-badge{font-size:22px;font-weight:900;letter-spacing:2px;text-transform:uppercase;color:#fff;}

/* Phase steps */
.phase-steps{display:flex;gap:6px;}
.phase-step{width:28px;height:4px;border-radius:2px;background:var(--surface2);}
.phase-step.done{background:var(--accent);}
.phase-step.current{background:var(--amber);}

/* Video */
.video-wrap{aspect-ratio:16/9;background:#000;border-radius:12px;overflow:hidden;border:2px solid var(--border);}
.video-wrap iframe{width:100%;height:100%;border:none;}
.video-placeholder{width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:var(--muted);font-size:14px;}

/* Player audio (phase vote) */
.audio-player-wrap{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px 20px;margin-top:14px;}
.audio-player-inner{display:flex;align-items:center;gap:14px;}
.play-circle{width:44px;height:44px;border-radius:50%;background:var(--accent);border:none;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:background .15s;}
.play-circle:hover{background:var(--accent2);}
.waveform{flex:1;height:40px;background:var(--surface2);border-radius:8px;overflow:hidden;position:relative;cursor:pointer;}
.wave-inner{display:flex;gap:2px;align-items:center;height:100%;padding:4px 8px;}
.wbar{width:3px;border-radius:2px;background:var(--accent);opacity:.6;flex-shrink:0;}
.wbar.played{opacity:1;}
.audio-meta{font-size:12px;margin-top:6px;display:flex;align-items:center;gap:8px;}
.live-dot{width:7px;height:7px;border-radius:50%;background:var(--green);animation:blink .8s infinite;}
@keyframes blink{0%,100%{opacity:1;}50%{opacity:.3;}}
.vote-controls{display:flex;align-items:center;gap:10px;margin-top:12px;justify-content:center;}
.vote-btn{display:flex;align-items:center;gap:6px;padding:8px 20px;border-radius:20px;border:1px solid var(--border);background:transparent;color:var(--muted);cursor:pointer;font-size:14px;font-weight:700;transition:all .15s;}
.vote-btn:hover:not(:disabled){border-color:var(--text);color:var(--text);}
.vote-btn.up.active{background:#1d9e7533;border-color:var(--green);color:var(--green);}
.vote-btn.down.active{background:#e24b4a33;border-color:var(--red);color:var(--red);}
.vote-btn:disabled{opacity:.4;cursor:not-allowed;}
.vote-count{font-size:13px;color:var(--muted);margin:0 4px;}
.author-label{font-size:13px;font-weight:700;color:#fff;}
.votes-progress{font-size:12px;color:var(--muted);}

/* Record */
.btn-record{width:60px;height:60px;border-radius:50%;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;flex-shrink:0;}
.btn-record.idle{background:var(--red);color:#fff;}
.btn-record.idle:hover{filter:brightness(1.1);transform:scale(1.05);}
.btn-record.recording{background:#ff6b6b;color:#fff;animation:pulse 1s infinite;}
@keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(226,75,74,.5);}50%{box-shadow:0 0 0 12px rgba(226,75,74,0);}}
.timer-big{font-size:28px;font-weight:900;font-variant-numeric:tabular-nums;}

/* Players chips */
.players-grid{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;}
.player-chip{display:flex;align-items:center;gap:7px;background:var(--surface2);border:1px solid var(--border);border-radius:20px;padding:5px 12px 5px 5px;font-size:13px;}
.player-chip.ready{border-color:var(--green);}
.rdot{width:7px;height:7px;border-radius:50%;background:var(--muted);}
.rdot.on{background:var(--green);}

/* Home */
.home-wrap{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;}
.home-card{width:100%;max-width:420px;display:flex;flex-direction:column;gap:14px;}
.big-code{font-size:52px;font-weight:900;letter-spacing:10px;color:#fff;background:var(--surface2);border-radius:14px;padding:18px 32px;text-align:center;border:1px solid var(--border);}
.divider{display:flex;align-items:center;gap:12px;}
.divider-line{flex:1;height:1px;background:var(--border);}

/* Toast */
.toast{position:fixed;bottom:20px;right:20px;background:var(--accent);color:#fff;padding:10px 18px;border-radius:10px;font-size:13px;font-weight:600;z-index:999;opacity:0;transform:translateY(10px);transition:all .3s;pointer-events:none;}
.toast.show{opacity:1;transform:translateY(0);}

/* Misc */
.muted{color:var(--muted);font-size:13px;}
.row{display:flex;align-items:center;gap:10px;}
.flex1{flex:1;}
.gap-8{display:flex;flex-direction:column;gap:8px;}
.gap-12{display:flex;flex-direction:column;gap:12px;}
.section-title{font-size:16px;font-weight:700;margin-bottom:14px;}
.center{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;}
.waiting{text-align:center;color:var(--muted);font-size:14px;padding:20px 0;}
.spinner{width:28px;height:28px;border:3px solid var(--surface2);border-top-color:var(--accent);border-radius:50%;animation:spin .7s linear infinite;}
@keyframes spin{to{transform:rotate(360deg);}}
.result-row{display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--border);}
.result-row:last-child{border-bottom:none;}
.rank-num{font-size:22px;min-width:36px;text-align:center;}
.bar-bg{height:6px;background:var(--surface2);border-radius:3px;overflow:hidden;margin-top:5px;width:100%;}
.bar-fill{height:100%;background:var(--accent);border-radius:3px;transition:width .9s ease;}
`;

// ─── App ─────────────────────────────────────────────────────────
export default function App() {
  const [myUid] = useState(() => {
    let u = localStorage.getItem("dlb_uid");
    if (!u) { u = genUid(); localStorage.setItem("dlb_uid", u); }
    return u;
  });
  const [myName, setMyName] = useState(localStorage.getItem("dlb_name") || "");
  const [screen, setScreen] = useState("home");
  const [roomCode, setRoomCode] = useState("");
  const [joinInput, setJoinInput] = useState("");
  const [room, setRoom] = useState(null);
  const [toast, setToast] = useState("");
  const toastRef = useRef(null);

  useEffect(() => {
    const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s);
    return () => document.head.removeChild(s);
  }, []);

  function showToast(msg) {
    setToast(msg); clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(""), 2800);
  }

  useEffect(() => {
    if (!roomCode) return;
    const unsub = onValue(ref(db, `rooms/${roomCode}`), snap => {
      if (snap.exists()) setRoom(snap.val());
      else { setRoom(null); setScreen("home"); showToast("Room fermée"); }
    });
    return () => unsub();
  }, [roomCode]);

  async function createRoom() {
    if (!myName.trim()) { showToast("Entre ton pseudo !"); return; }
    localStorage.setItem("dlb_name", myName);
    const code = genCode();
    await set(ref(db, `rooms/${code}`), {
      phase: "lobby", host: myUid, videoId: "", manche: 1,
      players: { [myUid]: { name: myName, score: 0 } },
      submissions: {}, voters: {}, currentSub: null, subQueue: [], subIndex: 0
    });
    setRoomCode(code); setScreen("game");
  }

  async function joinRoom() {
    if (!myName.trim()) { showToast("Entre ton pseudo !"); return; }
    const code = joinInput.trim().toUpperCase();
    if (!code) { showToast("Entre un code !"); return; }
    const snap = await get(ref(db, `rooms/${code}`));
    if (!snap.exists()) { showToast("Room introuvable !"); return; }
    localStorage.setItem("dlb_name", myName);
    await update(ref(db, `rooms/${code}/players/${myUid}`), { name: myName, score: 0 });
    setRoomCode(code); setScreen("game");
  }

  if (screen === "home") return (
    <div className="home-wrap">
      <div className="home-card">
        <div style={{ textAlign: "center", marginBottom: "8px" }}>
          <div className="logo" style={{ fontSize: "36px" }}>Doub<span>LAB</span></div>
          <p className="muted" style={{ marginTop: "6px" }}>Doublage entre amis • en temps réel</p>
        </div>
        <div className="card gap-8">
          <label className="muted">Ton pseudo</label>
          <input type="text" placeholder="Ex: Nico" value={myName} onChange={e => setMyName(e.target.value)} onKeyDown={e => e.key === "Enter" && createRoom()} />
        </div>
        <button className="btn btn-primary" style={{ width: "100%", padding: "14px" }} onClick={createRoom}>Créer une room</button>
        <div className="divider"><div className="divider-line" /><span className="muted">ou</span><div className="divider-line" /></div>
        <div className="card gap-8">
          <input type="text" placeholder="CODE DE ROOM" value={joinInput}
            onChange={e => setJoinInput(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === "Enter" && joinRoom()}
            style={{ textTransform: "uppercase", letterSpacing: "4px", textAlign: "center", fontSize: "22px", fontWeight: 800 }} />
          <button className="btn btn-outline" onClick={joinRoom}>Rejoindre</button>
        </div>
      </div>
      <div className={`toast ${toast ? "show" : ""}`}>{toast}</div>
    </div>
  );

  if (!room) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}><div className="spinner" /></div>;

  const phase = room.phase || "lobby";
  const players = room.players || {};
  const isHost = room.host === myUid;
  const manche = room.manche || 1;
  const PHASES = ["lobby", "video", "record", "vote", "results"];
  const phaseIdx = PHASES.indexOf(phase);

  // Scoreboard trié
  const sortedPlayers = Object.entries(players).sort(([, a], [, b]) => (b.score || 0) - (a.score || 0));

  return (
    <div className="game-layout">
      {/* SIDEBAR SCOREBOARD */}
      <div className="sidebar">
        <div className="logo">Doub<span>LAB</span></div>
        <div className="score-title">Score • Manche {manche}</div>
        {sortedPlayers.map(([uid, p], i) => {
          const pts = p.score || 0;
          return (
            <div key={uid} className={`score-row ${uid === myUid ? "me" : ""}`}>
              <div className="score-avatar" style={{ background: colorFor(p.name) + "33", color: colorFor(p.name) }}>
                {initials(p.name)}
              </div>
              <div className="score-name">{p.name}{uid === room.host ? " 👑" : ""}</div>
              <div className={`score-pts ${pts > 0 ? "pos" : pts < 0 ? "neg" : "zero"}`}>{pts > 0 ? `+${pts}` : pts}</div>
            </div>
          );
        })}
        <div style={{ flex: 1 }} />
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: "10px" }}>
          <div className="muted" style={{ textAlign: "center", fontSize: "11px" }}>Room : {roomCode}</div>
        </div>
      </div>

      {/* MAIN */}
      <div className="main-area">
        <div className="topbar">
          <div className="manche-badge">Manche {manche}</div>
          <div className="phase-steps">
            {PHASES.map((p, i) => (
              <div key={p} className={`phase-step ${i < phaseIdx ? "done" : i === phaseIdx ? "current" : ""}`} title={["Lobby","Vidéo","Enreg.","Vote","Résultats"][i]} />
            ))}
          </div>
          <div className="muted">{Object.keys(players).length} joueur{Object.keys(players).length > 1 ? "s" : ""}</div>
        </div>
        <div className="content">
          {phase === "lobby" && <LobbyPhase room={room} roomCode={roomCode} myUid={myUid} isHost={isHost} players={players} showToast={showToast} />}
          {phase === "video" && <VideoPhase room={room} roomCode={roomCode} myUid={myUid} isHost={isHost} showToast={showToast} />}
          {phase === "record" && <RecordPhase room={room} roomCode={roomCode} myUid={myUid} isHost={isHost} players={players} showToast={showToast} />}
          {phase === "vote" && <VotePhase room={room} roomCode={roomCode} myUid={myUid} isHost={isHost} players={players} showToast={showToast} />}
          {phase === "results" && <ResultsPhase room={room} roomCode={roomCode} myUid={myUid} isHost={isHost} players={players} showToast={showToast} />}
        </div>
      </div>
      <div className={`toast ${toast ? "show" : ""}`}>{toast}</div>
    </div>
  );
}

// ─── LOBBY ───────────────────────────────────────────────────────
function LobbyPhase({ room, roomCode, myUid, isHost, players, showToast }) {
  async function start() {
    await update(ref(db, `rooms/${roomCode}`), { phase: "video" });
  }
  return (
    <div className="center" style={{ minHeight: "60vh" }}>
      <div>
        <p className="muted" style={{ textAlign: "center", marginBottom: "10px" }}>Partage ce code à tes amis</p>
        <div className="big-code">{roomCode}</div>
      </div>
      <div className="card" style={{ width: "100%", maxWidth: "480px" }}>
        <div className="section-title">Joueurs connectés ({Object.keys(players).length})</div>
        <div className="players-grid">
          {Object.entries(players).map(([uid, p]) => (
            <div key={uid} className="player-chip">
              <div className="score-avatar" style={{ width: 28, height: 28, fontSize: 11, background: colorFor(p.name) + "33", color: colorFor(p.name) }}>{initials(p.name)}</div>
              {p.name}{uid === room.host ? " 👑" : ""}
            </div>
          ))}
        </div>
        {isHost
          ? <button className="btn btn-primary" style={{ width: "100%", marginTop: "16px" }} onClick={start} disabled={Object.keys(players).length < 1}>Tout le monde est là →</button>
          : <p className="waiting">En attente du host…</p>}
      </div>
    </div>
  );
}

// ─── VIDEO ───────────────────────────────────────────────────────
function VideoPhase({ room, roomCode, myUid, isHost, showToast }) {
  const [urlInput, setUrlInput] = useState("");

  async function loadVideo() {
    const id = getVideoId(urlInput);
    if (!id) { showToast("URL YouTube invalide"); return; }
    await update(ref(db, `rooms/${roomCode}`), { videoId: id });
  }

  async function startRecord() {
    if (!room.videoId) { showToast("Charge une vidéo d'abord !"); return; }
    const updates = {};
    Object.keys(room.players || {}).forEach(uid => {
      updates[`rooms/${roomCode}/players/${uid}/hasRecorded`] = false;
    });
    updates[`rooms/${roomCode}/phase`] = "record";
    updates[`rooms/${roomCode}/submissions`] = {};
    updates[`rooms/${roomCode}/voters`] = {};
    updates[`rooms/${roomCode}/subIndex`] = 0;
    updates[`rooms/${roomCode}/currentSub`] = null;
    updates[`rooms/${roomCode}/playStartAt`] = null;
    await update(ref(db), updates);
  }

  return (
    <div>
      {room.videoId
        ? <div className="video-wrap" style={{ marginBottom: "16px" }}><iframe src={`https://www.youtube.com/embed/${room.videoId}?autoplay=1&mute=0`} allowFullScreen allow="autoplay" /></div>
        : <div className="video-wrap" style={{ marginBottom: "16px", minHeight: "280px" }}><div className="video-placeholder"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"><rect x="2" y="5" width="20" height="14" rx="3"/><path d="M10 9l5 3-5 3V9z"/></svg><span>Aucune vidéo chargée</span></div></div>
      }
      {isHost
        ? <div className="card">
            <div className="section-title">Choisir la vidéo à doubler</div>
            <div className="row" style={{ marginBottom: "12px" }}>
              <input type="url" placeholder="URL YouTube…" value={urlInput} onChange={e => setUrlInput(e.target.value)} onKeyDown={e => e.key === "Enter" && loadVideo()} />
              <button className="btn btn-outline btn-sm" onClick={loadVideo} style={{ whiteSpace: "nowrap" }}>Charger</button>
            </div>
            {room.videoId && <button className="btn btn-primary" style={{ width: "100%" }} onClick={startRecord}>Lancer l'enregistrement →</button>}
          </div>
        : <div className="card"><p className="waiting">{room.videoId ? "En attente que le host lance l'enregistrement…" : "Le host choisit la vidéo…"}</p></div>
      }
    </div>
  );
}

// ─── RECORD ───────────────────────────────────────────────────────
function RecordPhase({ room, roomCode, myUid, isHost, players, showToast }) {
  const [recording, setRecording] = useState(false);
  const [timer, setTimer] = useState(0);
  const [audioUrl, setAudioUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const recRef = useRef(null); const streamRef = useRef(null);
  const chunksRef = useRef([]); const timerRef = useRef(null);
  const hasRecorded = room?.players?.[myUid]?.hasRecorded;
  const recordedCount = Object.values(players).filter(p => p.hasRecorded).length;
  const allDone = recordedCount === Object.keys(players).length;

  async function startRec() {
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      recRef.current = new MediaRecorder(streamRef.current);
      recRef.current.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recRef.current.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioUrl(URL.createObjectURL(blob));
        setUploading(true);
        try {
          const fileRef = sRef(storage, `doublages/${roomCode}/m${room.manche || 1}_${myUid}.webm`);
          await uploadBytes(fileRef, blob);
          const dlUrl = await getDownloadURL(fileRef);
          const myName = room?.players?.[myUid]?.name || "?";
          await update(ref(db, `rooms/${roomCode}/submissions/${myUid}`), { name: myName, audioUrl: dlUrl, votes: 0, uid: myUid });
          await update(ref(db, `rooms/${roomCode}/players/${myUid}`), { hasRecorded: true });
          showToast("Doublage envoyé ! 🎙️");
        } catch (e) { showToast("Erreur upload"); console.error(e); }
        setUploading(false);
      };
      recRef.current.start();
      setRecording(true); setTimer(0);
      timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
    } catch { showToast("Micro non accessible"); }
  }

  function stopRec() {
    recRef.current?.stop(); streamRef.current?.getTracks().forEach(t => t.stop());
    clearInterval(timerRef.current); setRecording(false);
  }

  async function goToVote() {
    const subs = room.submissions || {};
    const queue = Object.keys(subs);
    if (!queue.length) { showToast("Aucun doublage soumis !"); return; }
    await update(ref(db, `rooms/${roomCode}`), {
      phase: "vote", subQueue: queue, subIndex: 0,
      currentSub: queue[0], playStartAt: Date.now()
    });
  }

  return (
    <div>
      {room.videoId && <div className="video-wrap" style={{ marginBottom: "14px" }}><iframe src={`https://www.youtube.com/embed/${room.videoId}`} allowFullScreen /></div>}
      <div className="card" style={{ marginBottom: "14px" }}>
        <div className="section-title">Enregistre ton doublage</div>
        {hasRecorded
          ? <div className="center" style={{ padding: "12px 0" }}>
              <span style={{ fontSize: "36px" }}>✅</span>
              <p style={{ color: "var(--green)", fontWeight: 700 }}>Doublage envoyé !</p>
              <p className="muted">En attente des autres…</p>
            </div>
          : <div className="row" style={{ flexWrap: "wrap", gap: "16px" }}>
              <button className={`btn-record ${recording ? "recording" : "idle"}`} onClick={recording ? stopRec : startRec}>
                {recording
                  ? <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="5" width="14" height="14" rx="2"/></svg>
                  : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>}
              </button>
              <div>
                <div className="timer-big">{fmt(timer)}</div>
                <p className="muted" style={{ marginTop: "4px" }}>{recording ? "🔴 En cours…" : audioUrl ? "Prêt — relance ou stoppe" : "Clique le micro"}</p>
              </div>
              {uploading && <div className="spinner" />}
            </div>
        }
      </div>
      <div className="card">
        <div className="row" style={{ marginBottom: "10px" }}>
          <span className="section-title" style={{ margin: 0, flex: 1 }}>Joueurs</span>
          <span className="muted">{recordedCount}/{Object.keys(players).length} prêts</span>
        </div>
        <div className="players-grid">
          {Object.entries(players).map(([uid, p]) => (
            <div key={uid} className={`player-chip ${p.hasRecorded ? "ready" : ""}`}>
              <div className="score-avatar" style={{ width: 28, height: 28, fontSize: 11, background: colorFor(p.name) + "33", color: colorFor(p.name) }}>{initials(p.name)}</div>
              {p.name}<div className={`rdot ${p.hasRecorded ? "on" : ""}`} />
            </div>
          ))}
        </div>
        {isHost
          ? <button className="btn btn-primary" style={{ marginTop: "14px", width: "100%" }} onClick={goToVote} disabled={recordedCount === 0}>
              {allDone ? "Tout le monde a enregistré → Passer au vote" : `Passer au vote (${recordedCount}/${Object.keys(players).length})`}
            </button>
          : <p className="waiting">En attente que le host lance le vote…</p>}
      </div>
    </div>
  );
}

// ─── VOTE (écoute syncée) ─────────────────────────────────────────
function VotePhase({ room, roomCode, myUid, isHost, players, showToast }) {
  const submissions = room?.submissions || {};
  const queue = room?.subQueue || [];
  const subIndex = room?.subIndex ?? 0;
  const currentSub = room?.currentSub;
  const sub = currentSub ? submissions[currentSub] : null;
  const playStartAt = room?.playStartAt || null;

  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [myVote, setMyVote] = useState(null); // "up" | "down" | null
  const audioRef = useRef(null);
  const animRef = useRef(null);
  const hasVotedRef = useRef({});

  const voterCount = Object.keys(room?.voters || {}).filter(uid => room.voters[uid]?.voted).length;

  // Reset vote quand on change de sub
  useEffect(() => {
    const key = `${myUid}_${currentSub}`;
    if (!hasVotedRef.current[key]) setMyVote(null);
    else setMyVote(hasVotedRef.current[key]);
  }, [currentSub]);

  // Joue l'audio syncé avec playStartAt
  useEffect(() => {
    if (!sub?.audioUrl || !playStartAt) return;
    const audio = new Audio(sub.audioUrl);
    audioRef.current = audio;
    audio.onloadedmetadata = () => {
      setDuration(audio.duration);
      const elapsed = (Date.now() - playStartAt) / 1000;
      if (elapsed < audio.duration) {
        audio.currentTime = Math.max(0, elapsed);
        audio.play().catch(() => {});
      }
    };
    audio.ontimeupdate = () => setProgress(audio.currentTime);
    audio.onended = () => { setProgress(0); };
    return () => { audio.pause(); audio.src = ""; };
  }, [sub?.audioUrl, playStartAt]);

  async function vote(dir) {
    if (!currentSub || !sub) return;
    const key = `${myUid}_${currentSub}`;
    if (hasVotedRef.current[key]) return;
    hasVotedRef.current[key] = dir;
    setMyVote(dir);
    const delta = dir === "up" ? 1 : -1;
    const newVotes = (sub.votes || 0) + delta;
    // Points au joueur qui a soumis
    const subOwner = currentSub;
    const ownerScore = (room?.players?.[subOwner]?.score || 0) + delta;
    await update(ref(db), {
      [`rooms/${roomCode}/submissions/${currentSub}/votes`]: newVotes,
      [`rooms/${roomCode}/players/${subOwner}/score`]: ownerScore,
      [`rooms/${roomCode}/voters/${myUid}/voted`]: true,
      [`rooms/${roomCode}/voters/${myUid}/votedFor`]: currentSub,
    });
    showToast(dir === "up" ? "👍 +1 point !" : "👎 -1 point");
  }

  async function nextSub() {
    const nextIdx = subIndex + 1;
    if (nextIdx >= queue.length) {
      await update(ref(db, `rooms/${roomCode}`), { phase: "results" });
    } else {
      await update(ref(db, `rooms/${roomCode}`), {
        subIndex: nextIdx,
        currentSub: queue[nextIdx],
        playStartAt: Date.now(),
        voters: {}
      });
    }
  }

  const isOwn = currentSub === myUid;
  const bars = Array.from({ length: 32 }, (_, i) => 8 + Math.floor(Math.sin(i * 0.7) * 8 + Math.random() * 8));
  const progressPct = duration > 0 ? progress / duration : 0;
  const playedBars = Math.round(progressPct * bars.length);

  return (
    <div>
      {room.videoId && <div className="video-wrap" style={{ marginBottom: "14px" }}><iframe src={`https://www.youtube.com/embed/${room.videoId}`} allowFullScreen /></div>}

      <div className="audio-player-wrap">
        {!sub
          ? <p className="waiting">En attente du doublage…</p>
          : <>
              <div className="audio-player-inner">
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: colorFor(sub.name) + "44", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontSize: "16px", fontWeight: 800, color: colorFor(sub.name) }}>{initials(sub.name)}</span>
                </div>
                <div className="flex1">
                  <div className="waveform">
                    <div className="wave-inner">
                      {bars.map((h, i) => <div key={i} className={`wbar ${i < playedBars ? "played" : ""}`} style={{ height: h }} />)}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: "right", minWidth: "60px" }}>
                  <div style={{ fontWeight: 800, fontSize: "16px" }}>{fmt(Math.floor(progress))}</div>
                  <div className="muted">{fmt(Math.floor(duration))}</div>
                </div>
              </div>
              <div className="audio-meta">
                <div className="live-dot" />
                <span className="author-label">{sub.name}</span>
                <span className="muted">• Lecture en cours</span>
                <span className="muted" style={{ marginLeft: "auto" }}>Votes : {voterCount}/{Object.keys(players).length - 1}</span>
              </div>

              {!isOwn
                ? <div className="vote-controls">
                    <button className={`vote-btn up ${myVote === "up" ? "active" : ""}`} onClick={() => vote("up")} disabled={!!myVote}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
                      +1
                    </button>
                    <span className="vote-count" style={{ fontSize: "18px", fontWeight: 800, color: sub.votes > 0 ? "var(--green)" : sub.votes < 0 ? "var(--red)" : "var(--muted)" }}>
                      {sub.votes > 0 ? `+${sub.votes}` : sub.votes}
                    </span>
                    <button className={`vote-btn down ${myVote === "down" ? "active" : ""}`} onClick={() => vote("down")} disabled={!!myVote}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/><path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/></svg>
                      -1
                    </button>
                  </div>
                : <p className="waiting" style={{ padding: "10px 0" }}>C'est ton doublage — tu ne peux pas voter pour toi 😄</p>
              }
            </>
        }
      </div>

      <div style={{ marginTop: "10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div className="muted">Doublage {subIndex + 1} / {queue.length}</div>
        {isHost && <button className="btn btn-primary btn-sm" onClick={nextSub}>
          {subIndex + 1 >= queue.length ? "Voir les résultats →" : "Doublage suivant →"}
        </button>}
        {!isHost && <p className="muted">En attente du host…</p>}
      </div>
    </div>
  );
}

// ─── RÉSULTATS ────────────────────────────────────────────────────
function ResultsPhase({ room, roomCode, myUid, isHost, players, showToast }) {
  const submissions = room?.submissions || {};
  const sorted = Object.entries(submissions).sort(([, a], [, b]) => (b.votes || 0) - (a.votes || 0));
  const maxVotes = Math.max(...sorted.map(([, s]) => Math.abs(s.votes || 0)), 1);
  const RANKS = ["🥇", "🥈", "🥉"];
  const [playing, setPlaying] = useState(null);
  const audioRef = useRef(null);

  function playAudio(url, uid) {
    audioRef.current?.pause();
    if (playing === uid) { setPlaying(null); return; }
    const a = new Audio(url); a.play();
    audioRef.current = a;
    a.onended = () => setPlaying(null);
    setPlaying(uid);
  }

  async function nextManche() {
    const nextM = (room.manche || 1) + 1;
    const updates = {};
    Object.keys(players).forEach(uid => {
      updates[`rooms/${roomCode}/players/${uid}/hasRecorded`] = false;
    });
    updates[`rooms/${roomCode}/phase`] = "video";
    updates[`rooms/${roomCode}/videoId`] = "";
    updates[`rooms/${roomCode}/submissions`] = {};
    updates[`rooms/${roomCode}/voters`] = {};
    updates[`rooms/${roomCode}/manche`] = nextM;
    updates[`rooms/${roomCode}/subQueue`] = [];
    updates[`rooms/${roomCode}/subIndex`] = 0;
    updates[`rooms/${roomCode}/currentSub`] = null;
    updates[`rooms/${roomCode}/playStartAt`] = null;
    await update(ref(db), updates);
  }

  return (
    <div>
      <div className="card">
        <div className="section-title" style={{ textAlign: "center", fontSize: "20px" }}>🏆 Résultats — Manche {room.manche || 1}</div>
        {sorted.map(([uid, s], i) => (
          <div key={uid} className="result-row">
            <div className="rank-num">{i < 3 ? RANKS[i] : i + 1}</div>
            <div className="score-avatar" style={{ background: colorFor(s.name) + "33", color: colorFor(s.name) }}>{initials(s.name)}</div>
            <div className="flex1">
              <div style={{ fontWeight: 700 }}>{s.name}</div>
              <div className="bar-bg">
                <div className="bar-fill" style={{ width: `${Math.round((Math.abs(s.votes || 0) / maxVotes) * 100)}%`, background: (s.votes || 0) >= 0 ? "var(--green)" : "var(--red)" }} />
              </div>
            </div>
            <div style={{ fontWeight: 900, fontSize: "20px", minWidth: "48px", textAlign: "right", color: (s.votes || 0) > 0 ? "var(--green)" : (s.votes || 0) < 0 ? "var(--red)" : "var(--muted)" }}>
              {(s.votes || 0) > 0 ? `+${s.votes}` : s.votes || 0}
            </div>
            <button className="btn btn-outline btn-sm" onClick={() => playAudio(s.audioUrl, uid)} style={{ minWidth: 40 }}>
              {playing === uid ? "⏹" : "▶"}
            </button>
          </div>
        ))}
      </div>
      {isHost && (
        <button className="btn btn-primary" style={{ marginTop: "16px", width: "100%" }} onClick={nextManche}>
          🔄 Manche suivante →
        </button>
      )}
      {!isHost && <p className="waiting">En attente de la prochaine manche…</p>}
    </div>
  );
}
