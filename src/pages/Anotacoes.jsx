import { useState, useMemo, useRef, useCallback } from 'react';
import { useStorage } from '../hooks/useStorage';

/* ══════════════════════════════════════════════════════════════
   CADERNO DE ANOTAÇÕES
   - Uma nota por matéria (resumos, macetes, jurisprudências)
   - Editor livre + tags + cores
   - Busca global
   - 🖨️ Imprimir / Salvar como PDF
   - 💾 Exportar .txt
═══════════════════════════════════════════════════════════════ */

const MATERIAS = [
  'Língua Portuguesa','Língua Inglesa','Raciocínio Lógico-Matemático',
  'Estatística','Fluência em Dados','Economia e Finanças Públicas',
  'Administração Geral','Administração Pública','Auditoria',
  'Contabilidade Geral e Pública','Direito Constitucional',
  'Direito Administrativo','Direito Tributário','Legislação Tributária',
  'Legislação Aduaneira','Direito Previdenciário','Geral / Outros',
];

const CORES_NOTA = [
  { id:'roxo',    bg:'rgba(99,102,241,0.12)',  borda:'rgba(99,102,241,0.3)',  dot:'#6366f1' },
  { id:'ciano',   bg:'rgba(34,211,238,0.10)',  borda:'rgba(34,211,238,0.3)',  dot:'#22d3ee' },
  { id:'verde',   bg:'rgba(16,185,129,0.10)',  borda:'rgba(16,185,129,0.3)',  dot:'#10b981' },
  { id:'amarelo', bg:'rgba(245,158,11,0.10)',  borda:'rgba(245,158,11,0.3)',  dot:'#f59e0b' },
  { id:'vermelho',bg:'rgba(239,68,68,0.10)',   borda:'rgba(239,68,68,0.3)',   dot:'#ef4444' },
];
const corPorId = (id) => CORES_NOTA.find(c => c.id === id) || CORES_NOTA[0];

const notaVazia = {
  id: null, titulo: '', materia: '', conteudo: '', tags: '', cor: 'roxo',
  criada: '', atualizada: '',
};

// ── Impressão via iframe ────────────────────────────────────────
function imprimirNotas(notas, ids, opts) {
  const { withHeader, withDate, withBreak } = opts;
  const now = new Date().toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' });

  const esc = str => str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  let html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
  <link href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;600;700&family=Source+Sans+3:wght@400;600&display=swap" rel="stylesheet">
  <style>
    @page { margin: 20mm 18mm; }
    body { font-family:'Source Sans 3',sans-serif; color:#111; font-size:10.5pt; line-height:1.75; }
    .ph  { display:flex; justify-content:space-between; align-items:flex-end; border-bottom:3px solid #1a6fc4; padding-bottom:10px; margin-bottom:28px; }
    .ph h1 { font-family:'Oswald',sans-serif; font-size:18pt; color:#0d3d6e; margin:0 0 3px; }
    .ph-sub { font-size:9pt; color:#777; }
    .ph-date { font-size:9pt; color:#999; text-align:right; }
    .nota { ${withBreak ? 'page-break-before:always;' : 'margin-bottom:32px;'} }
    .nota:first-of-type { page-break-before:avoid; }
    .nota-title { font-family:'Oswald',sans-serif; font-size:13pt; font-weight:700; color:#0d3d6e; border-bottom:2px solid #1a6fc4; padding-bottom:5px; margin-bottom:8px; }
    .nota-meta  { font-size:8pt; color:#999; margin-bottom:10px; display:flex; gap:14px; flex-wrap:wrap; }
    .nota-tag   { background:#e8f0fb; color:#1a6fc4; padding:1px 7px; border-radius:20px; font-size:7.5pt; font-weight:600; }
    .nota-body  { white-space:pre-wrap; word-break:break-word; font-size:10.5pt; line-height:1.75; color:#222; }
    .nota-empty { color:#bbb; font-style:italic; }
  </style></head><body>`;

  if (withHeader) {
    html += `<div class="ph"><div><h1>📓 Caderno de Anotações</h1><div class="ph-sub">Projeto RFB — Auditor Federal · Edital Nº 1/2022</div></div><div class="ph-date">Impresso em<br>${now}</div></div>`;
  }

  ids.forEach(id => {
    const n = notas.find(x => x.id === id);
    if (!n) return;
    const tags = n.tags ? n.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
    html += `<div class="nota">`;
    html += `<div class="nota-title">${esc(n.titulo || '(sem título)')}</div>`;
    html += `<div class="nota-meta">`;
    if (n.materia) html += `<span>${esc(n.materia)}</span>`;
    if (withDate && n.atualizada) html += `<span>Atualizado: ${n.atualizada}</span>`;
    tags.forEach(t => html += `<span class="nota-tag">${esc(t)}</span>`);
    html += `</div>`;
    if (n.conteudo?.trim()) {
      html += `<div class="nota-body">${esc(n.conteudo)}</div>`;
    } else {
      html += `<div class="nota-empty">Sem conteúdo registrado.</div>`;
    }
    html += `</div>`;
  });

  html += `<div style="margin-top:28px;border-top:1px solid #ddd;padding-top:8px;font-size:7.5pt;color:#bbb;display:flex;justify-content:space-between"><span>Projeto RFB — Auditor Federal</span><span>Impresso em ${now}</span></div>`;
  html += `</body></html>`;

  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;';
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument || iframe.contentWindow.document;
  doc.open(); doc.write(html); doc.close();
  iframe.contentWindow.focus();
  setTimeout(() => {
    iframe.contentWindow.print();
    setTimeout(() => document.body.removeChild(iframe), 1500);
  }, 600);
}

// ── Modal de impressão ──────────────────────────────────────────
function ModalImpressao({ notas, onClose }) {
  const [selecionadas, setSelecionadas]   = useState(() => new Set(notas.filter(n => n.conteudo?.trim()).map(n => n.id)));
  const [withHeader, setWithHeader] = useState(true);
  const [withDate,   setWithDate]   = useState(true);
  const [withBreak,  setWithBreak]  = useState(true);

  const toggle = id => setSelecionadas(prev => {
    const s = new Set(prev);
    s.has(id) ? s.delete(id) : s.add(id);
    return s;
  });
  const selecionarTodas  = v => setSelecionadas(v ? new Set(notas.map(n => n.id)) : new Set());
  const selecionarComNota = () => setSelecionadas(new Set(notas.filter(n => n.conteudo?.trim()).map(n => n.id)));

  const executar = () => {
    if (selecionadas.size === 0) return;
    const ids = notas.filter(n => selecionadas.has(n.id)).map(n => n.id);
    imprimirNotas(notas, ids, { withHeader, withDate, withBreak });
    onClose();
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(3,15,32,0.88)', zIndex:1000,
        display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:'#071828', border:'1px solid rgba(26,111,196,0.22)',
          borderRadius:14, width:'100%', maxWidth:500, padding:28, maxHeight:'85vh', overflowY:'auto' }}>

        <div style={{ fontFamily:"'Oswald',sans-serif", fontSize:'1.1rem', fontWeight:600,
            color:'#e8edf4', marginBottom:18 }}>🖨️ Imprimir / Salvar como PDF</div>

        {/* Seleção */}
        <div style={{ marginBottom:16 }}>
          <div style={s.modalLabel}>Selecionar notas</div>
          <div style={{ display:'flex', gap:8, marginBottom:8 }}>
            <button style={s.btnOutlineSm} onClick={() => selecionarTodas(true)}>Todas</button>
            <button style={s.btnOutlineSm} onClick={() => selecionarTodas(false)}>Nenhuma</button>
            <button style={s.btnOutlineSm} onClick={selecionarComNota}>Só com conteúdo</button>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:5, maxHeight:220, overflowY:'auto' }}>
            {notas.map(n => {
              const hasContent = n.conteudo?.trim();
              const cor = corPorId(n.cor);
              return (
                <label key={n.id} style={{ display:'flex', alignItems:'center', gap:10,
                    padding:'8px 12px', background:'#0a1f35', borderRadius:7, cursor:'pointer',
                    opacity: hasContent ? 1 : 0.5 }}>
                  <input type="checkbox" checked={selecionadas.has(n.id)} onChange={() => toggle(n.id)}
                    style={{ accentColor:'#1a6fc4', width:14, height:14, cursor:'pointer' }}/>
                  <span style={{ width:7, height:7, borderRadius:'50%', background:cor.dot, flexShrink:0 }}/>
                  <span style={{ fontSize:'0.86rem', color: hasContent ? '#e8edf4' : '#6b8aaa' }}>
                    {n.titulo || '(sem título)'}
                    {n.materia ? <span style={{ fontSize:'0.72rem', color:'#6b8aaa', marginLeft:6 }}>· {n.materia}</span> : null}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Opções */}
        <div style={{ marginBottom:20 }}>
          <div style={s.modalLabel}>Opções de impressão</div>
          <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
            {[
              [withHeader, setWithHeader, 'Incluir cabeçalho (título + data de impressão)'],
              [withDate,   setWithDate,   'Mostrar data de cada anotação'],
              [withBreak,  setWithBreak,  'Uma nota por página'],
            ].map(([val, setter, label]) => (
              <label key={label} style={{ display:'flex', alignItems:'center', gap:10,
                  padding:'8px 12px', background:'#0a1f35', borderRadius:7, cursor:'pointer',
                  fontSize:'0.86rem', color:'#e8edf4' }}>
                <input type="checkbox" checked={val} onChange={e => setter(e.target.checked)}
                  style={{ accentColor:'#1a6fc4', width:14, height:14, cursor:'pointer' }}/>
                {label}
              </label>
            ))}
          </div>
        </div>

        <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
          <button style={s.btnOutline} onClick={onClose}>Cancelar</button>
          <button style={{ ...s.btnYellow, opacity: selecionadas.size === 0 ? 0.4 : 1 }}
            onClick={executar} disabled={selecionadas.size === 0}>
            🖨️ Imprimir / PDF ({selecionadas.size})
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Componente principal ────────────────────────────────────────
export default function Anotacoes() {
  const [notas, setNotas]             = useStorage('anotacoes', []);
  const [selecionada, setSelecionada] = useState(null);
  const [form, setForm]               = useState(notaVazia);
  const [busca, setBusca]             = useState('');
  const [filtroMat, setFiltroMat]     = useState('');
  const [confirmarDel, setConfirmarDel] = useState(null);
  const [showPrint, setShowPrint]     = useState(false);
  const [toast, setToast]             = useState('');
  const textareaRef                   = useRef(null);

  const hoje = () => new Date().toISOString().slice(0, 10);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2800);
  }, []);

  /* Notas filtradas */
  const filtradas = useMemo(() => {
    const q = busca.toLowerCase();
    return notas.filter(n =>
      (!filtroMat || n.materia === filtroMat) &&
      (!q || n.titulo.toLowerCase().includes(q) ||
             n.conteudo.toLowerCase().includes(q) ||
             n.tags.toLowerCase().includes(q))
    ).sort((a, b) => (b.atualizada || b.criada || '').localeCompare(a.atualizada || a.criada || ''));
  }, [notas, busca, filtroMat]);

  /* Abrir nota */
  const abrirNota = (nota) => {
    setForm({ ...nota });
    setSelecionada(nota.id);
  };

  /* Nova nota */
  const novaNota = () => {
    setForm({ ...notaVazia, id: Date.now(), criada: hoje(), atualizada: hoje() });
    setSelecionada('nova');
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  /* Salvar */
  const salvar = useCallback(() => {
    if (!form.titulo.trim() && !form.conteudo.trim()) return;
    const agora = hoje();
    const nota = { ...form, atualizada: agora, id: form.id || Date.now() };
    if (!nota.criada) nota.criada = agora;
    setNotas(prev => {
      const existe = prev.find(n => n.id === nota.id);
      return existe ? prev.map(n => n.id === nota.id ? nota : n) : [nota, ...prev];
    });
    setSelecionada(nota.id);
    showToast('✅ Anotação salva!');
  }, [form, setNotas, showToast]);

  /* Deletar */
  const deletar = (id) => {
    setNotas(prev => prev.filter(n => n.id !== id));
    if (selecionada === id) { setSelecionada(null); setForm(notaVazia); }
    setConfirmarDel(null);
    showToast('🗑️ Anotação deletada');
  };

  /* Imprimir nota atual */
  const imprimirAtual = () => {
    if (!form.id) return;
    imprimirNotas(notas, [form.id], { withHeader: true, withDate: true, withBreak: false });
  };

  /* Exportar .txt */
  const exportarTxt = () => {
    let out = 'CADERNO DE ANOTAÇÕES — RFB\n';
    out += 'Exportado em: ' + new Date().toLocaleString('pt-BR') + '\n';
    out += '═'.repeat(60) + '\n\n';
    notas.forEach(n => {
      if (!n.conteudo?.trim()) return;
      out += '▌ ' + (n.titulo || '(sem título)').toUpperCase() + '\n';
      if (n.materia) out += 'Matéria: ' + n.materia + '\n';
      if (n.atualizada) out += 'Atualizado: ' + n.atualizada + '\n';
      if (n.tags) out += 'Tags: ' + n.tags + '\n';
      out += '─'.repeat(40) + '\n';
      out += n.conteudo + '\n\n';
    });
    const blob = new Blob([out], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'anotacoes_rfb_' + new Date().toISOString().slice(0, 10) + '.txt';
    a.click();
    showToast('📥 Arquivo .txt exportado!');
  };

  /* Inserir texto no cursor do textarea */
  const insertText = (txt) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end   = ta.selectionEnd;
    const before = form.conteudo.substring(0, start);
    const after  = form.conteudo.substring(end);
    const novoConteudo = before + txt + after;
    setForm(p => ({ ...p, conteudo: novoConteudo }));
    // Reposicionar cursor
    setTimeout(() => {
      ta.selectionStart = ta.selectionEnd = start + txt.length;
      ta.focus();
    }, 0);
  };

  const f = k => v => setForm(p => ({ ...p, [k]: v }));
  const editando = selecionada !== null;
  const cor = corPorId(form.cor);

  return (
    <div style={{ display:'flex', gap:0, height:'calc(100vh - 100px)', minHeight:500 }}>

      {/* ── PAINEL ESQUERDO ── */}
      <div style={{ width:280, flexShrink:0, display:'flex', flexDirection:'column',
          background:'#0d0d1a', borderRight:'1px solid rgba(255,255,255,0.06)',
          borderRadius:'12px 0 0 12px', overflow:'hidden' }}>

        {/* Header */}
        <div style={{ padding:'14px 14px 10px', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:'0.6rem', fontWeight:800, letterSpacing:'0.14em',
                  textTransform:'uppercase', color:'#6366f1', marginBottom:2 }}>CADERNO DE ANOTAÇÕES</div>
              <div style={{ fontSize:'0.68rem', color:'#334155' }}>{notas.length} nota{notas.length !== 1 ? 's' : ''}</div>
            </div>
            <button onClick={novaNota} style={s.btnNova}>+ Nova</button>
          </div>
          <input value={busca} onChange={e => setBusca(e.target.value)}
            placeholder="🔍 Buscar anotações…"
            style={{ ...s.input, width:'100%', fontSize:'0.75rem', padding:'6px 10px' }}/>
          <select value={filtroMat} onChange={e => setFiltroMat(e.target.value)}
            style={{ ...s.select, width:'100%', marginTop:6, fontSize:'0.72rem', padding:'5px 8px' }}>
            <option value="">Todas as matérias</option>
            {MATERIAS.map(m => <option key={m}>{m}</option>)}
          </select>

          {/* Ações globais */}
          <div style={{ display:'flex', gap:6, marginTop:8 }}>
            <button onClick={() => setShowPrint(true)} style={s.btnYellowSm} title="Imprimir / PDF">
              🖨️ Imprimir
            </button>
            <button onClick={exportarTxt} style={s.btnOutlineSm} title="Exportar .txt">
              💾 .txt
            </button>
          </div>
        </div>

        {/* Lista de notas */}
        <div style={{ flex:1, overflowY:'auto', padding:'6px' }}>
          {filtradas.length === 0 ? (
            <div style={{ padding:'28px 12px', textAlign:'center', color:'#1e293b', fontSize:'0.72rem' }}>
              {notas.length === 0
                ? 'Nenhuma anotação ainda.\nClique em "+ Nova" para começar.'
                : 'Nenhuma nota encontrada.'}
            </div>
          ) : filtradas.map(n => {
            const c = corPorId(n.cor);
            const ativa = selecionada === n.id;
            return (
              <div key={n.id} onClick={() => abrirNota(n)}
                style={{ padding:'10px 12px', borderRadius:8, marginBottom:4, cursor:'pointer',
                  background: ativa ? c.bg : 'rgba(255,255,255,0.02)',
                  border:`1px solid ${ativa ? c.borda : 'rgba(255,255,255,0.04)'}`,
                  borderLeft:`3px solid ${ativa ? c.dot : 'transparent'}`,
                  transition:'all 0.12s' }}>
                <div style={{ display:'flex', alignItems:'flex-start', gap:6 }}>
                  <div style={{ width:6, height:6, borderRadius:'50%', background:c.dot, flexShrink:0, marginTop:5 }}/>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:'0.78rem', fontWeight:600,
                        color: ativa ? '#e2e8f0' : '#94a3b8',
                        overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {n.titulo || '(sem título)'}
                    </div>
                    {n.materia && (
                      <div style={{ fontSize:'0.58rem', color:c.dot, marginTop:2, fontWeight:600 }}>{n.materia}</div>
                    )}
                    <div style={{ fontSize:'0.62rem', color:'#1e293b', marginTop:3,
                        overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {n.conteudo?.slice(0, 60) || '—'}
                    </div>
                    <div style={{ fontSize:'0.56rem', color:'#1e293b', marginTop:4 }}>
                      {n.atualizada || n.criada}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── PAINEL DIREITO: editor ── */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', background:'#111120',
          borderRadius:'0 12px 12px 0', overflow:'hidden',
          border:'1px solid rgba(255,255,255,0.06)', borderLeft:'none' }}>

        {!editando ? (
          <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center',
              justifyContent:'center', gap:14, color:'#1e293b' }}>
            <div style={{ fontSize:'3rem' }}>📝</div>
            <div style={{ fontSize:'0.82rem', color:'#334155' }}>Selecione uma nota ou crie uma nova</div>
            <button onClick={novaNota} style={s.btnNova}>+ Nova Anotação</button>
          </div>
        ) : (
          <>
            {/* Toolbar superior */}
            <div style={{ padding:'12px 18px', borderBottom:'1px solid rgba(255,255,255,0.06)',
                display:'flex', alignItems:'center', gap:10, flexWrap:'wrap',
                background:'rgba(255,255,255,0.01)' }}>

              {/* Título */}
              <input value={form.titulo} onChange={e => f('titulo')(e.target.value)}
                placeholder="Título da nota…"
                style={{ ...s.input, flex:1, minWidth:160, fontSize:'0.9rem', fontWeight:600,
                  padding:'6px 10px', background:'transparent', border:'none',
                  borderBottom:'1px solid rgba(255,255,255,0.06)', borderRadius:0, color:'#e2e8f0' }}/>

              {/* Cores */}
              <div style={{ display:'flex', gap:4 }}>
                {CORES_NOTA.map(c => (
                  <button key={c.id} onClick={() => f('cor')(c.id)}
                    title={c.id}
                    style={{ width:16, height:16, borderRadius:'50%', cursor:'pointer', padding:0,
                      background:c.dot, border:`2px solid ${form.cor === c.id ? '#fff' : 'transparent'}` }}/>
                ))}
              </div>

              {/* Ações */}
              <button onClick={salvar} style={s.btnSalvar}>💾 Salvar</button>
              <button onClick={imprimirAtual} style={s.btnPrint} title="Imprimir esta nota">🖨️</button>
              <button onClick={() => setConfirmarDel(form.id)}
                style={{ ...s.btnSalvar, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.25)', color:'#ef4444' }}>
                🗑
              </button>
            </div>

            {/* Metadados */}
            <div style={{ padding:'8px 18px', borderBottom:'1px solid rgba(255,255,255,0.04)',
                display:'flex', gap:12, flexWrap:'wrap', background:'rgba(255,255,255,0.01)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ fontSize:'0.6rem', color:'#334155', fontWeight:700,
                    textTransform:'uppercase', letterSpacing:'0.08em' }}>Matéria</span>
                <select value={form.materia} onChange={e => f('materia')(e.target.value)}
                  style={{ ...s.select, fontSize:'0.72rem', padding:'3px 8px' }}>
                  <option value="">— Sem matéria —</option>
                  {MATERIAS.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:6, flex:1 }}>
                <span style={{ fontSize:'0.6rem', color:'#334155', fontWeight:700,
                    textTransform:'uppercase', letterSpacing:'0.08em', whiteSpace:'nowrap' }}>Tags</span>
                <input value={form.tags} onChange={e => f('tags')(e.target.value)}
                  placeholder="macete, importante, art.150…"
                  style={{ ...s.input, flex:1, fontSize:'0.72rem', padding:'3px 8px' }}/>
              </div>
              {form.atualizada && (
                <span style={{ fontSize:'0.58rem', color:'#1e293b', alignSelf:'center' }}>
                  Atualizado: {form.atualizada}
                </span>
              )}
            </div>

            {/* Toolbar de atalhos de escrita */}
            <div style={{ padding:'6px 14px', borderBottom:'1px solid rgba(255,255,255,0.04)',
                display:'flex', gap:4, flexWrap:'wrap', background:'rgba(255,255,255,0.01)' }}>
              {[
                ['• Lista', '• '],
                ['→',  '→ '],
                ['⚠️', '⚠️ '],
                ['✅', '✅ '],
                ['📌', '📌 '],
                ['★',  '★ '],
                ['──', '\n─────────────────────\n'],
                ['📅 Data', '\n📅 ' + new Date().toLocaleDateString('pt-BR') + '\n'],
              ].map(([label, txt]) => (
                <button key={label} onClick={() => insertText(txt)}
                  style={{ padding:'3px 9px', borderRadius:5, background:'transparent',
                    border:'1px solid rgba(255,255,255,0.08)', color:'#6b8aaa',
                    fontSize:'0.75rem', cursor:'pointer', fontFamily:'inherit',
                    transition:'all 0.12s' }}
                  onMouseEnter={e => { e.target.style.borderColor='rgba(99,102,241,0.5)'; e.target.style.color='#e2e8f0'; }}
                  onMouseLeave={e => { e.target.style.borderColor='rgba(255,255,255,0.08)'; e.target.style.color='#6b8aaa'; }}>
                  {label}
                </button>
              ))}
            </div>

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={form.conteudo}
              onChange={e => f('conteudo')(e.target.value)}
              placeholder={`Escreva seus resumos, macetes e anotações aqui…\n\nDicas:\n• Use linhas em branco para separar seções\n• Comece com # para um título de seção\n• Marque com ★ os pontos mais importantes`}
              style={{ flex:1, padding:'18px 20px', background:'transparent', border:'none',
                color:'#e2e8f0', fontSize:'0.85rem', lineHeight:1.75, resize:'none',
                fontFamily:"'Inter',sans-serif", outline:'none' }}
              onKeyDown={e => {
                if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); salvar(); }
              }}
            />

            {/* Tags display */}
            {form.tags && (
              <div style={{ padding:'8px 18px', borderTop:'1px solid rgba(255,255,255,0.04)',
                  display:'flex', gap:6, flexWrap:'wrap' }}>
                {form.tags.split(',').map(t => t.trim()).filter(Boolean).map(tag => (
                  <span key={tag} style={{ padding:'2px 9px', borderRadius:20,
                      background:cor.bg, border:`1px solid ${cor.borda}`,
                      fontSize:'0.62rem', color:cor.dot, fontWeight:600 }}>
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Rodapé */}
            <div style={{ padding:'6px 18px', borderTop:'1px solid rgba(255,255,255,0.04)',
                fontSize:'0.56rem', color:'#1e293b', display:'flex', justifyContent:'space-between' }}>
              <span>Ctrl+S para salvar · Clique em outra nota para navegar</span>
              <span>{form.conteudo?.length || 0} chars · {form.conteudo?.trim() ? form.conteudo.trim().split(/\s+/).length : 0} palavras</span>
            </div>
          </>
        )}
      </div>

      {/* ── Modal impressão ── */}
      {showPrint && (
        <ModalImpressao notas={notas} onClose={() => setShowPrint(false)} />
      )}

      {/* ── Modal confirmar delete ── */}
      {confirmarDel && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)',
            display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div style={{ background:'#111120', border:'1px solid rgba(239,68,68,0.3)',
              borderRadius:14, padding:'28px 32px', textAlign:'center', maxWidth:320 }}>
            <div style={{ fontSize:'2rem', marginBottom:10 }}>🗑️</div>
            <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'0.9rem', fontWeight:700, color:'#e2e8f0', marginBottom:8 }}>
              Deletar anotação?
            </div>
            <div style={{ fontSize:'0.72rem', color:'#475569', marginBottom:20 }}>
              "{notas.find(n => n.id === confirmarDel)?.titulo || 'sem título'}" será removida permanentemente.
            </div>
            <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
              <button onClick={() => setConfirmarDel(null)}
                style={{ padding:'8px 20px', borderRadius:8, background:'rgba(255,255,255,0.05)',
                  border:'1px solid rgba(255,255,255,0.1)', color:'#475569', fontSize:'0.78rem', cursor:'pointer' }}>
                Cancelar
              </button>
              <button onClick={() => deletar(confirmarDel)}
                style={{ padding:'8px 20px', borderRadius:8, background:'rgba(239,68,68,0.15)',
                  border:'1px solid rgba(239,68,68,0.35)', color:'#ef4444', fontSize:'0.78rem', fontWeight:700, cursor:'pointer' }}>
                Deletar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div style={{ position:'fixed', bottom:28, right:28, background:'#0a1f35',
            border:'1px solid rgba(26,111,196,0.4)', borderRadius:10, padding:'12px 18px',
            fontSize:'0.88rem', color:'#e8edf4', zIndex:9999,
            boxShadow:'0 4px 20px rgba(0,0,0,0.4)' }}>
          {toast}
        </div>
      )}
    </div>
  );
}

const s = {
  btnNova:      { padding:'6px 14px', borderRadius:7, background:'rgba(99,102,241,0.15)', border:'1px solid rgba(99,102,241,0.3)', color:'#818cf8', fontSize:'0.72rem', fontWeight:700, cursor:'pointer' },
  btnSalvar:    { padding:'6px 14px', borderRadius:7, background:'rgba(16,185,129,0.12)', border:'1px solid rgba(16,185,129,0.25)', color:'#10b981', fontSize:'0.72rem', fontWeight:700, cursor:'pointer' },
  btnPrint:     { padding:'6px 10px', borderRadius:7, background:'rgba(245,158,11,0.12)', border:'1px solid rgba(245,158,11,0.25)', color:'#f59e0b', fontSize:'0.72rem', cursor:'pointer' },
  btnYellowSm:  { padding:'5px 10px', borderRadius:6, background:'rgba(245,158,11,0.12)', border:'1px solid rgba(245,158,11,0.25)', color:'#f59e0b', fontSize:'0.72rem', fontWeight:600, cursor:'pointer', flex:1 },
  btnOutlineSm: { padding:'5px 10px', borderRadius:6, background:'transparent', border:'1px solid rgba(255,255,255,0.1)', color:'#6b8aaa', fontSize:'0.72rem', cursor:'pointer' },
  btnOutline:   { padding:'8px 18px', borderRadius:8, background:'transparent', border:'1px solid rgba(255,255,255,0.1)', color:'#6b8aaa', fontSize:'0.84rem', cursor:'pointer' },
  btnYellow:    { padding:'9px 20px', borderRadius:8, background:'rgba(245,158,11,0.15)', border:'1px solid rgba(245,158,11,0.3)', color:'#f59e0b', fontSize:'0.84rem', fontWeight:700, cursor:'pointer' },
  input:        { padding:'8px 10px', borderRadius:7, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', color:'#e2e8f0', outline:'none' },
  select:       { padding:'6px 8px', borderRadius:7, background:'#0d0d1a', border:'1px solid rgba(255,255,255,0.08)', color:'#e2e8f0', cursor:'pointer', outline:'none' },
  modalLabel:   { fontSize:'0.72rem', fontWeight:700, color:'#6b8aaa', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8 },
};
