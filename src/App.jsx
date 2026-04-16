import { useState, useRef, useEffect, useCallback } from "react";

const SONGS = [
  { id:1, title:"Lose Yourself",   artist:"Eminem",     duration:"5:26", bpm:171, analyzed:true,
    segs:[{l:"intro",p:4},{l:"verse",p:18},{l:"chorus",p:14},{l:"verse",p:16},{l:"chorus",p:14},{l:"bridge",p:10},{l:"outro",p:8},{l:"end",p:16}] },
  { id:2, title:"Blinding Lights", artist:"The Weeknd", duration:"3:20", bpm:171, analyzed:true,
    segs:[{l:"intro",p:8},{l:"verse",p:16},{l:"chorus",p:16},{l:"verse",p:14},{l:"chorus",p:16},{l:"bridge",p:12},{l:"chorus",p:18}] },
  { id:3, title:"Levitating",      artist:"Dua Lipa",   duration:"3:23", bpm:103, analyzed:false, segs:[] },
];

const MARKERS_INIT = [
  { id:1, label:"Intro",   color:"#4A90D9", ms:0,     end_ms:8400   },
  { id:2, label:"Verse 1", color:"#7ED321", ms:8400,  end_ms:24800  },
  { id:3, label:"Chorus",  color:"#F5A623", ms:24800, end_ms:38200  },
  { id:4, label:"Verse 2", color:"#7ED321", ms:38200, end_ms:54600  },
  { id:5, label:"Chorus",  color:"#F5A623", ms:54600, end_ms:68000  },
  { id:6, label:"Bridge",  color:"#9B59B6", ms:68000, end_ms:78500  },
  { id:7, label:"Chorus",  color:"#F5A623", ms:78500, end_ms:94000  },
  { id:8, label:"Outro",   color:"#E74C3C", ms:94000, end_ms:108000 },
];

const COLORS = {
  intro:"#4A90D9", verse:"#7ED321", "pre-chorus":"#27AE60",
  chorus:"#F5A623", "post-chorus":"#E67E22", bridge:"#9B59B6",
  inst:"#1ABC9C", solo:"#E74C3C", break:"#7F8C8D", outro:"#E74C3C", end:"#3A3A3A"
};
const LABELS = ["Intro","Verse","Pre-Chorus","Chorus","Post-Chorus","Bridge","Inst","Solo","Break","Outro","End"];

const msToTc = ms => {
  ms = Math.max(0,Math.floor(ms));
  const h=Math.floor(ms/3600000),m=Math.floor((ms%3600000)/60000),
        s=Math.floor((ms%60000)/1000),f=ms%1000;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(f).padStart(3,'0')}`;
};
const shortTc = ms => msToTc(ms).slice(3);

// ── SVG Transport Icons ───────────────────────────────────────────────────────
const IcoSkipBack  = () => <svg width="11" height="11" viewBox="0 0 11 11" fill="currentColor"><rect x="0" y="0" width="1.5" height="11"/><polygon points="11,0 11,11 2,5.5"/></svg>;
const IcoSkipFwd   = () => <svg width="11" height="11" viewBox="0 0 11 11" fill="currentColor"><rect x="9.5" y="0" width="1.5" height="11"/><polygon points="0,0 0,11 9,5.5"/></svg>;
const IcoStop      = () => <svg width="9" height="9" viewBox="0 0 9 9" fill="currentColor"><rect x="0" y="0" width="9" height="9"/></svg>;
const IcoPlay      = () => <svg width="10" height="11" viewBox="0 0 10 11" fill="currentColor"><polygon points="0,0 0,11 10,5.5"/></svg>;
const IcoPause     = () => <svg width="10" height="11" viewBox="0 0 10 11" fill="currentColor"><rect x="0" y="0" width="3.5" height="11"/><rect x="6.5" y="0" width="3.5" height="11"/></svg>;
const IcoPrevMark  = () => <svg width="12" height="11" viewBox="0 0 12 11" fill="currentColor"><polygon points="6,0 6,11 0,5.5"/><polygon points="12,0 12,11 6,5.5"/></svg>;
const IcoNextMark  = () => <svg width="12" height="11" viewBox="0 0 12 11" fill="currentColor"><polygon points="0,0 0,11 6,5.5"/><polygon points="6,0 6,11 12,5.5"/></svg>;

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600&family=IBM+Plex+Sans:wght@300;400;500&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#0b0b0b;--sur:#0f0f0f;--rsd:#141414;
  --b1:#191919;--b2:#212121;
  --tx:#b0b0b0;--mu:#444;--dim:#252525;
  --ac:#F5A623;
  --mono:'IBM Plex Mono',monospace;
  --sans:'IBM Plex Sans',sans-serif;
}
.root{font-family:var(--mono);background:var(--bg);color:var(--tx);height:100vh;
  display:grid;grid-template-columns:190px 1fr 206px;grid-template-rows:38px 1fr;
  overflow:hidden;font-size:11px;user-select:none}

/* ── topbar ── */
.tb{grid-column:1/-1;background:var(--sur);border-bottom:1px solid var(--b1);
  display:flex;align-items:center;padding:0 14px;gap:10px}
.tb-logo{font-size:10.5px;font-weight:600;color:#fff;letter-spacing:.18em;
  display:flex;align-items:center;gap:7px;flex-shrink:0}
.tb-dot{width:5px;height:5px;border-radius:50%;background:var(--ac);box-shadow:0 0 6px var(--ac)}
.tb-ver{font-size:8px;color:var(--dim);letter-spacing:.1em}
.tb-pill{font-size:8px;letter-spacing:.13em;padding:2px 8px;border-radius:1px;border:1px solid;transition:all .15s;flex-shrink:0}
.tb-spacer{flex:1}
.btn-exp{font-family:var(--mono);font-size:8px;font-weight:600;letter-spacing:.15em;
  background:transparent;color:var(--ac);border:1px solid var(--ac);padding:3px 11px;
  border-radius:1px;cursor:pointer;transition:background .15s,color .15s;flex-shrink:0}
.btn-exp:hover{background:var(--ac);color:#000}

/* ── left ── */
.pl{background:var(--sur);border-right:1px solid var(--b1);display:flex;flex-direction:column;overflow:hidden}
.ph{padding:7px 11px;font-size:7.5px;letter-spacing:.2em;color:var(--dim);text-transform:uppercase;
  border-bottom:1px solid var(--b1);display:flex;justify-content:space-between;align-items:center;flex-shrink:0}
.btn-up{font-family:var(--mono);font-size:7.5px;letter-spacing:.1em;background:none;color:var(--mu);
  border:1px dashed var(--b2);width:calc(100% - 12px);margin:6px;padding:5px;
  border-radius:1px;cursor:pointer;transition:border-color .15s,color .15s;flex-shrink:0}
.btn-up:hover{border-color:var(--mu);color:var(--tx)}
.sl{overflow-y:auto;flex:1}
.sr{padding:5px 10px 4px 10px;border-bottom:1px solid var(--b1);border-left:2px solid transparent;cursor:pointer;transition:background .08s}
.sr:hover{background:#111}
.sr.on{background:var(--rsd);border-left-color:var(--ac)}
.sr-top{font-size:9px;font-weight:500;color:var(--mu);display:flex;justify-content:space-between;align-items:baseline;gap:3px;margin-bottom:1px}
.sr.on .sr-name{color:#eee}
.sr-dur{color:var(--dim);font-size:7.5px;flex-shrink:0}
.sr-meta{font-size:7.5px;color:var(--dim);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:3px}

/* ── center ── */
.pc{display:flex;flex-direction:column;overflow:hidden;background:var(--bg)}
.ctb{padding:0 14px;height:30px;border-bottom:1px solid var(--b1);
  display:flex;align-items:center;gap:8px;flex-shrink:0}
.ct{font-family:var(--sans);font-size:11.5px;font-weight:500;color:#eee}
.ca{font-family:var(--sans);font-size:9.5px;color:var(--mu)}
.cb{margin-left:auto;font-size:7.5px;color:var(--dim);letter-spacing:.08em}

/* ── waveform resizable ── */
.ww{flex-shrink:0;position:relative;overflow:hidden}
canvas.wc{width:100%;display:block;cursor:crosshair}
.ww-resize{position:absolute;bottom:0;left:0;right:0;height:4px;cursor:ns-resize;
  background:transparent;z-index:10}
.ww-resize:hover{background:rgba(255,255,255,.04)}
.ww-zoom{position:absolute;bottom:6px;right:8px;display:flex;align-items:center;gap:2px;z-index:20}
.btn-zoom{font-family:var(--mono);font-size:9px;background:rgba(0,0,0,.6);
  border:1px solid var(--b2);color:var(--mu);width:18px;height:16px;border-radius:1px;
  cursor:pointer;display:flex;align-items:center;justify-content:center;
  transition:color .1s,border-color .1s}
.btn-zoom:hover{color:var(--tx);border-color:var(--mu)}
.zoom-val{font-size:7.5px;color:var(--dim);min-width:26px;text-align:center}

/* ── transport row 1: controls + TC ── */
.tr{padding:0 14px;height:28px;border-top:1px solid var(--b1);
  display:flex;align-items:center;gap:3px;flex-shrink:0}
.tc-display{display:flex;align-items:baseline;gap:5px;background:var(--rsd);
  border:1px solid var(--b2);border-radius:1px;padding:2px 8px;flex-shrink:0}
.tc-label{font-size:6px;letter-spacing:.18em;color:var(--dim);text-transform:uppercase}
.tc-val{font-size:10.5px;font-weight:500;color:var(--ac);letter-spacing:.02em;font-variant-numeric:tabular-nums}
.btn-tr{background:none;border:none;color:var(--mu);cursor:pointer;
  width:18px;height:18px;display:flex;align-items:center;justify-content:center;
  border-radius:1px;transition:color .1s;flex-shrink:0;padding:0}
.btn-tr:hover{color:var(--tx)}
.btn-tr.play-btn{border:1px solid var(--b2);width:22px;height:18px}
.btn-tr.play-btn:hover{border-color:var(--mu)}
.btn-tr.play-btn.on{border-color:var(--ac);color:var(--ac);background:rgba(245,166,35,.05)}
.tsep{width:1px;height:10px;background:var(--b1);flex-shrink:0;margin:0 2px}
.tr-spacer{flex:1}
/* ── transport row 2: marker shortcuts ── */
.mbs-row{padding:0 14px;height:22px;border-bottom:1px solid var(--b1);
  display:flex;align-items:center;gap:2px;flex-shrink:0}
.btn-m{font-family:var(--mono);flex:1;height:16px;background:none;border:none;
  border-bottom:1px solid;font-size:6.5px;letter-spacing:.05em;
  cursor:pointer;padding:0;min-width:0;white-space:nowrap;overflow:hidden;
  text-overflow:ellipsis;opacity:.38;transition:opacity .1s}
.btn-m:hover{opacity:1}

/* ── video ── */
.va{flex:1;margin:8px 14px;background:var(--sur);border:1px solid var(--b1);
  border-radius:2px;display:flex;align-items:center;justify-content:center;
  flex-direction:column;gap:3px;min-height:0}
.vl{font-size:7.5px;letter-spacing:.18em;color:var(--dim);text-transform:uppercase}

/* ── right ── */
.pr{background:var(--sur);border-left:1px solid var(--b1);display:flex;flex-direction:column;overflow:hidden}
.ml{overflow-y:auto;flex:1;display:flex;flex-direction:column}
.mr{display:flex;align-items:center;padding:0 5px 0 0;min-height:20px;
  border-bottom:1px solid #0c0c0c;border-left:2px solid transparent;
  cursor:pointer;transition:background .07s;flex:1}
.mr:hover{background:#111}
.mr.act{border-left-color:var(--rc);background:#111}
.mr.sel{background:var(--rsd)}
.mr-tc{font-size:8.5px;color:var(--mu);min-width:62px;padding-left:6px;
  flex-shrink:0;font-variant-numeric:tabular-nums;transition:color .1s;letter-spacing:0}
.mr.act .mr-tc{color:var(--ac);font-weight:500}
.mr-dot{width:3px;height:3px;border-radius:50%;flex-shrink:0;margin-right:5px}
.mr-name{font-family:var(--sans);font-size:8.5px;color:var(--mu);flex:1;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;transition:color .1s}
.mr.act .mr-name{color:#ccc}
.mr-del{background:none;border:none;color:var(--dim);cursor:pointer;
  font-size:11px;line-height:1;padding:0 2px;opacity:0;transition:opacity .1s;flex-shrink:0}
.mr:hover .mr-del{opacity:1}
.mr-del:hover{color:var(--mu)}

::-webkit-scrollbar{width:2px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:var(--b2);border-radius:1px}
`;

function MiniWave({ segs, analyzed }) {
  if (!analyzed || !segs.length)
    return <div style={{height:2,background:"#181818",borderRadius:1}}/>;
  return (
    <div style={{height:2,display:"flex",borderRadius:1,overflow:"hidden",gap:1}}>
      {segs.map((s,i)=>(
        <div key={i} style={{flex:s.p,background:COLORS[s.l]||"#333",opacity:.65}}/>
      ))}
    </div>
  );
}

function WaveCanvas({ markers, playheadMs, totalMs, onSeek, zoom, height }) {
  const cvs  = useRef(null);
  const wrap = useRef(null);
  const [hover, setHover] = useState(null);

  // visible window in ms based on zoom
  const visibleMs = totalMs / zoom;
  const offsetMs  = Math.max(0, Math.min(playheadMs - visibleMs * 0.4, totalMs - visibleMs));

  useEffect(()=>{
    const c=cvs.current; if(!c) return;
    const ctx=c.getContext("2d");
    const W=c.width, H=c.height;
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle="#0b0b0b"; ctx.fillRect(0,0,W,H);

    const msToX = ms => ((ms - offsetMs) / visibleMs) * W;

    markers.forEach(m=>{
      const x1=msToX(m.ms), x2=msToX(m.end_ms);
      if(x2<0||x1>W) return;
      ctx.fillStyle=m.color+"12"; ctx.fillRect(Math.max(0,x1),0,Math.min(W,x2)-Math.max(0,x1),H-12);
      if(x1>=0&&x1<=W){
        ctx.fillStyle=m.color+"cc"; ctx.fillRect(x1,0,1,H-12);
        ctx.font="500 7px 'IBM Plex Mono',monospace";
        ctx.fillStyle=m.color+"88";
        ctx.fillText(m.label.toUpperCase(),x1+3,10);
      }
    });

    // waveform bars
    for(let i=0;i<W;i+=2){
      const tGlobal=(offsetMs + (i/W)*visibleMs)/totalMs;
      const w=Math.abs(Math.sin(tGlobal*Math.PI*80)*.3+Math.sin(tGlobal*Math.PI*210)*.38+Math.sin(tGlobal*Math.PI*31)*.32);
      const amp=w*(H-12)*.42+2, cy=(H-12)/2;
      ctx.fillStyle="#1a3828"; ctx.globalAlpha=.58;
      ctx.fillRect(i,cy-amp,1.5,amp*2);
    }
    ctx.globalAlpha=1;

    // ruler
    ctx.fillStyle="#0b0b0b"; ctx.fillRect(0,H-12,W,12);
    const step = visibleMs<=30000?5:visibleMs<=60000?10:30;
    for(let s=0;s<=Math.ceil(totalMs/1000);s+=step){
      const rx=msToX(s*1000);
      if(rx<0||rx>W) continue;
      ctx.fillStyle="#1c1c1c"; ctx.fillRect(rx,H-12,1,3);
      ctx.font="7px 'IBM Plex Mono',monospace"; ctx.fillStyle="#2a2a2a";
      ctx.fillText(msToTc(s*1000).slice(3,8),rx+2,H-1);
    }

    // hover
    if(hover!==null){
      const hx=msToX(hover);
      if(hx>=0&&hx<=W){
        ctx.strokeStyle="rgba(255,255,255,.08)"; ctx.lineWidth=1;
        ctx.setLineDash([3,5]);
        ctx.beginPath();ctx.moveTo(hx,0);ctx.lineTo(hx,H-12);ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // playhead
    const px=msToX(playheadMs);
    if(px>=0&&px<=W){
      ctx.strokeStyle="rgba(255,255,255,.8)"; ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(px,0);ctx.lineTo(px,H-12);ctx.stroke();
      ctx.fillStyle="#fff";
      ctx.beginPath();ctx.moveTo(px-3,0);ctx.lineTo(px+3,0);ctx.lineTo(px,5);ctx.fill();
    }
  },[markers,playheadMs,hover,totalMs,zoom,height,offsetMs,visibleMs]);

  const msFromEvt = e => {
    const r=wrap.current.getBoundingClientRect();
    return offsetMs + ((e.clientX-r.left)/r.width)*visibleMs;
  };

  return (
    <div ref={wrap} style={{position:"relative"}}
      onMouseMove={e=>setHover(msFromEvt(e))}
      onMouseLeave={()=>setHover(null)}
      onClick={e=>onSeek(Math.max(0,Math.min(totalMs,msFromEvt(e))))}>
      <canvas ref={cvs} width={880} height={height} className="wc" style={{height}}/>
      {hover!==null&&(
        <div style={{position:"absolute",top:3,right:28,fontSize:7.5,color:"#303030",
          fontFamily:"IBM Plex Mono,monospace",pointerEvents:"none"}}>
          {shortTc(Math.max(0,hover))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [song,      setSong]      = useState(SONGS[0]);
  const [markers,   setMarkers]   = useState(MARKERS_INIT);
  const [sel,       setSel]       = useState(null);
  const [playing,   setPlaying]   = useState(false);
  const [ph,        setPh]        = useState(0);
  const [zoom,      setZoom]      = useState(1);
  const [waveH,     setWaveH]     = useState(80);
  const totalMs = 108000;
  const tick    = useRef(null);
  const dragRef = useRef(null);

  useEffect(()=>{
    if(playing){
      tick.current=setInterval(()=>setPh(p=>{
        if(p>=totalMs){setPlaying(false);return 0;} return p+80;
      }),80);
    } else clearInterval(tick.current);
    return()=>clearInterval(tick.current);
  },[playing]);

  // drag-resize waveform
  const onResizeStart = useCallback(e=>{
    e.preventDefault();
    const startY=e.clientY, startH=waveH;
    const onMove=ev=>setWaveH(Math.max(48,Math.min(220,startH+(ev.clientY-startY))));
    const onUp=()=>{ window.removeEventListener("mousemove",onMove); window.removeEventListener("mouseup",onUp); };
    window.addEventListener("mousemove",onMove);
    window.addEventListener("mouseup",onUp);
  },[waveH]);

  const addMarker = lb => {
    const color=COLORS[lb.toLowerCase()]||"#888";
    setMarkers(p=>[...p,{id:Date.now(),label:lb,color,ms:ph,end_ms:Math.min(ph+14000,totalMs)}].sort((a,b)=>a.ms-b.ms));
  };
  const delMarker = id => { setMarkers(p=>p.filter(m=>m.id!==id)); if(sel?.id===id) setSel(null); };
  const skipPrevMarker = () => {
    const prev = [...markers].reverse().find(m=>m.ms < ph-100);
    if(prev) setPh(prev.ms);
  };
  const skipNextMarker = () => {
    const next = markers.find(m=>m.ms > ph+100);
    if(next) setPh(next.ms);
  };
  const active = markers.find(m=>ph>=m.ms&&ph<m.end_ms);

  const zoomLevels = [1,2,4,8];
  const zoomIdx    = zoomLevels.indexOf(zoom);

  return (
    <>
      <style>{CSS}</style>
      <div className="root">

        {/* Topbar */}
        <div className="tb">
          <div className="tb-logo">
            <div className="tb-dot"/>
            SMART MARKERS
            <span className="tb-ver">v0.1</span>
          </div>
          {active&&(
            <div className="tb-pill" style={{color:active.color,borderColor:active.color+"44",background:active.color+"0b"}}>
              {active.label.toUpperCase()}
            </div>
          )}
          <div className="tb-spacer"/>
          <button className="btn-exp">EXPORT CSV</button>
        </div>

        {/* Left */}
        <div className="pl">
          <div className="ph"><span>Songs</span><span>{SONGS.length}</span></div>
          <button className="btn-up">+ UPLOAD</button>
          <div className="sl">
            {SONGS.map(s=>(
              <div key={s.id} className={`sr${song.id===s.id?" on":""}`} onClick={()=>setSong(s)}>
                <div className="sr-top">
                  <span className="sr-name">{s.title}</span>
                  <span className="sr-dur">{s.duration}</span>
                </div>
                <div className="sr-meta">{s.artist}{s.bpm?` · ${s.bpm}`:""}</div>
                <MiniWave segs={s.segs} analyzed={s.analyzed}/>
              </div>
            ))}
          </div>
        </div>

        {/* Center */}
        <div className="pc">
          <div className="ctb">
            <span className="ct">{song.title}</span>
            <span className="ca">{song.artist}</span>
            {song.bpm&&<span className="cb">{song.bpm} BPM</span>}
          </div>

          {/* Waveform — resizable */}
          <div className="ww" style={{height:waveH+12}}>
            <WaveCanvas
              markers={markers} playheadMs={ph}
              totalMs={totalMs} onSeek={setPh}
              zoom={zoom} height={waveH+12}/>
            {/* Zoom controls */}
            <div className="ww-zoom">
              <button className="btn-zoom"
                onClick={()=>setZoom(zoomLevels[Math.max(0,zoomIdx-1)])}>−</button>
              <span className="zoom-val">{zoom}×</span>
              <button className="btn-zoom"
                onClick={()=>setZoom(zoomLevels[Math.min(zoomLevels.length-1,zoomIdx+1)])}>+</button>
            </div>
            {/* Resize handle */}
            <div className="ww-resize" onMouseDown={onResizeStart}/>
          </div>

          {/* Transport row 1 — TC left · buttons right */}
          <div className="tr">
            <div className="tc-display">
              <span className="tc-label">TC</span>
              <span className="tc-val">{shortTc(ph)}</span>
            </div>
            <div className="tr-spacer"/>
            <button className="btn-tr" onClick={()=>{setPh(0);setPlaying(false);}} title="To start"><IcoSkipBack/></button>
            <button className="btn-tr" onClick={skipPrevMarker} title="Prev marker"><IcoPrevMark/></button>
            <div className="tsep"/>
            <button className="btn-tr" onClick={()=>setPlaying(false)} title="Stop"><IcoStop/></button>
            <button className={`btn-tr play-btn${playing?" on":""}`} onClick={()=>setPlaying(p=>!p)} title={playing?"Pause":"Play"}>
              {playing ? <IcoPause/> : <IcoPlay/>}
            </button>
            <div className="tsep"/>
            <button className="btn-tr" onClick={skipNextMarker} title="Next marker"><IcoNextMark/></button>
            <button className="btn-tr" onClick={()=>{setPh(totalMs);setPlaying(false);}} title="To end"><IcoSkipFwd/></button>
          </div>

          {/* Transport row 2 — marker shortcuts */}
          <div className="mbs-row">
            {LABELS.map(lb=>(
              <button key={lb} className="btn-m"
                style={{color:COLORS[lb.toLowerCase()]||"#555",borderColor:COLORS[lb.toLowerCase()]||"#222"}}
                onClick={()=>addMarker(lb)}>
                {lb.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Video */}
          <div className="va">
            <div className="vl">Video</div>
          </div>
        </div>

        {/* Right */}
        <div className="pr">
          <div className="ph"><span>Markers</span><span>{markers.length}</span></div>
          <div className="ml">
            {markers.map(m=>{
              const isAct=ph>=m.ms&&ph<m.end_ms, isSel=sel?.id===m.id;
              return(
                <div key={m.id}
                  className={`mr${isAct?" act":""}${isSel?" sel":""}`}
                  style={{"--rc":m.color}}
                  onClick={()=>{setSel(m);setPh(m.ms);}}>
                  <div className="mr-tc">{shortTc(m.ms)}</div>
                  <div className="mr-dot" style={{background:m.color}}/>
                  <div className="mr-name">{m.label}</div>
                  <button className="mr-del" onClick={e=>{e.stopPropagation();delMarker(m.id);}}>×</button>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </>
  );
}
