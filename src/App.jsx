import { useState, useRef, useEffect, useCallback } from "react";

const COLORS = {
  intro:"#4A90D9", verse:"#7ED321", "pre-chorus":"#27AE60",
  chorus:"#F5A623", "post-chorus":"#E67E22", bridge:"#9B59B6",
  inst:"#1ABC9C", solo:"#E74C3C", break:"#7F8C8D", outro:"#E74C3C", end:"#3A3A3A",
  marker:"#aaaaaa"
};
const LABELS = ["Intro","Verse","Pre-Chorus","Chorus","Post-Chorus","Bridge","Inst","Solo","Break","Outro","End"];

const FPS_OPTIONS = [
  { label: "23.976", value: 24000/1001 },
  { label: "24",     value: 24 },
  { label: "25",     value: 25 },
  { label: "29.97",  value: 30000/1001 },
  { label: "30",     value: 30 },
  { label: "50",     value: 50 },
  { label: "59.94",  value: 60000/1001 },
  { label: "60",     value: 60 },
];

const msToTc = (ms, fps = 25) => {
  ms = Math.max(0, ms);
  const totalFrames = Math.floor(ms / 1000 * fps);
  const f = totalFrames % Math.round(fps);
  const totalSec = Math.floor(ms / 1000);
  const s = totalSec % 60;
  const totalMin = Math.floor(totalSec / 60);
  const m = totalMin % 60;
  const h = Math.floor(totalMin / 60);
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}:${String(f).padStart(2,'0')}`;
};
const fmtDur = s => `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;

// ── SVG Transport Icons ───────────────────────────────────────────────────────
const IcoSkipBack = () => <svg width="11" height="11" viewBox="0 0 11 11" fill="currentColor"><rect x="0" y="0" width="1.5" height="11"/><polygon points="11,0 11,11 2,5.5"/></svg>;
const IcoSkipFwd  = () => <svg width="11" height="11" viewBox="0 0 11 11" fill="currentColor"><rect x="9.5" y="0" width="1.5" height="11"/><polygon points="0,0 0,11 9,5.5"/></svg>;
const IcoStop     = () => <svg width="9" height="9" viewBox="0 0 9 9" fill="currentColor"><rect x="0" y="0" width="9" height="9"/></svg>;
const IcoPlay     = () => <svg width="10" height="11" viewBox="0 0 10 11" fill="currentColor"><polygon points="0,0 0,11 10,5.5"/></svg>;
const IcoPause    = () => <svg width="10" height="11" viewBox="0 0 10 11" fill="currentColor"><rect x="0" y="0" width="3.5" height="11"/><rect x="6.5" y="0" width="3.5" height="11"/></svg>;
const IcoPrevMark = () => <svg width="12" height="11" viewBox="0 0 12 11" fill="currentColor"><polygon points="6,0 6,11 0,5.5"/><polygon points="12,0 12,11 6,5.5"/></svg>;
const IcoNextMark = () => <svg width="12" height="11" viewBox="0 0 12 11" fill="currentColor"><polygon points="0,0 0,11 6,5.5"/><polygon points="6,0 6,11 12,5.5"/></svg>;

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600&family=IBM+Plex+Sans:wght@300;400;500&display=swap');
html,body{margin:0;padding:0;height:100%;width:100%;overflow:hidden}
*{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#1a1a1a;--sur:#222;--rsd:#1e1e1e;
  --b1:#333;--b2:#3a3a3a;
  --tx:#d0d0d0;--mu:#888;--dim:#666;
  --ac:#F5A623;
  --mono:'IBM Plex Mono',monospace;
  --sans:'IBM Plex Sans',sans-serif;
}
.root{font-family:var(--mono);background:var(--bg);color:var(--tx);
  width:100vw;height:100vh;
  display:grid;grid-template-columns:240px 1fr 260px;grid-template-rows:48px 1fr;
  overflow:hidden;font-size:13px;user-select:none}

/* ── topbar ── */
.tb{grid-column:1/-1;background:var(--sur);border-bottom:1px solid var(--b1);
  display:flex;align-items:center;padding:0 18px;gap:12px}
.tb-logo{font-size:13px;font-weight:600;color:#fff;letter-spacing:.18em;
  display:flex;align-items:center;gap:8px;flex-shrink:0}
.tb-dot{width:7px;height:7px;border-radius:50%;background:var(--ac);box-shadow:0 0 8px var(--ac)}
.tb-ver{font-size:10px;color:var(--dim);letter-spacing:.1em}
.tb-pill{font-size:10px;letter-spacing:.13em;padding:3px 10px;border-radius:2px;border:1px solid;transition:all .15s;flex-shrink:0}
.tb-spacer{flex:1}
.btn-exp{font-family:var(--mono);font-size:10px;font-weight:600;letter-spacing:.15em;
  background:transparent;color:var(--ac);border:1px solid var(--ac);padding:5px 14px;
  border-radius:2px;cursor:pointer;transition:background .15s,color .15s;flex-shrink:0}
.btn-exp:hover{background:var(--ac);color:#000}

/* ── left ── */
.pl{background:var(--sur);border-right:1px solid var(--b1);display:flex;flex-direction:column;overflow:hidden}
.ph{padding:10px 14px;font-size:9px;letter-spacing:.2em;color:var(--mu);text-transform:uppercase;
  border-bottom:1px solid var(--b1);display:flex;justify-content:space-between;align-items:center;flex-shrink:0}
.drop-zone{margin:8px;border:1px dashed var(--b2);border-radius:2px;padding:14px 10px;
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;
  cursor:pointer;transition:border-color .15s,background .15s;flex-shrink:0;min-height:64px}
.drop-zone:hover,.drop-zone.over{border-color:var(--mu);background:rgba(255,255,255,.03)}
.drop-zone.over{border-color:var(--ac);border-style:solid}
.dz-icon{font-size:18px;color:var(--mu)}
.dz-label{font-size:9px;letter-spacing:.12em;color:var(--tx);text-align:center}
.dz-sub{font-size:8px;color:var(--dim);letter-spacing:.05em}
.sl{overflow-y:auto;flex:1}
.sr{padding:8px 12px 6px 12px;border-bottom:1px solid var(--b1);border-left:3px solid transparent;cursor:pointer;transition:background .08s}
.sr:hover{background:#2a2a2a}
.sr.on{background:var(--rsd);border-left-color:var(--ac)}
.sr-top{font-size:11px;font-weight:500;color:var(--mu);display:flex;justify-content:space-between;align-items:baseline;gap:4px;margin-bottom:2px}
.sr.on .sr-name{color:#eee}
.sr-dur{color:var(--dim);font-size:9px;flex-shrink:0}
.sr-wave{height:3px;background:#2a2a2a;border-radius:1px;margin-top:4px}
.sr:hover .sr-del{opacity:1 !important}
.sr-del:hover{color:#aaa !important}

/* ── center ── */
.pc{display:flex;flex-direction:column;overflow:hidden;background:var(--bg)}
.ctb{padding:0 18px;height:38px;border-bottom:1px solid var(--b1);
  display:flex;align-items:center;gap:10px;flex-shrink:0}
.ct{font-family:var(--sans);font-size:14px;font-weight:500;color:#eee}
.ca{font-family:var(--sans);font-size:12px;color:var(--mu)}
.cb{margin-left:auto;font-size:10px;color:var(--dim);letter-spacing:.08em}

/* ── waveform resizable ── */
.ww{flex-shrink:0;position:relative;overflow:hidden}
canvas.wc{width:100%;display:block;cursor:crosshair}
.ww-resize{position:absolute;bottom:0;left:0;right:0;height:5px;cursor:ns-resize;
  background:transparent;z-index:10}
.ww-resize:hover{background:rgba(255,255,255,.06)}
.ww-zoom{position:absolute;bottom:8px;right:10px;display:flex;align-items:center;gap:3px;z-index:20}
.btn-zoom{font-family:var(--mono);font-size:11px;background:rgba(0,0,0,.5);
  border:1px solid var(--b2);color:var(--mu);width:22px;height:20px;border-radius:2px;
  cursor:pointer;display:flex;align-items:center;justify-content:center;
  transition:color .1s,border-color .1s}
.btn-zoom:hover{color:var(--tx);border-color:var(--mu)}
.zoom-val{font-size:10px;color:var(--dim);min-width:30px;text-align:center}

/* ── transport ── */
.tr{padding:0 14px;height:36px;border-top:1px solid var(--b1);
  display:flex;align-items:center;gap:4px;flex-shrink:0;justify-content:flex-start}
.tc-display{display:flex;align-items:baseline;gap:6px;background:var(--rsd);
  border:1px solid var(--b2);border-radius:2px;padding:3px 10px;flex-shrink:0}
.tc-label{font-size:8px;letter-spacing:.18em;color:var(--dim);text-transform:uppercase}
.tc-val{font-size:14px;font-weight:500;color:var(--ac);letter-spacing:.02em;font-variant-numeric:tabular-nums}
.btn-tr{background:none;border:none;color:var(--mu);cursor:pointer;
  width:24px;height:22px;display:flex;align-items:center;justify-content:center;
  border-radius:2px;transition:color .1s;flex-shrink:0;padding:0}
.btn-tr:hover{color:var(--tx)}
.btn-tr.play-btn{border:1px solid var(--b2);width:28px;height:22px}
.btn-tr.play-btn:hover{border-color:var(--mu)}
.btn-tr.play-btn.on{border-color:var(--ac);color:var(--ac);background:rgba(245,166,35,.08)}
.btn-tr:disabled{opacity:.25;cursor:default;pointer-events:none}
.tsep{width:1px;height:14px;background:var(--b1);flex-shrink:0;margin:0 3px}
.tr-spacer{flex:1}
.tr-status{font-size:10px;letter-spacing:.1em;color:var(--dim);flex-shrink:0;margin-left:6px}
.fps-select{font-family:var(--mono);font-size:9px;background:var(--rsd);color:var(--mu);
  border:1px solid var(--b2);border-radius:2px;padding:2px 4px;cursor:pointer;
  outline:none;flex-shrink:0}
.fps-select:hover{border-color:var(--mu);color:var(--tx)}
.fps-select option{background:var(--sur)}
.mbs-row{padding:0 18px;height:28px;border-bottom:1px solid var(--b1);
  display:flex;align-items:center;gap:3px;flex-shrink:0}
.btn-m{font-family:var(--mono);flex:1;height:20px;background:none;border:none;
  border-bottom:2px solid;font-size:8px;letter-spacing:.05em;
  cursor:pointer;padding:0;min-width:0;white-space:nowrap;overflow:hidden;
  text-overflow:ellipsis;opacity:.45;transition:opacity .1s}
.btn-m:hover{opacity:1}

/* ── drop area (center) ── */
.va{flex:1;margin:10px 18px;background:#000;border:1px solid var(--b1);
  border-radius:3px;display:flex;align-items:center;justify-content:center;
  flex-direction:column;gap:6px;min-height:0;cursor:pointer;transition:border-color .15s;overflow:hidden}
.va:hover,.va.over{border-color:var(--mu)}
.va.over{border-color:var(--ac);background:rgba(245,166,35,.03)}
.vl{font-size:11px;letter-spacing:.18em;color:var(--mu);text-transform:uppercase}
.va-hint{font-size:10px;color:var(--dim);letter-spacing:.1em}

/* ── right ── */
.pr{background:var(--sur);border-left:1px solid var(--b1);display:flex;flex-direction:column;overflow:hidden}
.ml{overflow-y:auto;flex:1;display:flex;flex-direction:column}
.mr{display:flex;align-items:center;padding:0 8px 0 0;min-height:26px;
  border-bottom:1px solid #1e1e1e;border-left:3px solid transparent;
  cursor:pointer;transition:background .07s;flex:1}
.mr:hover{background:#282828}
.mr.act{border-left-color:var(--rc);background:#282828}
.mr.sel{background:var(--rsd)}
.mr-tc{font-size:10px;color:var(--mu);min-width:72px;padding-left:8px;
  flex-shrink:0;font-variant-numeric:tabular-nums;transition:color .1s;letter-spacing:0}
.mr.act .mr-tc{color:var(--ac);font-weight:500}
.mr-dot{width:5px;height:5px;border-radius:50%;flex-shrink:0;margin-right:6px}
.mr-name{font-family:var(--sans);font-size:11px;color:var(--mu);flex:1;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;transition:color .1s}
.mr.act .mr-name{color:#ddd}
.mr-del{background:none;border:none;color:var(--dim);cursor:pointer;
  font-size:14px;line-height:1;padding:0 3px;opacity:0;transition:opacity .1s;flex-shrink:0}
.mr:hover .mr-del{opacity:1}
.mr-del:hover{color:var(--tx)}

::-webkit-scrollbar{width:3px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:var(--b2);border-radius:2px}
`;

function WaveCanvas({ markers, playheadMs, totalMs, onSeek, zoom, height, waveformData, fps }) {
  const cvs  = useRef(null);
  const wrap = useRef(null);
  const [hover, setHover] = useState(null);

  const visibleMs = totalMs / zoom;
  const offsetMs  = Math.max(0, Math.min(playheadMs - visibleMs * 0.4, totalMs - visibleMs));

  useEffect(() => {
    const c = cvs.current; if (!c) return;
    const ctx = c.getContext("2d");
    const W = c.width, H = c.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#1a1a1a"; ctx.fillRect(0, 0, W, H);

    const msToX = ms => ((ms - offsetMs) / visibleMs) * W;

    // marker regions
    markers.forEach(m => {
      const x1 = msToX(m.ms), x2 = msToX(m.end_ms);
      if (x2 < 0 || x1 > W) return;
      ctx.fillStyle = m.color + "12";
      ctx.fillRect(Math.max(0, x1), 0, Math.min(W, x2) - Math.max(0, x1), H - 12);
      if (x1 >= 0 && x1 <= W) {
        ctx.fillStyle = m.color + "cc"; ctx.fillRect(x1, 0, 1, H - 12);
        ctx.font = "500 7px 'IBM Plex Mono',monospace";
        ctx.fillStyle = m.color + "88";
        ctx.fillText(m.label.toUpperCase(), x1 + 3, 10);
      }
    });

    // waveform
    const barH = H - 12, cy = barH / 2;
    if (waveformData && waveformData.length > 0) {
      // real waveform from decoded audio
      for (let i = 0; i < W; i += 2) {
        const tMs = offsetMs + (i / W) * visibleMs;
        const idx = Math.floor((tMs / totalMs) * waveformData.length);
        const amp = (waveformData[Math.min(idx, waveformData.length - 1)] || 0) * barH * 0.45 + 1;
        ctx.fillStyle = "#3a7a5a"; ctx.globalAlpha = .85;
        ctx.fillRect(i, cy - amp, 1.5, amp * 2);
      }
    } else {
      // placeholder waveform
      for (let i = 0; i < W; i += 2) {
        const tGlobal = (offsetMs + (i / W) * visibleMs) / totalMs;
        const w = Math.abs(Math.sin(tGlobal * Math.PI * 80) * .3 + Math.sin(tGlobal * Math.PI * 210) * .38 + Math.sin(tGlobal * Math.PI * 31) * .32);
        const amp = w * barH * .42 + 2;
        ctx.fillStyle = "#2a5040"; ctx.globalAlpha = .6;
        ctx.fillRect(i, cy - amp, 1.5, amp * 2);
      }
    }
    ctx.globalAlpha = 1;

    // ruler
    ctx.fillStyle = "#222"; ctx.fillRect(0, H - 16, W, 16);
    const step = visibleMs <= 30000 ? 5 : visibleMs <= 60000 ? 10 : 30;
    for (let s = 0; s <= Math.ceil(totalMs / 1000); s += step) {
      const rx = msToX(s * 1000);
      if (rx < 0 || rx > W) continue;
      ctx.fillStyle = "#555"; ctx.fillRect(rx, H - 16, 1, 4);
      ctx.font = "9px 'IBM Plex Mono',monospace"; ctx.fillStyle = "#666";
      ctx.fillText(msToTc(s * 1000, fps).slice(0, 8), rx + 3, H - 2);
    }

    // hover line
    if (hover !== null) {
      const hx = msToX(hover);
      if (hx >= 0 && hx <= W) {
        ctx.strokeStyle = "rgba(255,255,255,.08)"; ctx.lineWidth = 1;
        ctx.setLineDash([3, 5]);
        ctx.beginPath(); ctx.moveTo(hx, 0); ctx.lineTo(hx, H - 12); ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // playhead
    const px = msToX(playheadMs);
    if (px >= 0 && px <= W) {
      ctx.strokeStyle = "rgba(255,255,255,.85)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, H - 12); ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.moveTo(px - 3, 0); ctx.lineTo(px + 3, 0); ctx.lineTo(px, 5); ctx.fill();
    }
  }, [markers, playheadMs, hover, totalMs, zoom, height, offsetMs, visibleMs, waveformData]);

  const msFromEvt = e => {
    const r = wrap.current.getBoundingClientRect();
    return offsetMs + ((e.clientX - r.left) / r.width) * visibleMs;
  };

  return (
    <div ref={wrap} style={{ position: "relative" }}
      onMouseMove={e => setHover(msFromEvt(e))}
      onMouseLeave={() => setHover(null)}
      onClick={e => onSeek(Math.max(0, Math.min(totalMs, msFromEvt(e))))}>
      <canvas ref={cvs} width={880} height={height} className="wc" style={{ height }} />
      {hover !== null && (
        <div style={{ position: "absolute", top: 3, right: 28, fontSize: 7.5, color: "#303030", fontFamily: "IBM Plex Mono,monospace", pointerEvents: "none" }}>
          {msToTc(Math.max(0, hover), fps)}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [songs,        setSongs]        = useState([]);
  const [song,         setSong]         = useState(null);  // current song object
  const [markers,      setMarkers]      = useState([]);
  const [sel,          setSel]          = useState(null);
  const [playing,      setPlaying]      = useState(false);
  const [ph,           setPh]           = useState(0);
  const [totalMs,      setTotalMs]      = useState(0);
  const [zoom,         setZoom]         = useState(1);
  const [waveH,        setWaveH]        = useState(80);
  const [waveformData, setWaveformData] = useState(null);
  const [videoUrl,     setVideoUrl]     = useState(null);
  const [dropOver,     setDropOver]     = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [fps,          setFps]          = useState(25);

  // Web Audio refs
  const audioCtxRef    = useRef(null);
  const audioBufferRef = useRef(null);
  const sourceRef      = useRef(null);
  const startTimeRef   = useRef(0);   // audioCtx.currentTime when playback started
  const offsetSecRef   = useRef(0);   // seconds into buffer where playback started
  const rafRef         = useRef(null);
  const playingRef     = useRef(false);
  const fileInputRef   = useRef(null);
  const videoRef       = useRef(null);

  const getCtx = () => {
    if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
    return audioCtxRef.current;
  };

  const stopSource = useCallback(() => {
    if (sourceRef.current) {
      try { sourceRef.current.stop(); } catch (_) {}
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    cancelAnimationFrame(rafRef.current);
  }, []);

  // RAF loop — updates playhead from AudioContext clock
  const startRaf = useCallback(() => {
    const tick = () => {
      const ctx = audioCtxRef.current;
      if (!ctx || !playingRef.current) return;
      const elapsed = ctx.currentTime - startTimeRef.current;
      const ms = Math.min((offsetSecRef.current + elapsed) * 1000, audioBufferRef.current?.duration * 1000 || 0);
      setPh(ms);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const syncVideo = useCallback((sec) => {
    const v = videoRef.current;
    if (!v) return;
    if (Math.abs(v.currentTime - sec) > 0.1) v.currentTime = sec;
  }, []);

  const playFrom = useCallback((offsetMs) => {
    if (!audioBufferRef.current && !videoRef.current) return;
    const offsetSec = Math.max(0, offsetMs / 1000);

    // video
    const v = videoRef.current;
    if (v) { v.currentTime = offsetSec; v.play().catch(() => {}); }

    if (!audioBufferRef.current) {
      // video-only mode: drive clock from video timeupdate via RAF
      offsetSecRef.current = offsetSec;
      startTimeRef.current = performance.now() / 1000;
      playingRef.current   = true;
      setPlaying(true);
      const tick = () => {
        if (!playingRef.current) return;
        const vid = videoRef.current;
        if (vid) setPh(vid.currentTime * 1000);
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
      return;
    }

    const ctx = getCtx();
    if (ctx.state === "suspended") ctx.resume();
    stopSource();

    const src = ctx.createBufferSource();
    src.buffer = audioBufferRef.current;
    src.connect(ctx.destination);
    src.start(0, offsetSec);
    src.onended = () => {
      if (!playingRef.current) return;
      playingRef.current = false;
      setPlaying(false);
      offsetSecRef.current = 0;
      setPh(0);
      cancelAnimationFrame(rafRef.current);
      if (videoRef.current) videoRef.current.pause();
    };

    sourceRef.current    = src;
    startTimeRef.current = ctx.currentTime;
    offsetSecRef.current = offsetSec;
    playingRef.current   = true;
    setPlaying(true);
    startRaf();
  }, [stopSource, startRaf, syncVideo]);

  const handlePlayPause = useCallback(() => {
    if (!audioBufferRef.current && !videoRef.current) return;
    if (playingRef.current) {
      if (audioBufferRef.current) {
        const ctx = audioCtxRef.current;
        const elapsed = ctx.currentTime - startTimeRef.current;
        offsetSecRef.current = offsetSecRef.current + elapsed;
        stopSource();
      } else {
        const v = videoRef.current;
        if (v) { offsetSecRef.current = v.currentTime; v.pause(); }
      }
      playingRef.current = false;
      setPlaying(false);
      cancelAnimationFrame(rafRef.current);
    } else {
      playFrom(offsetSecRef.current * 1000);
    }
  }, [playFrom, stopSource]);

  const handleStop = useCallback(() => {
    stopSource();
    cancelAnimationFrame(rafRef.current);
    if (videoRef.current) { videoRef.current.pause(); videoRef.current.currentTime = 0; }
    playingRef.current   = false;
    offsetSecRef.current = 0;
    setPlaying(false);
    setPh(0);
  }, [stopSource]);

  const handleSeek = useCallback((ms) => {
    const sec = ms / 1000;
    offsetSecRef.current = sec;
    setPh(ms);
    syncVideo(sec);
    if (playingRef.current) playFrom(ms);
  }, [playFrom, syncVideo]);

  // Switch to a song: load its audio buffer + video into active state
  const selectSong = useCallback((s) => {
    handleStop();
    audioBufferRef.current = s.audioBuffer || null;
    setWaveformData(s.waveformData || null);
    setTotalMs(s.durationMs || 0);
    setVideoUrl(prev => {
      if (prev && prev !== s.videoUrl) URL.revokeObjectURL(prev);
      return s.videoUrl || null;
    });
    setSong(s);
  }, [handleStop]);

  // Delete a song from the list
  const deleteSong = useCallback((id) => {
    setSongs(prev => {
      const target = prev.find(s => s.id === id);
      if (target?.videoUrl) URL.revokeObjectURL(target.videoUrl);
      const next = prev.filter(s => s.id !== id);
      return next;
    });
    setSong(cur => {
      if (cur?.id === id) {
        handleStop();
        audioBufferRef.current = null;
        setWaveformData(null);
        setTotalMs(0);
        setVideoUrl(null);
        return null;
      }
      return cur;
    });
  }, [handleStop]);

  // Load any media file (audio or video)
  const loadFile = useCallback(async (file) => {
    if (!file) return;
    const isAudio = file.type.startsWith("audio/");
    const isVideo = file.type.startsWith("video/") || /\.(mp4|mov|webm|mkv|avi|m4v)$/i.test(file.name);
    if (!isAudio && !isVideo) return;

    setLoading(true);
    handleStop();

    try {
      let audioBuffer = null, waveformData = null, durationMs = 0, vUrl = null;

      if (isVideo) {
        vUrl = URL.createObjectURL(file);
        // get duration via temporary element
        durationMs = await new Promise(res => {
          const tmp = document.createElement("video");
          tmp.src = vUrl;
          tmp.onloadedmetadata = () => res(tmp.duration * 1000);
          tmp.onerror = () => res(0);
        });
      }

      if (isAudio) {
        const ctx = getCtx();
        const arrayBuf = await file.arrayBuffer();
        audioBuffer = await ctx.decodeAudioData(arrayBuf);
        durationMs = audioBuffer.duration * 1000;

        // build waveform peaks
        const ch0 = audioBuffer.getChannelData(0);
        const ch1 = audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : ch0;
        const buckets = 1200, blockSize = Math.floor(ch0.length / buckets);
        const peaks = new Float32Array(buckets);
        for (let b = 0; b < buckets; b++) {
          let max = 0;
          for (let i = b * blockSize; i < (b + 1) * blockSize; i++) {
            const v = Math.abs((ch0[i] + ch1[i]) / 2);
            if (v > max) max = v;
          }
          peaks[b] = max;
        }
        waveformData = peaks;
      }

      const newSong = {
        id: Date.now(),
        title: file.name.replace(/\.[^.]+$/, ""),
        duration: fmtDur(durationMs / 1000),
        durationMs,
        audioBuffer,
        waveformData,
        videoUrl: vUrl,
      };

      setSongs(prev => [newSong, ...prev]);
      audioBufferRef.current = audioBuffer;
      setWaveformData(waveformData);
      setTotalMs(durationMs);
      setVideoUrl(vUrl);
      setSong(newSong);
      setMarkers([]);
    } catch (e) {
      console.error("Load error:", e);
    } finally {
      setLoading(false);
    }
  }, [handleStop]);

  const onFileChange = e => { loadFile(e.target.files?.[0]); e.target.value = ""; };
  const onDragOver   = e => { e.preventDefault(); setDropOver(true); };
  const onDragLeave  = () => setDropOver(false);
  const onDrop       = e => { e.preventDefault(); setDropOver(false); loadFile(e.dataTransfer.files?.[0]); };

  // Waveform resize
  const onResizeStart = useCallback(e => {
    e.preventDefault();
    const startY = e.clientY, startH = waveH;
    const onMove = ev => setWaveH(Math.max(48, Math.min(220, startH + (ev.clientY - startY))));
    const onUp   = () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [waveH]);

  const addMarker = useCallback(lb => {
    const color = COLORS[lb.toLowerCase()] || "#888";
    setMarkers(p => [...p, { id: Date.now(), label: lb, color, ms: ph, end_ms: Math.min(ph + 14000, totalMs) }].sort((a, b) => a.ms - b.ms));
  }, [ph, totalMs]);
  const delMarker = id => { setMarkers(p => p.filter(m => m.id !== id)); if (sel?.id === id) setSel(null); };

  const skipPrevMarker = () => { const m = [...markers].reverse().find(m => m.ms < ph - 100); if (m) handleSeek(m.ms); };
  const skipNextMarker = () => { const m = markers.find(m => m.ms > ph + 100); if (m) handleSeek(m.ms); };

  const tc = useCallback(ms => msToTc(ms, fps), [fps]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = e => {
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
      if (e.code === "Space") { e.preventDefault(); handlePlayPause(); }
      if (e.code === "KeyM" && e.shiftKey) { e.preventDefault(); addMarker("Marker"); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handlePlayPause, addMarker]);

  const active      = markers.find(m => ph >= m.ms && ph < m.end_ms);
  const zoomLevels  = [1, 2, 4, 8];
  const zoomIdx     = zoomLevels.indexOf(zoom);
  const hasAudio    = !!audioBufferRef.current;
  const hasMedia    = hasAudio || !!videoUrl;

  return (
    <>
      <style>{CSS}</style>
      <input ref={fileInputRef} type="file" accept="audio/*,video/*,.mov,.mp4,.webm,.mkv,.avi,.m4v" style={{ display: "none" }} onChange={onFileChange} />
      <div className="root">

        {/* Topbar */}
        <div className="tb">
          <div className="tb-logo">
            <div className="tb-dot" />
            SMART MARKERS
            <span className="tb-ver">v0.1</span>
          </div>
          {active && (
            <div className="tb-pill" style={{ color: active.color, borderColor: active.color + "44", background: active.color + "0b" }}>
              {active.label.toUpperCase()}
            </div>
          )}
          <div className="tb-spacer" />
          <button className="btn-exp" disabled={!markers.length}
            onClick={() => {
              const csv = "timecode,label,ms\n" + markers.map(m => `${tc(m.ms)},${m.label},${m.ms}`).join("\n");
              const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
              a.download = `${song?.title || "markers"}.csv`; a.click();
            }}>EXPORT CSV</button>
        </div>

        {/* Left — song list */}
        <div className="pl">
          <div className="ph"><span>Songs</span><span>{songs.length}</span></div>

          {/* Drop zone */}
          <div className={`drop-zone${dropOver ? " over" : ""}`}
            onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
            onClick={() => fileInputRef.current.click()}>
            <div className="dz-icon">{loading ? "⟳" : "↑"}</div>
            <div className="dz-label">{loading ? "LOADING…" : "IMPORT FILE"}</div>
            <div className="dz-sub">audio · mp4 · mov · webm</div>
          </div>

          <div className="sl">
            {songs.map(s => (
              <div key={s.id} className={`sr${song?.id === s.id ? " on" : ""}`} onClick={() => selectSong(s)}>
                <div className="sr-top">
                  <span className="sr-name">{s.title}</span>
                  <span style={{display:"flex",alignItems:"center",gap:4,flexShrink:0}}>
                    <span className="sr-dur">{s.duration}</span>
                    <button style={{background:"none",border:"none",color:"#555",cursor:"pointer",
                      fontSize:13,lineHeight:1,padding:"0 2px",opacity:0}}
                      className="sr-del"
                      onClick={e=>{e.stopPropagation();deleteSong(s.id);}}>×</button>
                  </span>
                </div>
                <div className="sr-wave" />
              </div>
            ))}
          </div>
        </div>

        {/* Center */}
        <div className="pc">
          <div className="ctb">
            <span className="ct">{song?.title || "No file loaded"}</span>
            {song && <span className="ca">{song.duration}</span>}
            {totalMs > 0 && <span className="cb">{tc(totalMs)}</span>}
          </div>

          {/* Waveform */}
          <div className="ww" style={{ height: waveH + 12 }}>
            <WaveCanvas
              markers={markers} playheadMs={ph}
              totalMs={totalMs || 1} onSeek={handleSeek}
              zoom={zoom} height={waveH + 12}
              waveformData={waveformData} fps={fps} />
            <div className="ww-zoom">
              <button className="btn-zoom" onClick={() => setZoom(zoomLevels[Math.max(0, zoomIdx - 1)])}>−</button>
              <span className="zoom-val">{zoom}×</span>
              <button className="btn-zoom" onClick={() => setZoom(zoomLevels[Math.min(zoomLevels.length - 1, zoomIdx + 1)])}>+</button>
            </div>
            <div className="ww-resize" onMouseDown={onResizeStart} />
          </div>

          {/* Transport */}
          <div className="tr">
            <button className="btn-tr" disabled={!hasMedia} onClick={() => handleSeek(0)} title="To start"><IcoSkipBack /></button>
            <button className="btn-tr" disabled={!hasMedia} onClick={skipPrevMarker} title="Prev marker"><IcoPrevMark /></button>
            <div className="tsep" />
            <button className="btn-tr" disabled={!hasMedia} onClick={handleStop} title="Stop"><IcoStop /></button>
            <button className={`btn-tr play-btn${playing ? " on" : ""}`} disabled={!hasMedia} onClick={handlePlayPause} title={playing ? "Pause" : "Play"}>
              {playing ? <IcoPause /> : <IcoPlay />}
            </button>
            <div className="tsep" />
            <button className="btn-tr" disabled={!hasMedia} onClick={skipNextMarker} title="Next marker"><IcoNextMark /></button>
            <button className="btn-tr" disabled={!hasMedia} onClick={() => handleSeek(totalMs)} title="To end"><IcoSkipFwd /></button>
            <div className="tsep" />
            <span className="tc-val" style={{fontSize:13}}>{tc(ph)}</span>
            <span className="tr-status">{playing ? "[Playing]" : ph > 0 ? "[Paused]" : "[Stopped]"}</span>
            <div className="tr-spacer" />
            <select className="fps-select"
              value={FPS_OPTIONS.find(o => Math.abs(o.value - fps) < 0.01)?.label || "25"}
              onChange={e => setFps(FPS_OPTIONS.find(o => o.label === e.target.value).value)}>
              {FPS_OPTIONS.map(o => <option key={o.label} value={o.label}>{o.label} fps</option>)}
            </select>
          </div>

          {/* Marker shortcuts */}
          <div className="mbs-row">
            {LABELS.map(lb => (
              <button key={lb} className="btn-m"
                style={{ color: COLORS[lb.toLowerCase()] || "#555", borderColor: COLORS[lb.toLowerCase()] || "#222" }}
                onClick={() => addMarker(lb)}>
                {lb.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Video area */}
          <div className="va" style={videoUrl ? { cursor: "default" } : {}}>
            {videoUrl ? (
              <video
                ref={videoRef}
                src={videoUrl}
                muted={!!song?.audioBuffer}
                style={{ width: "100%", height: "100%", objectFit: "contain", display: "block", borderRadius: 2 }}
                preload="auto"
              />
            ) : (
              <div className="vl">Video</div>
            )}
          </div>
        </div>

        {/* Right — marker list */}
        <div className="pr">
          <div className="ph"><span>Markers</span><span>{markers.length}</span></div>
          <div className="ml">
            {markers.map(m => {
              const isAct = ph >= m.ms && ph < m.end_ms, isSel = sel?.id === m.id;
              return (
                <div key={m.id}
                  className={`mr${isAct ? " act" : ""}${isSel ? " sel" : ""}`}
                  style={{ "--rc": m.color }}
                  onClick={() => { setSel(m); handleSeek(m.ms); }}>
                  <div className="mr-tc">{tc(m.ms)}</div>
                  <div className="mr-dot" style={{ background: m.color }} />
                  <div className="mr-name">{m.label}</div>
                  <button className="mr-del" onClick={e => { e.stopPropagation(); delMarker(m.id); }}>×</button>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </>
  );
}
