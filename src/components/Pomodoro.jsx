import { useState, useEffect, useRef, useCallback } from 'react';
import { useStorage } from '../hooks/useStorage';

const MODES = [
  { key:'foco',  label:'Foco',        minutes:25, color:'#6366f1' },
  { key:'curto', label:'Pausa Curta', minutes:5,  color:'#10b981' },
  { key:'longo', label:'Pausa Longa', minutes:15, color:'#f59e0b' },
];

export default function Pomodoro() {
  const [modeIdx, setModeIdx]     = useState(0);
  const [customMin, setCustomMin] = useState(null);
  const [seconds, setSeconds]     = useState(MODES[0].minutes * 60);
  const [running, setRunning]     = useState(false);
  const [, setSessions]    = useStorage('pomodoro_sessions', []);
  const [, setStudyLog]   = useStorage('studylog', []);
  const intervalRef = useRef(null);
  const startRef    = useRef(null);
  const mode  = MODES[modeIdx];
  const total = (customMin ?? mode.minutes) * 60;
  const pct   = total > 0 ? ((total - seconds) / total) * 100 : 0;

  const stop = useCallback((finished = false) => {
    clearInterval(intervalRef.current);
    setRunning(false);
    if (startRef.current && finished) {
      const elapsed = Math.round((Date.now() - startRef.current) / 60000);
      if (elapsed >= 1) {
        const log = { date: new Date().toISOString().slice(0,10), minutos: elapsed, modo: mode.key };
        setStudyLog(p => [log, ...p.slice(0,199)]);
        setSessions(p => [log, ...p.slice(0,99)]);
      }
    }
    startRef.current = null;
  }, [mode.key, setStudyLog, setSessions]);

  useEffect(() => {
    if (running) {
      startRef.current = startRef.current ?? Date.now();
      intervalRef.current = setInterval(() => {
        setSeconds(s => { if (s <= 1) { stop(true); return 0; } return s - 1; });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, stop]);

  const changeMode = (i) => { stop(); setModeIdx(i); setCustomMin(null); setSeconds(MODES[i].minutes * 60); };
  const reset = () => { stop(); setSeconds((customMin ?? mode.minutes) * 60); };
  const mm  = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss2 = String(seconds % 60).padStart(2, '0');

  /* Ring menor para caber no grid */
  const R = 44, CX = 52, CY = 52;
  const circ = 2 * Math.PI * R;
  const dash  = (pct / 100) * circ;
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      {/* Mode tabs */}
      <div style={{ display:'flex', background:'rgba(255,255,255,0.03)', borderRadius:7, padding:3, gap:2 }}>
        {MODES.map((m,i) => (
          <button key={m.key} onClick={() => changeMode(i)}
            style={{ flex:1, padding:'4px 0', borderRadius:5, border:'none', cursor:'pointer',
              fontSize:'0.62rem', fontWeight:600,
              background: i===modeIdx ? mode.color : 'transparent',
              color: i===modeIdx ? '#fff' : '#475569', transition:'all 0.15s' }}>
            {m.label}
          </button>
        ))}
      </div>

      {/* Ring + controles em linha */}
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        {/* SVG ring */}
        <div style={{ position:'relative', width:104, height:104, flexShrink:0 }}>
          <svg width="104" height="104" viewBox="0 0 104 104">
            <circle cx={CX} cy={CY} r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6"/>
            <circle cx={CX} cy={CY} r={R} fill="none" stroke={mode.color} strokeWidth="6"
              strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
              transform={`rotate(-90 ${CX} ${CY})`}
              style={{ transition:'stroke-dasharray 0.5s', filter:`drop-shadow(0 0 4px ${mode.color}80)` }}/>
          </svg>
          <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column',
              alignItems:'center', justifyContent:'center' }}>
            <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'1.3rem', fontWeight:700,
                color: running ? mode.color : '#f1f5f9', letterSpacing:'0.02em',
                transition:'color 0.3s', lineHeight:1 }}>{mm}:{ss2}</div>
            <div style={{ fontSize:'0.52rem', fontWeight:600, color:'#334155',
                textTransform:'uppercase', letterSpacing:'0.09em', marginTop:2 }}>{mode.label}</div>
          </div>
        </div>

        {/* Controles */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', gap:6 }}>
          <div style={{ display:'flex', alignItems:'center', gap:5 }}>
            <input type="number" min="1" max="120" placeholder="min" value={customMin??''}
              style={{ width:46, padding:'4px 6px', fontSize:'0.72rem', borderRadius:6,
                background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)',
                color:'#e2e8f0', textAlign:'center' }}
              onChange={e => { const v=parseInt(e.target.value); if(!isNaN(v)&&v>0){setCustomMin(v);setSeconds(v*60);stop();} }}/>
            <span style={{ fontSize:'0.6rem', color:'#334155' }}>personalizado</span>
          </div>
          <div style={{ display:'flex', gap:5 }}>
            <button onClick={reset}
              style={{ padding:'6px 10px', background:'rgba(255,255,255,0.04)',
                border:'1px solid rgba(255,255,255,0.08)', borderRadius:6,
                color:'#475569', fontSize:'0.68rem', fontWeight:600, cursor:'pointer' }}>↺ Reset</button>
            <button onClick={() => setRunning(r=>!r)}
              style={{ flex:1, padding:'6px 0', border:`1px solid ${running?'#ef444450':mode.color+'50'}`,
                borderRadius:6, fontSize:'0.7rem', fontWeight:700, cursor:'pointer',
                background: running?'rgba(239,68,68,0.1)':`${mode.color}18`,
                color: running?'#ef4444':mode.color, transition:'all 0.2s' }}>
              {running ? '⏸ Pausar' : '▶ Iniciar'}
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
