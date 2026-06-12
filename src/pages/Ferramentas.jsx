import { useState, useEffect, useRef, useCallback } from 'react';
import { useStorage, useTrackerStorage } from '../hooks/useStorage';
import { PROGRAMA } from '../data/programa';

/* ══════════════════════════════════════════════════════════════
   FERRAMENTAS — Prioridade Baixa
   🌙 Modo Foco  |  📤 Exportar CSV  |  💾 Backup/Restore  |  🖨️ Imprimir Ciclo
═══════════════════════════════════════════════════════════════ */

// ── Helpers ──────────────────────────────────────────────────
function useToast() {
  const [msg, setMsg] = useState('');
  const show = useCallback((m, dur = 2800) => {
    setMsg(m);
    setTimeout(() => setMsg(''), dur);
  }, []);
  return [msg, show];
}

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function printViaIframe(html) {
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;';
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument || iframe.contentWindow.document;
  doc.open(); doc.write(html); doc.close();
  iframe.contentWindow.focus();
  setTimeout(() => {
    iframe.contentWindow.print();
    setTimeout(() => document.body.removeChild(iframe), 1500);
  }, 700);
}

function downloadBlob(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

const today = () => new Date().toISOString().slice(0, 10);

// ════════════════════════════════════════════════════════════
// 🌙 MODO FOCO
// ════════════════════════════════════════════════════════════
function ModoFoco({ onSaveSession }) {
  const [active,   setActive]   = useState(false);
  const [running,  setRunning]  = useState(false);
  const [seconds,  setSeconds]  = useState(25 * 60);
  const [total,    setTotal]    = useState(25 * 60);
  const [durMin,   setDurMin]   = useState(25);
  const [materia,  setMateria]  = useState('');
  const [done,     setDone]     = useState(false);
  const intervalRef = useRef(null);

  // Resetar quando duração muda
  const applyDuration = (min) => {
    clearInterval(intervalRef.current);
    setRunning(false);
    setDone(false);
    setTotal(min * 60);
    setSeconds(min * 60);
  };

  const toggle = () => {
    if (done) { applyDuration(durMin); return; }
    setRunning(r => !r);
  };

  useEffect(() => {
    if (running && !done) {
      intervalRef.current = setInterval(() => {
        setSeconds(s => {
          if (s <= 1) {
            clearInterval(intervalRef.current);
            setRunning(false);
            setDone(true);
            // Salvar sessão no studyLog
            onSaveSession(Math.round(total / 60));
            // Som
            try {
              const ctx = new AudioContext();
              const osc = ctx.createOscillator();
              const g   = ctx.createGain();
              osc.connect(g); g.connect(ctx.destination);
              osc.frequency.value = 880;
              g.gain.setValueAtTime(0.3, ctx.currentTime);
              g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
              osc.start(); osc.stop(ctx.currentTime + 1.5);
            } catch {}
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, done, total, onSaveSession]);

  // ESC para sair
  useEffect(() => {
    if (!active) return;
    const handler = e => { if (e.key === 'Escape') { setActive(false); clearInterval(intervalRef.current); setRunning(false); } };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [active]);

  const mm = Math.floor(seconds / 60);
  const ss = seconds % 60;
  const display = `${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
  const pct = total > 0 ? ((total - seconds) / total) * 100 : 0;
  const timeColor = done ? '#10b981' : seconds <= 60 ? '#ef4444' : '#e2e8f0';

  return (
    <>
      {/* Card de entrada */}
      <div style={card}>
        <div style={cardHeader}>
          <div style={toolIcon}>🌙</div>
          <div>
            <div style={toolName}>Modo Foco</div>
            <div style={toolDesc}>Tela limpa, sem distrações. Só você e o timer.</div>
          </div>
        </div>
        <div style={cardBody}>
          <p style={{ fontSize:'0.84rem', color:'#6b8aaa', marginBottom:12 }}>
            Escolha a duração e entre em modo de foco total:
          </p>
          <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' }}>
            {[25, 50, 90].map(min => (
              <button key={min} onClick={() => { setDurMin(min); applyDuration(min); }}
                style={{ ...s.btnOutline, ...(durMin === min ? s.btnOutlineActive : {}), flex:1 }}>
                {min} min
              </button>
            ))}
          </div>
          <button onClick={() => setActive(true)}
            style={{ ...s.btnPurple, width:'100%', justifyContent:'center', padding:'11px' }}>
            🌙 Entrar no Modo Foco
          </button>
          <p style={{ fontSize:'0.72rem', color:'#334155', marginTop:8, textAlign:'center' }}>
            ESC para sair · sessão salva automaticamente
          </p>
        </div>
      </div>

      {/* Overlay full-screen */}
      {active && (
        <div style={{ position:'fixed', inset:0, background:'#020b15', zIndex:9999,
            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
            gap:24, fontFamily:"'Source Sans 3',sans-serif" }}>

          {/* Fechar */}
          <button onClick={() => { setActive(false); clearInterval(intervalRef.current); setRunning(false); }}
            style={{ position:'absolute', top:20, right:24, background:'transparent',
              border:'1px solid rgba(255,255,255,0.1)', color:'#6b8aaa', borderRadius:8,
              padding:'7px 14px', cursor:'pointer', fontSize:'0.82rem',
              fontFamily:'inherit', transition:'all 0.15s' }}
            onMouseEnter={e => { e.target.style.borderColor='rgba(239,68,68,0.5)'; e.target.style.color='#ef4444'; }}
            onMouseLeave={e => { e.target.style.borderColor='rgba(255,255,255,0.1)'; e.target.style.color='#6b8aaa'; }}>
            ✕ Sair (ESC)
          </button>

          {/* Logo */}
          <div style={{ textAlign:'center' }}>
            <img src="/logo_rfb.png" alt="RFB" style={{ width:44, opacity:0.6 }}/>
            <div style={{ fontSize:'0.7rem', letterSpacing:'0.14em', textTransform:'uppercase',
                color:'#334155', marginTop:5 }}>Modo Foco · RFB</div>
          </div>

          {/* Input matéria */}
          <input value={materia} onChange={e => setMateria(e.target.value)}
            placeholder="O que você vai estudar agora?"
            style={{ width:340, maxWidth:'90vw', background:'rgba(255,255,255,0.04)',
              border:'1px solid rgba(255,255,255,0.1)', borderRadius:10,
              color:'#e2e8f0', fontFamily:'inherit', fontSize:'1rem',
              padding:'11px 16px', textAlign:'center', outline:'none' }}/>

          {/* Timer display */}
          <div>
            <div style={{ fontFamily:"'Oswald',sans-serif", fontSize:'6rem', fontWeight:700,
                color: timeColor, letterSpacing:'0.04em', lineHeight:1, textAlign:'center',
                transition:'color 0.3s' }}>
              {display}
            </div>
            {/* Barra de progresso */}
            <div style={{ width:300, height:4, background:'rgba(255,255,255,0.06)',
                borderRadius:99, margin:'12px auto 0', overflow:'hidden' }}>
              <div style={{ height:'100%', borderRadius:99, transition:'width 1s linear',
                  width:`${pct}%`,
                  background: done ? '#10b981' : 'linear-gradient(90deg,#1a6fc4,#2a8fd4)' }}/>
            </div>
            <div style={{ fontSize:'0.82rem', color:'#334155', textAlign:'center', marginTop:8,
                textTransform:'uppercase', letterSpacing:'0.1em' }}>
              {done ? '✅ Sessão concluída!' : running ? `Estudando: ${materia || 'Foco total'}` : 'Pronto para começar'}
            </div>
          </div>

          {/* Controles */}
          <div style={{ display:'flex', gap:12 }}>
            <button onClick={toggle}
              style={{ padding:'12px 32px', borderRadius:10, border:'none', cursor:'pointer',
                fontFamily:"'Oswald',sans-serif", fontSize:'1rem', fontWeight:600,
                letterSpacing:'0.06em', transition:'all 0.15s',
                ...(done
                  ? { background:'rgba(16,185,129,0.2)', color:'#10b981', border:'1px solid rgba(16,185,129,0.35)' }
                  : running
                    ? { background:'rgba(245,158,11,0.15)', color:'#f59e0b', border:'1px solid rgba(245,158,11,0.3)' }
                    : { background:'#1a6fc4', color:'#fff' }
                ) }}>
              {done ? '↺ Nova sessão' : running ? '⏸ Pausar' : '▶ Iniciar'}
            </button>
            <button onClick={() => applyDuration(durMin)}
              style={{ padding:'12px 20px', borderRadius:10, cursor:'pointer',
                fontFamily:"'Oswald',sans-serif", fontSize:'1rem', fontWeight:600,
                letterSpacing:'0.06em', background:'rgba(255,255,255,0.04)',
                border:'1px solid rgba(255,255,255,0.1)', color:'#6b8aaa', transition:'all 0.15s' }}>
              ↺ Reset
            </button>
          </div>

          {/* Seletor de duração */}
          <div style={{ display:'flex', alignItems:'center', gap:10, fontSize:'0.84rem', color:'#334155' }}>
            <span>Duração:</span>
            {[25, 50, 90].map(min => (
              <button key={min} onClick={() => { setDurMin(min); applyDuration(min); }}
                style={{ padding:'4px 12px', borderRadius:6, cursor:'pointer', fontSize:'0.82rem',
                  fontFamily:'inherit', transition:'all 0.15s',
                  background: durMin === min ? 'rgba(26,111,196,0.25)' : 'rgba(255,255,255,0.04)',
                  border: durMin === min ? '1px solid rgba(26,111,196,0.5)' : '1px solid rgba(255,255,255,0.08)',
                  color: durMin === min ? '#2a8fd4' : '#6b8aaa' }}>
                {min}m
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

// ════════════════════════════════════════════════════════════
// 📤 EXPORTAR CSV
// ════════════════════════════════════════════════════════════
function ExportarCSV({ questoes, simulados, studyLog, showToast }) {
  const diasEstudo = [...new Set(studyLog.filter(l => l.modo === 'foco').map(l => l.date))].length;
  const totalQ     = questoes.reduce((a, b) => a + (b.total || 0), 0);
  const totalAc    = questoes.reduce((a, b) => a + (b.acertos || 0), 0);
  const mediaQ     = totalQ ? Math.round(totalAc / totalQ * 100) : 0;
  const mediaSim   = simulados.length
    ? (simulados.reduce((a, s) => a + (s.nota || 0), 0) / simulados.length).toFixed(1) : 0;
  const totalMin   = studyLog.filter(l => l.modo === 'foco').reduce((a, l) => a + l.minutos, 0);
  const totalH     = (totalMin / 60).toFixed(1);

  const exportar = (tipo) => {
    let rows = [], filename = '';
    const bom = '\uFEFF';

    if (tipo === 'questoes') {
      rows.push(['Data', 'Matéria', 'Assunto', 'Total', 'Acertos', 'Erros', '% Acerto', 'Fonte', 'Observação']);
      questoes.forEach(q => rows.push([
        q.data || '', q.materia || '', q.assunto || '',
        q.total || 0, q.acertos || 0,
        (q.total || 0) - (q.acertos || 0),
        q.total ? Math.round((q.acertos / q.total) * 100) + '%' : '—',
        q.fonte || '', (q.obs || '').replace(/"/g, "'"),
      ]));
      filename = 'questoes_rfb';
    } else if (tipo === 'simulados') {
      rows.push(['Data', 'Nome', 'Nota (%)', 'Total Questões', 'Acertos', 'Matéria', 'Observações']);
      simulados.forEach(s => rows.push([
        s.data || '', s.nome || '', s.nota || '',
        s.total || '', s.acertos || '', s.materia || '',
        (s.obs || '').replace(/"/g, "'"),
      ]));
      filename = 'simulados_rfb';
    } else {
      rows.push(['Data', 'Minutos de Foco', 'Horas de Foco', 'Sessões']);
      const map = {};
      studyLog.filter(l => l.modo === 'foco').forEach(l => {
        if (!map[l.date]) map[l.date] = { min: 0, sess: 0 };
        map[l.date].min  += l.minutos;
        map[l.date].sess += 1;
      });
      Object.entries(map).sort().forEach(([d, v]) => {
        rows.push([d, v.min, (v.min / 60).toFixed(2), v.sess]);
      });
      filename = 'historico_estudo_rfb';
    }

    if (rows.length <= 1) { showToast('⚠️ Sem dados para exportar!'); return; }
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    downloadBlob(new Blob([bom + csv], { type: 'text/csv;charset=utf-8' }), filename + '_' + today() + '.csv');
    showToast('📥 CSV exportado!');
  };

  const items = [
    { icon:'📝', nome:'Questões',       sub:`${totalQ} registros · ${mediaQ}% acertos`,     count: questoes.length, tipo:'questoes' },
    { icon:'🎯', nome:'Simulados',      sub:`Média geral: ${mediaSim}%`,                     count: simulados.length, tipo:'simulados' },
    { icon:'⏱️', nome:'Histórico Foco', sub:`${totalH}h registradas · ${diasEstudo} dias`,   count: diasEstudo, tipo:'estudo' },
  ];

  return (
    <div style={card}>
      <div style={cardHeader}>
        <div style={toolIcon}>📤</div>
        <div>
          <div style={toolName}>Exportar Dados (CSV)</div>
          <div style={toolDesc}>Baixe seus dados para análise no Excel ou Google Sheets.</div>
        </div>
      </div>
      <div style={cardBody}>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {items.map(it => (
            <div key={it.tipo} style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                padding:'12px 14px', background:'#0a1f35', border:'1px solid rgba(26,111,196,0.15)',
                borderRadius:9 }}>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <span style={{ fontSize:'1.3rem' }}>{it.icon}</span>
                <div>
                  <div style={{ fontSize:'0.88rem', fontWeight:600, color:'#e8edf4' }}>{it.nome}</div>
                  <div style={{ fontSize:'0.75rem', color:'#6b8aaa' }}>{it.sub}</div>
                </div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ fontFamily:"'Oswald',sans-serif", fontSize:'1.4rem', fontWeight:700, color:'#2a8fd4' }}>
                  {it.count}
                </div>
                <button onClick={() => exportar(it.tipo)} style={s.btnGreen}>CSV</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// 💾 BACKUP / RESTORE
// ════════════════════════════════════════════════════════════
function BackupRestore({ showToast }) {
  const fileRef = useRef(null);

  const getRFBKeys = () => {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('rfb_')) keys.push(k);
    }
    return keys;
  };

  const keys    = getRFBKeys();
  const totalKB = (keys.reduce((a, k) => a + (localStorage.getItem(k) || '').length, 0) / 1024).toFixed(1);

  const getCount = (key) => {
    try {
      const v = JSON.parse(localStorage.getItem(key));
      if (Array.isArray(v)) return v.length;
    } catch {}
    return null;
  };

  const exportar = () => {
    const backup = { version: 2, exportedAt: new Date().toISOString(), data: {} };
    keys.forEach(k => {
      try { backup.data[k] = JSON.parse(localStorage.getItem(k)); }
      catch { backup.data[k] = localStorage.getItem(k); }
    });
    downloadBlob(
      new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }),
      'rfb_backup_' + today() + '.json'
    );
    showToast('💾 Backup exportado!');
  };

  const restaurar = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const backup = JSON.parse(e.target.result);
        if (!backup.data || typeof backup.data !== 'object') {
          showToast('❌ Arquivo inválido!'); return;
        }
        const dataStr = backup.exportedAt
          ? new Date(backup.exportedAt).toLocaleString('pt-BR') : 'data desconhecida';
        if (!window.confirm(`Restaurar backup de ${dataStr}?\n\nTodos os dados atuais serão sobrescritos. Esta ação não pode ser desfeita.`)) return;
        Object.entries(backup.data).forEach(([k, v]) => {
          localStorage.setItem(k, JSON.stringify(v));
        });
        showToast(`✅ ${Object.keys(backup.data).length} itens restaurados! Recarregando…`);
        setTimeout(() => window.location.reload(), 1500);
      } catch { showToast('❌ Erro ao ler o backup!'); }
    };
    reader.readAsText(file);
    if (fileRef.current) fileRef.current.value = '';
  };

  const infoRows = [
    ['Chaves salvas',         keys.length],
    ['Questões registradas',  getCount('rfb_v1_questoes') ?? '—'],
    ['Simulados',             getCount('rfb_v1_simulados') ?? '—'],
    ['Flashcards',            getCount('rfb_v1_flashcards') ?? '—'],
    ['Tamanho estimado',      totalKB + ' KB'],
  ];

  return (
    <div style={card}>
      <div style={cardHeader}>
        <div style={toolIcon}>💾</div>
        <div>
          <div style={toolName}>Backup & Restauração</div>
          <div style={toolDesc}>Exporte todos os seus dados em JSON. Útil para trocar de computador.</div>
        </div>
      </div>
      <div style={cardBody}>
        {/* Info */}
        <div style={{ background:'#0a1f35', borderRadius:9, padding:'12px 14px', marginBottom:14 }}>
          {infoRows.map(([label, val]) => (
            <div key={label} style={{ display:'flex', justifyContent:'space-between',
                padding:'5px 0', fontSize:'0.83rem',
                borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
              <span style={{ color:'#6b8aaa' }}>{label}</span>
              <span style={{ color:'#e8edf4', fontWeight:600 }}>{val}</span>
            </div>
          ))}
        </div>

        <button onClick={exportar}
          style={{ ...s.btnPrimary, width:'100%', justifyContent:'center', marginBottom:14 }}>
          📥 Fazer Backup (JSON)
        </button>

        <div style={{ height:1, background:'rgba(26,111,196,0.18)', marginBottom:14 }}/>

        <p style={{ fontSize:'0.83rem', color:'#6b8aaa', marginBottom:10 }}>
          Restaurar a partir de um backup:
        </p>

        {/* Drop zone */}
        <label style={{ display:'block', border:'2px dashed rgba(26,111,196,0.3)',
            borderRadius:10, padding:'18px', textAlign:'center', cursor:'pointer',
            color:'#6b8aaa', fontSize:'0.86rem', transition:'all 0.2s',
            position:'relative' }}
          onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor='rgba(26,111,196,0.7)'; e.currentTarget.style.background='rgba(26,111,196,0.05)'; }}
          onDragLeave={e => { e.currentTarget.style.borderColor='rgba(26,111,196,0.3)'; e.currentTarget.style.background='transparent'; }}
          onDrop={e => {
            e.preventDefault();
            e.currentTarget.style.borderColor = 'rgba(26,111,196,0.3)';
            e.currentTarget.style.background = 'transparent';
            const file = e.dataTransfer.files[0];
            if (file?.name.endsWith('.json')) restaurar(file);
            else showToast('⚠️ Selecione um arquivo .json');
          }}>
          <input ref={fileRef} type="file" accept=".json"
            style={{ position:'absolute', inset:0, opacity:0, cursor:'pointer' }}
            onChange={e => restaurar(e.target.files[0])}/>
          <div style={{ fontSize:'1.8rem', marginBottom:6 }}>📂</div>
          <div>Arraste o JSON aqui ou clique para selecionar</div>
        </label>

        <p style={{ fontSize:'0.75rem', color:'rgba(239,68,68,0.8)', marginTop:8, lineHeight:1.4 }}>
          ⚠️ Restaurar sobrescreve TODOS os dados atuais. Faça um backup antes.
        </p>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// 🖨️ IMPRIMIR CICLO
// ════════════════════════════════════════════════════════════
function ImprimirCiclo({ questoes, simulados, studyLog, checked, showToast }) {
  const [comQ,   setComQ]   = useState(true);
  const [comH,   setComH]   = useState(true);
  const [comCal, setComCal] = useState(true);
  const [comTrk, setComTrk] = useState(true);

  // Stats dos últimos 30 dias
  const { dias, statsResumo } = (() => {
    const now = new Date();
    const dias = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const qSess = questoes.filter(q => q.data === key);
      const qTot  = qSess.reduce((a, b) => a + (b.total || 0), 0);
      const min   = studyLog.filter(l => l.date === key && l.modo === 'foco').reduce((a, l) => a + l.minutos, 0);
      dias.push({ key, d, q: qTot, min });
    }
    const diasAtivos  = dias.filter(d => d.min > 0 || d.q > 0).length;
    const totalMin    = dias.reduce((a, d) => a + d.min, 0);
    const totalQ      = dias.reduce((a, d) => a + d.q, 0);
    const totalAc     = questoes.filter(q => dias.map(d => d.key).includes(q.data)).reduce((a, q) => a + (q.acertos || 0), 0);
    const pct         = totalQ ? Math.round(totalAc / totalQ * 100) : 0;
    return { dias, statsResumo: { diasAtivos, totalH: (totalMin/60).toFixed(1), totalQ, pct } };
  })();

  const totalChecked = Object.values(checked).filter(Boolean).length;
  const totalAssuntos = PROGRAMA.reduce((a, b) => a + b.materias.reduce((c, d) => c + d.assuntos.length, 0), 0);
  const pctTracker = totalAssuntos ? Math.round(totalChecked / totalAssuntos * 100) : 0;

  const imprimir = () => {
    const nowStr = new Date().toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' });
    const { diasAtivos, totalH, totalQ, pct } = statsResumo;

    // Calendário
    let calHTML = '';
    if (comCal) {
      calHTML = `<h2 style="font-family:'Oswald';color:#0d3d6e;font-size:13pt;margin:22px 0 10px;border-bottom:2px solid #1a6fc4;padding-bottom:5px">📅 Calendário de Atividade — Últimos 30 Dias</h2>`;
      calHTML += `<table style="width:100%;border-collapse:collapse;margin-bottom:16px"><tr>`;
      ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].forEach(d =>
        calHTML += `<th style="font-size:8pt;color:#999;text-align:center;padding:3px;font-weight:600">${d}</th>`);
      calHTML += '</tr><tr>';
      const firstDow = dias[0].d.getDay();
      for (let i = 0; i < firstDow; i++) calHTML += '<td></td>';
      dias.forEach((dia, idx) => {
        if (idx > 0 && dia.d.getDay() === 0) calHTML += '</tr><tr>';
        const ativo = dia.min > 0 || dia.q > 0;
        const intens = Math.min(1, dia.min / 120 + dia.q / 50);
        const bg  = ativo ? `rgba(26,111,196,${(0.15 + intens * 0.7).toFixed(2)})` : '#f7f7f7';
        const col = ativo ? (intens > 0.5 ? '#fff' : '#0d3d6e') : '#ccc';
        const hoje = dia.key === today();
        calHTML += `<td style="padding:3px;text-align:center">
          <div style="background:${bg};border-radius:5px;padding:4px 2px;${hoje ? 'outline:2px solid #1a6fc4;' : ''}">
            <div style="font-size:9pt;font-weight:700;color:${col}">${dia.d.getDate()}</div>
            ${ativo ? `<div style="font-size:7pt;color:${col};opacity:0.85">${dia.min > 0 ? Math.round(dia.min/60*10)/10+'h' : ''}</div>` : '<div style="font-size:7pt;color:#ccc">—</div>'}
          </div>
        </td>`;
      });
      calHTML += '</tr></table>';
    }

    // Tabela diária
    let tabelaHTML = '';
    if (comQ || comH) {
      tabelaHTML = `<h2 style="font-family:'Oswald';color:#0d3d6e;font-size:13pt;margin:22px 0 10px;border-bottom:2px solid #1a6fc4;padding-bottom:5px">📈 Atividade Diária</h2>`;
      tabelaHTML += `<table style="width:100%;border-collapse:collapse;font-size:9pt">`;
      tabelaHTML += `<tr style="background:#e8f0fb"><th style="padding:5px 8px;text-align:left">Data</th>`;
      if (comQ) tabelaHTML += `<th style="padding:5px 8px;text-align:center">Questões</th>`;
      if (comH) tabelaHTML += `<th style="padding:5px 8px;text-align:center">Foco</th>`;
      tabelaHTML += `<th style="padding:5px 8px;text-align:center">Status</th></tr>`;
      dias.filter(d => d.q > 0 || d.min > 0).forEach((dia, i) => {
        const bg = i % 2 === 0 ? '#fff' : '#f9fafb';
        const ok = dia.q >= 10 || dia.min >= 60;
        tabelaHTML += `<tr style="background:${bg}">
          <td style="padding:4px 8px">${dia.d.toLocaleDateString('pt-BR',{weekday:'short',day:'2-digit',month:'2-digit'})}</td>
          ${comQ ? `<td style="padding:4px 8px;text-align:center;font-weight:${dia.q>0?700:400};color:${dia.q>0?'#0d3d6e':'#bbb'}">${dia.q||'—'}</td>` : ''}
          ${comH ? `<td style="padding:4px 8px;text-align:center;font-weight:${dia.min>0?700:400};color:${dia.min>0?'#0d3d6e':'#bbb'}">${dia.min>0?(dia.min/60).toFixed(1)+'h':'—'}</td>` : ''}
          <td style="padding:4px 8px;text-align:center">${ok?'✅':'📌'}</td>
        </tr>`;
      });
      tabelaHTML += '</table>';
    }

    // Tracker
    let trkHTML = '';
    if (comTrk) {
      trkHTML = `<h2 style="font-family:'Oswald';color:#0d3d6e;font-size:13pt;margin:22px 0 10px;border-bottom:2px solid #1a6fc4;padding-bottom:5px">📋 Progresso do Edital</h2>`;
      trkHTML += `<div style="display:flex;gap:14px;margin-bottom:12px;flex-wrap:wrap">`;
      [
        { v: pctTracker + '%', l: 'Conteúdo concluído' },
        { v: totalChecked,     l: 'Tópicos marcados' },
        { v: totalAssuntos - totalChecked, l: 'Restantes' },
      ].forEach(({ v, l }) => {
        trkHTML += `<div style="flex:1;min-width:100px;text-align:center;padding:10px;background:#e8f0fb;border-radius:8px">
          <div style="font-family:'Oswald';font-size:22pt;font-weight:700;color:#0d3d6e">${v}</div>
          <div style="font-size:8pt;color:#777">${l}</div>
        </div>`;
      });
      trkHTML += '</div>';
      trkHTML += `<div style="background:#e8f0fb;border-radius:99px;height:14px;overflow:hidden;margin-bottom:14px">
        <div style="background:#1a6fc4;height:100%;width:${pctTracker}%;border-radius:99px"></div>
      </div>`;

      // Blocos
      PROGRAMA.forEach(bloco => {
        const tot = bloco.materias.reduce((a, m) => a + m.assuntos.length, 0);
        const fet = bloco.materias.reduce((a, mat) =>
          a + mat.assuntos.filter((_, ai) => checked[`${bloco.id}__${mat.nome}__${ai}`]).length, 0);
        const p = tot ? Math.round(fet / tot * 100) : 0;
        trkHTML += `<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;font-size:9pt">
          <span style="min-width:180px;color:#333">${escHtml(bloco.nome)}</span>
          <div style="flex:1;background:#e8f0fb;border-radius:99px;height:8px;overflow:hidden">
            <div style="background:#1a6fc4;height:100%;width:${p}%;border-radius:99px"></div>
          </div>
          <span style="min-width:40px;text-align:right;font-weight:700;color:#0d3d6e">${p}%</span>
        </div>`;
      });
    }

    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
    <link href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;600;700&family=Source+Sans+3:wght@400;600&display=swap" rel="stylesheet">
    <style>
      @page { margin: 18mm 16mm; }
      body { font-family:'Source Sans 3',sans-serif; color:#111; font-size:10pt; }
    </style></head><body>
    <div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #1a6fc4;padding-bottom:10px;margin-bottom:20px">
      <div>
        <h1 style="font-family:'Oswald';font-size:18pt;color:#0d3d6e;margin:0 0 3px">📊 Ciclo de Estudos — 30 Dias</h1>
        <div style="font-size:9pt;color:#777">Projeto RFB · Auditor Federal · Edital Nº 1/2022</div>
      </div>
      <div style="text-align:right;font-size:9pt;color:#999">Gerado em ${nowStr}</div>
    </div>

    <div style="display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap">
      ${[
        { v: diasAtivos, l: 'Dias ativos' },
        { v: totalH + 'h', l: 'Horas de foco' },
        { v: totalQ, l: 'Questões' },
        { v: pct + '%', l: 'Acertos' },
      ].map(({ v, l }) => `<div style="flex:1;min-width:90px;text-align:center;padding:10px;background:#e8f0fb;border-radius:8px"><div style="font-family:'Oswald';font-size:22pt;font-weight:700;color:#0d3d6e">${v}</div><div style="font-size:8pt;color:#777">${l}</div></div>`).join('')}
    </div>

    ${calHTML}${tabelaHTML}${trkHTML}

    <div style="margin-top:24px;border-top:1px solid #ddd;padding-top:8px;font-size:7.5pt;color:#bbb;display:flex;justify-content:space-between">
      <span>Projeto RFB — Auditor Federal</span><span>Edital Nº 1/2022 · FGV</span><span>${nowStr}</span>
    </div>
    </body></html>`;

    printViaIframe(html);
    showToast('🖨️ Abrindo janela de impressão…');
  };

  return (
    <div style={card}>
      <div style={cardHeader}>
        <div style={toolIcon}>🖨️</div>
        <div>
          <div style={toolName}>Imprimir Ciclo de Estudos</div>
          <div style={toolDesc}>Gere um PDF dos últimos 30 dias para imprimir e colar na parede.</div>
        </div>
      </div>
      <div style={cardBody}>
        {/* Stats preview */}
        <div style={{ display:'flex', gap:10, marginBottom:14, flexWrap:'wrap' }}>
          {[
            { v: statsResumo.diasAtivos, l: 'Dias ativos' },
            { v: statsResumo.totalH + 'h', l: 'Horas' },
            { v: statsResumo.totalQ, l: 'Questões' },
            { v: pctTracker + '%', l: 'Edital' },
          ].map(({ v, l }) => (
            <div key={l} style={{ flex:1, minWidth:70, textAlign:'center', padding:'10px 8px',
                background:'rgba(26,111,196,0.08)', border:'1px solid rgba(26,111,196,0.15)',
                borderRadius:8 }}>
              <div style={{ fontFamily:"'Oswald',sans-serif", fontSize:'1.5rem', fontWeight:700, color:'#2a8fd4' }}>{v}</div>
              <div style={{ fontSize:'0.7rem', color:'#6b8aaa', marginTop:2 }}>{l}</div>
            </div>
          ))}
        </div>

        {/* Opções */}
        <div style={{ display:'flex', flexDirection:'column', gap:7, marginBottom:16 }}>
          {[
            [comQ,   setComQ,   'Incluir questões por dia'],
            [comH,   setComH,   'Incluir horas de foco'],
            [comCal, setComCal, 'Grade de calendário visual'],
            [comTrk, setComTrk, 'Resumo do Tracker (% por bloco)'],
          ].map(([val, setter, label]) => (
            <label key={label} style={{ display:'flex', alignItems:'center', gap:10,
                padding:'8px 12px', background:'#0a1f35', borderRadius:7,
                cursor:'pointer', fontSize:'0.84rem', color:'#e8edf4' }}>
              <input type="checkbox" checked={val} onChange={e => setter(e.target.checked)}
                style={{ accentColor:'#1a6fc4', width:14, height:14, cursor:'pointer' }}/>
              {label}
            </label>
          ))}
        </div>

        <button onClick={imprimir}
          style={{ ...s.btnYellow, width:'100%', justifyContent:'center', padding:'11px' }}>
          🖨️ Imprimir / Salvar como PDF
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════
export default function Ferramentas() {
  const [questoes]  = useStorage('questoes',  []);
  const [simulados] = useStorage('simulados', []);
  const [studyLog, setStudyLog] = useStorage('studylog', []);
  const { checked } = useTrackerStorage();

  const [toastMsg, showToast] = useToast();

  const saveSession = useCallback((minutos) => {
    setStudyLog(prev => [...prev, { date: today(), modo: 'foco', minutos }]);
    showToast(`✅ Sessão de ${minutos} min salva!`);
  }, [setStudyLog, showToast]);

  return (
    <div>
      {/* Cabeçalho */}
      <div style={{ marginBottom:28 }}>
        <div style={{ fontFamily:"'Oswald',sans-serif", fontSize:'1.6rem', fontWeight:600,
            letterSpacing:'0.04em', color:'#e8edf4', marginBottom:6 }}>
          🔧 <span style={{ color:'#2a8fd4' }}>Ferramentas</span>
        </div>
        <div style={{ fontSize:'0.88rem', color:'#6b8aaa' }}>
          Utilitários para potencializar seus estudos e proteger seus dados
        </div>
      </div>

      {/* Grid 2 colunas */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(460px,1fr))', gap:20 }}>
        <ModoFoco onSaveSession={saveSession} />
        <ExportarCSV questoes={questoes} simulados={simulados} studyLog={studyLog} showToast={showToast} />
        <BackupRestore showToast={showToast} />
        <ImprimirCiclo questoes={questoes} simulados={simulados} studyLog={studyLog} checked={checked} showToast={showToast} />
      </div>

      {/* Toast */}
      {toastMsg && (
        <div style={{ position:'fixed', bottom:28, right:28, background:'#0a1f35',
            border:'1px solid rgba(26,111,196,0.4)', borderRadius:10, padding:'12px 20px',
            fontSize:'0.88rem', color:'#e8edf4', zIndex:9999,
            boxShadow:'0 4px 20px rgba(0,0,0,0.5)' }}>
          {toastMsg}
        </div>
      )}
    </div>
  );
}

// ── Estilos compartilhados ──────────────────────────────────
const card = {
  background: '#071828',
  border: '1px solid rgba(26,111,196,0.22)',
  borderRadius: 14,
  overflow: 'hidden',
};
const cardHeader = {
  padding: '18px 20px 14px',
  borderBottom: '1px solid rgba(26,111,196,0.15)',
  display: 'flex',
  alignItems: 'flex-start',
  gap: 14,
};
const cardBody    = { padding: '18px 20px' };
const toolIcon    = { fontSize:'1.8rem', flexShrink:0, marginTop:2 };
const toolName    = { fontFamily:"'Oswald',sans-serif", fontSize:'1rem', fontWeight:600, color:'#e8edf4', marginBottom:4 };
const toolDesc    = { fontSize:'0.83rem', color:'#6b8aaa', lineHeight:1.5 };

const s = {
  btnPrimary:     { display:'inline-flex', alignItems:'center', gap:7, padding:'10px 18px', borderRadius:8, background:'#1a6fc4', color:'#fff', border:'none', fontSize:'0.88rem', fontWeight:600, cursor:'pointer', fontFamily:'inherit', transition:'all 0.15s' },
  btnOutline:     { display:'inline-flex', alignItems:'center', justifyContent:'center', gap:7, padding:'8px 14px', borderRadius:8, background:'transparent', border:'1px solid rgba(255,255,255,0.12)', color:'#6b8aaa', fontSize:'0.84rem', fontWeight:500, cursor:'pointer', fontFamily:'inherit', transition:'all 0.15s' },
  btnOutlineActive:{ background:'rgba(26,111,196,0.18)', borderColor:'rgba(26,111,196,0.45)', color:'#2a8fd4' },
  btnGreen:       { display:'inline-flex', alignItems:'center', gap:6, padding:'6px 12px', borderRadius:7, background:'rgba(16,185,129,0.12)', border:'1px solid rgba(16,185,129,0.25)', color:'#10b981', fontSize:'0.8rem', fontWeight:600, cursor:'pointer', fontFamily:'inherit' },
  btnYellow:      { display:'inline-flex', alignItems:'center', gap:7, padding:'10px 18px', borderRadius:8, background:'rgba(245,158,11,0.12)', border:'1px solid rgba(245,158,11,0.3)', color:'#f59e0b', fontSize:'0.88rem', fontWeight:600, cursor:'pointer', fontFamily:'inherit', transition:'all 0.15s' },
  btnPurple:      { display:'inline-flex', alignItems:'center', gap:7, padding:'10px 18px', borderRadius:8, background:'rgba(139,92,246,0.15)', border:'1px solid rgba(139,92,246,0.3)', color:'#a78bfa', fontSize:'0.88rem', fontWeight:600, cursor:'pointer', fontFamily:'inherit', transition:'all 0.15s' },
};
