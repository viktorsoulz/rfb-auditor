import { useState, useMemo, useRef, useCallback } from 'react';
import { useStorage } from '../hooks/useStorage';

/* ══════════════════════════════════════════════════════════════
   SPACED REPETITION — algoritmo SM-2 simplificado
   Intervalos: 1d → 3d → 7d → 14d → 30d → 60d
═══════════════════════════════════════════════════════════════ */
const INTERVALOS = [1, 3, 7, 14, 30, 60]; // dias

function proximaRevisao(stats, resultado) {
  const nivel = stats?.nivel || 0;
  const novoNivel = resultado === 'acertei'
    ? Math.min(nivel + 1, INTERVALOS.length - 1)
    : 0; // errou → volta ao início
  const dias = INTERVALOS[novoNivel];
  const d = new Date(); d.setDate(d.getDate() + dias);
  return { nivel: novoNivel, proxima: d.toISOString().slice(0,10) };
}

function devePraticar(stats) {
  if (!stats?.proxima) return true; // nunca visto
  const hoje = new Date().toISOString().slice(0,10);
  return stats.proxima <= hoje;
}

/* ══════════════════════════════════════════════════════════════
   MATERIAS
═══════════════════════════════════════════════════════════════ */
const MATERIAS = [
  'Língua Portuguesa','Língua Inglesa','Raciocínio Lógico-Matemático','Estatística',
  'Fluência em Dados','Economia e Finanças Públicas','Administração Geral','Administração Pública',
  'Auditoria','Contabilidade Geral e Pública','Direito Constitucional','Direito Administrativo',
  'Direito Tributário','Legislação Tributária','Legislação Aduaneira','Direito Previdenciário','Geral',
];
const empty = { materia:'', subtopico:'', frente:'', verso:'' };

const NIVEL_LABEL = ['Novo','1d','3d','7d','14d','30d','60d'];
const NIVEL_COLOR = ['#ef4444','#f97316','#f59e0b','#22d3ee','#10b981','#6366f1','#8b5cf6'];

/* ══════════════════════════════════════════════════════════════
   PARSER DE ARQUIVOS DO ANKI
   Suporta:
   - .txt / .tsv  — exportação "Notes in plain text" (tab-separated)
   - .csv         — separado por vírgula ou ponto-e-vírgula
   Colunas esperadas (Anki padrão): Frente, Verso, [Deck], [Tags]
   Também aceita formato simples: só Frente\tVerso
═══════════════════════════════════════════════════════════════ */
function parseAnkiFile(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
  if (lines.length === 0) return { cards: [], errors: ['Arquivo vazio ou sem linhas válidas.'] };

  const errors = [];
  const parsed = [];

  // Detectar separador: tab > ponto-e-vírgula > vírgula
  const sample = lines[0];
  const sep = sample.includes('\t') ? '\t'
             : sample.includes(';') ? ';'
             : ',';

  // Verificar se primeira linha é cabeçalho
  const firstCols = lines[0].split(sep).map(c => c.replace(/^["']|["']$/g, '').toLowerCase().trim());
  const hasHeader = ['frente','front','pergunta','question','campo 1','field 1'].some(k => firstCols.includes(k));
  const dataLines = hasHeader ? lines.slice(1) : lines;

  // Detectar índices das colunas
  let iFrente = 0, iVerso = 1, iDeck = -1, iTags = -1;
  if (hasHeader) {
    firstCols.forEach((col, i) => {
      if (['frente','front','pergunta','question','campo 1','field 1'].includes(col)) iFrente = i;
      else if (['verso','back','resposta','answer','campo 2','field 2'].includes(col)) iVerso = i;
      else if (['deck','baralho','deck name'].includes(col)) iDeck = i;
      else if (['tags','etiquetas','tag'].includes(col)) iTags = i;
    });
  }

  dataLines.forEach((line, idx) => {
    const cols = splitCsvLine(line, sep);
    if (cols.length < 2) {
      if (cols.length === 1 && cols[0].length > 0) {
        errors.push(`Linha ${idx + 1}: só 1 coluna encontrada — ignorada.`);
      }
      return;
    }
    const frente = cols[iFrente]?.trim();
    const verso  = cols[iVerso]?.trim();
    if (!frente || !verso) {
      errors.push(`Linha ${idx + 1}: frente ou verso vazio — ignorada.`);
      return;
    }
    const deck = iDeck >= 0 ? cols[iDeck]?.trim() : '';
    const tags = iTags >= 0 ? cols[iTags]?.trim() : '';
    parsed.push({ frente, verso, deck, tags });
  });

  return { cards: parsed, errors, sep, hasHeader };
}

// Divisor que respeita aspas (CSV real)
function splitCsvLine(line, sep) {
  if (sep === '\t') return line.split('\t').map(c => c.replace(/^["']|["']$/g, ''));
  const result = [];
  let cur = '', inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if ((ch === '"' || ch === "'") && !inQuote) { inQuote = true; continue; }
    if ((ch === '"' || ch === "'") && inQuote)  { inQuote = false; continue; }
    if (ch === sep && !inQuote) { result.push(cur); cur = ''; continue; }
    cur += ch;
  }
  result.push(cur);
  return result.map(c => c.trim());
}

/* ══════════════════════════════════════════════════════════════
   COMPONENTE IMPORTAR ANKI
═══════════════════════════════════════════════════════════════ */
function ImportarAnki({ cards, setCards, onVoltar }) {
  const [step, setStep]         = useState('upload'); // upload | preview | done
  const [parsed, setParsed]     = useState([]);
  const [parseErrors, setParseErrors] = useState([]);
  const [fileName, setFileName] = useState('');
  const [materia, setMateria]   = useState('');
  const [selected, setSelected] = useState(new Set());
  const [duplicatas, setDuplicatas] = useState(0);
  const fileRef = useRef(null);
  const hoje = new Date().toISOString().slice(0,10);
  const [loading, setLoading] = useState('');

  /* ── Parser .apkg via JSZip + sql.js (carregados dinamicamente) ── */
  const parseApkg = async (file) => {
    setLoading('Carregando JSZip...');
    // Carregar JSZip dinamicamente via CDN
    if (!window.JSZip) {
      await new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
        s.onload = res; s.onerror = rej;
        document.head.appendChild(s);
      });
    }
    setLoading('Carregando sql.js (WebAssembly)...');
    if (!window.initSqlJs) {
      await new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/sql-wasm.min.js';
        s.onload = res; s.onerror = rej;
        document.head.appendChild(s);
      });
    }
    setLoading('Abrindo arquivo .apkg...');
    const arrayBuf = await file.arrayBuffer();
    const zip = await window.JSZip.loadAsync(arrayBuf);

    // Preferir collection.anki21 (mais recente), fallback para collection.anki2
    const dbFile = zip.file('collection.anki21') || zip.file('collection.anki2');
    if (!dbFile) throw new Error('Arquivo .apkg inválido: collection.anki2(1) não encontrado.');

    setLoading('Lendo banco de dados SQLite...');
    const dbBuf = await dbFile.async('arraybuffer');
    const SQL = await window.initSqlJs({
      locateFile: f => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${f}`
    });
    const db = new SQL.Database(new Uint8Array(dbBuf));

    // Ler metadados da coleção (decks + models)
    setLoading('Lendo decks e modelos...');
    const colRow = db.exec('SELECT decks, models FROM col LIMIT 1');
    const decksJson  = colRow[0]?.values[0][0] || '{}';
    const modelsJson = colRow[0]?.values[0][1] || '{}';
    const decksMap   = JSON.parse(decksJson);   // { deckId: { name } }
    const modelsMap  = JSON.parse(modelsJson);  // { modelId: { flds: [{name}] } }

    // Ler notes com seus card decks
    setLoading('Extraindo flashcards...');
    const res = db.exec(`
      SELECT n.id, n.flds, n.tags, n.mid,
             (SELECT did FROM cards WHERE nid = n.id LIMIT 1) as did
      FROM notes n
    `);

    const rows = res[0]?.values || [];
    const parsedCards = [];
    const errors = [];

    rows.forEach((row, idx) => {
      const [nid, flds, tags, mid, did] = row;
      const campos = flds.split('');
      if (campos.length < 2) {
        errors.push(`Note ${nid}: menos de 2 campos — ignorada.`);
        return;
      }

      // Descobrir nomes dos campos pelo model
      const model = modelsMap[String(mid)];
      const fieldNames = model?.flds?.map(f => f.name.toLowerCase()) || [];
      const iFrente = fieldNames.findIndex(n => ['frente','front','pergunta','question','palavra','word','term'].some(k => n.includes(k)));
      const iVerso  = fieldNames.findIndex(n => ['verso','back','resposta','answer','definição','definition'].some(k => n.includes(k)));

      const frente = stripHtml(campos[iFrente >= 0 ? iFrente : 0] || '').trim();
      const verso  = stripHtml(campos[iVerso  >= 0 ? iVerso  : 1] || '').trim();

      if (!frente || !verso) {
        errors.push(`Note ${nid}: frente ou verso vazio após remover HTML — ignorada.`);
        return;
      }

      // Nome do deck
      const deckId = String(did);
      const deckName = decksMap[deckId]?.name || decksMap[deckId]?.['name'] || 'Importado do Anki';
      // Remover prefixo hierárquico "Pai::Filho" → pegar último segmento
      const deckShort = deckName.split('::').pop();

      parsedCards.push({
        frente,
        verso,
        deck: deckShort,
        tags: tags?.trim() || '',
      });
    });

    db.close();
    return { cards: parsedCards, errors };
  };

  function stripHtml(html) {
    // Remove tags HTML, converte <br> em newline
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .trim();
  }

  const handleFile = useCallback((file) => {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    setFileName(file.name);

    const finalize = (pCards, errors) => {
      const frentesExistentes = new Set(cards.map(c => c.frente.toLowerCase().trim()));
      let dups = 0;
      pCards.forEach(c => { if (frentesExistentes.has(c.frente.toLowerCase().trim())) dups++; });
      setParsed(pCards);
      setParseErrors(errors);
      setDuplicatas(dups);
      setSelected(new Set(pCards.map((_, i) => i)));
      setLoading('');
      setStep('preview');
    };

    if (ext === 'apkg') {
      parseApkg(file)
        .then(({ cards: pCards, errors }) => finalize(pCards, errors))
        .catch(err => {
          setLoading('');
          setParseErrors([`Erro ao abrir .apkg: ${err.message}`]);
          setParsed([]);
          setStep('preview');
        });
      return;
    }

    // .txt / .csv / .tsv
    const reader = new FileReader();
    reader.onload = e => {
      const { cards: pCards, errors } = parseAnkiFile(e.target.result);
      finalize(pCards, errors);
    };
    reader.readAsText(file, 'UTF-8');
  }, [cards, parseApkg]);

  const importar = () => {
    const hoje_ = new Date().toISOString().slice(0,10);
    const novos = parsed
      .filter((_, i) => selected.has(i))
      .map(c => ({
        id: Date.now() + Math.random(),
        frente: c.frente,
        verso:  c.verso,
        materia: materia || c.deck || 'Importado do Anki',
        subtopico: c.tags || '',
        criado: hoje_,
      }));
    setCards(prev => [...novos, ...prev]);
    setStep('done');
  };

  const toggleCard = (i) => setSelected(prev => {
    const s = new Set(prev);
    s.has(i) ? s.delete(i) : s.add(i);
    return s;
  });

  const selecionarTodos = (v) => setSelected(v ? new Set(parsed.map((_, i) => i)) : new Set());

  if (step === 'done') {
    return (
      <div style={{ maxWidth:520, margin:'0 auto', textAlign:'center', padding:'40px 0' }}>
        <div style={{ fontSize:'3.5rem', marginBottom:12 }}>✅</div>
        <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'1.2rem', fontWeight:700, color:'#e2e8f0', marginBottom:8 }}>
          {selected.size} card{selected.size !== 1 ? 's' : ''} importado{selected.size !== 1 ? 's' : ''}!
        </div>
        <div style={{ fontSize:'0.75rem', color:'#475569', marginBottom:24 }}>
          Os cards estão no banco e prontos para estudo com spaced repetition.
        </div>
        <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
          <button onClick={() => { setStep('upload'); setParsed([]); setParseErrors([]); setFileName(''); }}
            style={btnOutline}>Importar mais</button>
          <button onClick={onVoltar} style={btnPrimary}>Ver banco de cards</button>
        </div>
      </div>
    );
  }

  if (step === 'preview') {
    return (
      <div style={{ maxWidth:700 }}>
        {/* Header preview */}
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:18 }}>
          <button onClick={() => setStep('upload')} style={{ ...btnOutline, padding:'6px 12px' }}>← Voltar</button>
          <div>
            <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'0.9rem', fontWeight:700, color:'#e2e8f0' }}>
              {fileName}
            </div>
            <div style={{ fontSize:'0.68rem', color:'#475569', marginTop:1 }}>
              {parsed.length} card{parsed.length !== 1 ? 's' : ''} encontrado{parsed.length !== 1 ? 's' : ''}
              {duplicatas > 0 && <span style={{ color:'#f59e0b', marginLeft:8 }}>· {duplicatas} possível{duplicatas !== 1 ? 'is' : ''} duplicata{duplicatas !== 1 ? 's' : ''}</span>}
            </div>
          </div>
        </div>

        {/* Erros de parse */}
        {parseErrors.length > 0 && (
          <div style={{ background:'rgba(245,158,11,0.07)', border:'1px solid rgba(245,158,11,0.2)', borderRadius:10, padding:'10px 14px', marginBottom:14 }}>
            <div style={{ fontSize:'0.72rem', fontWeight:700, color:'#f59e0b', marginBottom:6 }}>
              ⚠️ {parseErrors.length} linha{parseErrors.length !== 1 ? 's' : ''} ignorada{parseErrors.length !== 1 ? 's' : ''}
            </div>
            {parseErrors.slice(0, 3).map((e, i) => (
              <div key={i} style={{ fontSize:'0.65rem', color:'#92400e', marginBottom:2 }}>• {e}</div>
            ))}
            {parseErrors.length > 3 && <div style={{ fontSize:'0.62rem', color:'#78350f' }}>... e mais {parseErrors.length - 3}</div>}
          </div>
        )}

        {/* Matéria global */}
        <div style={{ background:'#111120', border:'1px solid rgba(255,255,255,0.06)', borderRadius:10, padding:'14px 16px', marginBottom:14 }}>
          <div style={{ fontSize:'0.62rem', fontWeight:700, color:'#334155', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:6 }}>
            Atribuir matéria a todos os cards importados
          </div>
          <select style={{ width:'100%', padding:'8px 10px', borderRadius:8, background:'#0d0d1a', border:'1px solid rgba(255,255,255,0.08)', color:'#e2e8f0', fontSize:'0.83rem' }}
            value={materia} onChange={e => setMateria(e.target.value)}>
            <option value="">Usar nome do deck do arquivo (se houver)</option>
            {MATERIAS.map(m => <option key={m}>{m}</option>)}
          </select>
        </div>

        {/* Seleção */}
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
          <div style={{ flex:1, fontSize:'0.72rem', color:'#475569' }}>
            {selected.size} de {parsed.length} selecionados
          </div>
          <button onClick={() => selecionarTodos(true)}  style={{ ...btnOutline, padding:'5px 10px', fontSize:'0.7rem' }}>Todos</button>
          <button onClick={() => selecionarTodos(false)} style={{ ...btnOutline, padding:'5px 10px', fontSize:'0.7rem' }}>Nenhum</button>
          {duplicatas > 0 && (
            <button onClick={() => {
              const frentesExist = new Set(cards.map(c => c.frente.toLowerCase().trim()));
              setSelected(new Set(parsed.map((c, i) => i).filter(i => !frentesExist.has(parsed[i].frente.toLowerCase().trim()))));
            }} style={{ ...btnOutline, padding:'5px 10px', fontSize:'0.7rem', color:'#f59e0b', borderColor:'rgba(245,158,11,0.3)' }}>
              Excluir duplicatas
            </button>
          )}
        </div>

        {/* Lista de cards para preview */}
        <div style={{ maxHeight:360, overflowY:'auto', display:'flex', flexDirection:'column', gap:6, marginBottom:16 }}>
          {parsed.map((c, i) => {
            const isDup = cards.some(x => x.frente.toLowerCase().trim() === c.frente.toLowerCase().trim());
            const isSel = selected.has(i);
            return (
              <div key={i} onClick={() => toggleCard(i)}
                style={{ display:'flex', gap:10, alignItems:'flex-start', padding:'10px 12px',
                  background: isSel ? 'rgba(99,102,241,0.07)' : 'rgba(255,255,255,0.02)',
                  border:`1px solid ${isSel ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)'}`,
                  borderRadius:8, cursor:'pointer', transition:'all 0.12s' }}>
                <input type="checkbox" checked={isSel} onChange={() => toggleCard(i)}
                  onClick={e => e.stopPropagation()}
                  style={{ accentColor:'#6366f1', marginTop:2, flexShrink:0, cursor:'pointer' }}/>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:'0.78rem', color:'#e2e8f0', lineHeight:1.4, marginBottom:3 }}>{c.frente}</div>
                  <div style={{ fontSize:'0.7rem', color:'#475569', lineHeight:1.4 }}>{c.verso}</div>
                  <div style={{ display:'flex', gap:8, marginTop:4, flexWrap:'wrap' }}>
                    {c.deck && <span style={{ fontSize:'0.58rem', color:'#6366f1', background:'rgba(99,102,241,0.1)', padding:'1px 6px', borderRadius:4 }}>{c.deck}</span>}
                    {c.tags && <span style={{ fontSize:'0.58rem', color:'#475569', background:'rgba(255,255,255,0.04)', padding:'1px 6px', borderRadius:4 }}>{c.tags}</span>}
                    {isDup && <span style={{ fontSize:'0.58rem', color:'#f59e0b', background:'rgba(245,158,11,0.1)', padding:'1px 6px', borderRadius:4 }}>⚠️ duplicata</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <button onClick={importar} disabled={selected.size === 0}
          style={{ ...btnPrimary, width:'100%', justifyContent:'center', padding:'12px',
            opacity: selected.size === 0 ? 0.4 : 1 }}>
          ✅ Importar {selected.size} card{selected.size !== 1 ? 's' : ''}
        </button>
      </div>
    );
  }

  // step === 'upload'
  return (
    <div style={{ maxWidth:560 }}>
      {/* Instruções */}
      <div style={{ background:'rgba(99,102,241,0.06)', border:'1px solid rgba(99,102,241,0.18)', borderRadius:12, padding:'16px 18px', marginBottom:20 }}>
        <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'0.85rem', fontWeight:700, color:'#818cf8', marginBottom:10 }}>
          📋 Como exportar do Anki
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {[
            '1. Abra o Anki e selecione o baralho',
            '2. Menu Arquivo → Exportar',
            '3. Formato: "Notas em texto simples (.txt)"',
            '4. Desmarque "Incluir tags" se quiser simplificar',
            '5. Clique em Exportar e salve o arquivo',
          ].map((s, i) => (
            <div key={i} style={{ fontSize:'0.75rem', color:'#64748b', display:'flex', gap:8 }}>
              <span style={{ color:'#6366f1', fontWeight:700, flexShrink:0 }}>→</span>
              <span>{s}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop:10, padding:'8px 12px', background:'rgba(255,255,255,0.03)', borderRadius:8, fontSize:'0.68rem', color:'#475569' }}>
          <span style={{ color:'#f59e0b', fontWeight:700 }}>Formato do arquivo: </span>
          cada linha = um card, colunas separadas por tab: <code style={{ color:'#818cf8' }}>Frente [tab] Verso [tab] Deck [tab] Tags</code>
        </div>
      </div>

      {/* Drop zone */}
      <label
        style={{ display:'block', border:'2px dashed rgba(99,102,241,0.3)', borderRadius:14,
          padding:'40px 24px', textAlign:'center', cursor:'pointer', transition:'all 0.2s',
          background:'rgba(99,102,241,0.03)', position:'relative' }}
        onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor='rgba(99,102,241,0.7)'; e.currentTarget.style.background='rgba(99,102,241,0.08)'; }}
        onDragLeave={e => { e.currentTarget.style.borderColor='rgba(99,102,241,0.3)'; e.currentTarget.style.background='rgba(99,102,241,0.03)'; }}
        onDrop={e => {
          e.preventDefault();
          e.currentTarget.style.borderColor='rgba(99,102,241,0.3)';
          e.currentTarget.style.background='rgba(99,102,241,0.03)';
          const file = e.dataTransfer.files[0];
          if (file) handleFile(file);
        }}>
        <input ref={fileRef} type="file" accept=".txt,.tsv,.csv,.apkg"
          style={{ position:'absolute', inset:0, opacity:0, cursor:'pointer' }}
          onChange={e => handleFile(e.target.files[0])}/>
        {loading ? (
          <>
            <div style={{ fontSize:'2rem', marginBottom:8, animation:'spin 1s linear infinite' }}>⚙️</div>
            <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'0.85rem', fontWeight:600, color:'#818cf8', marginBottom:4 }}>
              {loading}
            </div>
            <div style={{ fontSize:'0.65rem', color:'#475569' }}>Aguarde, pode demorar alguns segundos...</div>
          </>
        ) : (
          <>
            <div style={{ fontSize:'2.5rem', marginBottom:10 }}>🃏</div>
            <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'0.9rem', fontWeight:600, color:'#94a3b8', marginBottom:4 }}>
              Arraste o arquivo aqui ou clique para selecionar
            </div>
            <div style={{ fontSize:'0.7rem', color:'#334155' }}>
              Aceita .apkg, .txt e .csv — todos os formatos do Anki
            </div>
          </>
        )}
      </label>

      {/* Formatos suportados */}
      <div style={{ marginTop:16, display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
        {[
          { ext:'.txt / .tsv', desc:'Exportação padrão do Anki\n"Notas em texto simples"', ok:true },
          { ext:'.csv', desc:'Separado por vírgula\nou ponto-e-vírgula', ok:true },
          { ext:'.apkg', desc:'Baralho completo do Anki\nsuportado via WebAssembly', ok:true },
          { ext:'Google Sheets', desc:'Exporte como .csv\ne importe aqui', ok:true },
        ].map(({ ext, desc, ok }) => (
          <div key={ext} style={{ padding:'10px 12px', background:'rgba(255,255,255,0.02)',
              border:`1px solid ${ok ? 'rgba(255,255,255,0.06)' : 'rgba(239,68,68,0.15)'}`,
              borderRadius:9 }}>
            <div style={{ fontSize:'0.72rem', fontWeight:700, color: ok ? '#94a3b8' : '#ef4444', marginBottom:3 }}>
              {ok ? '✅' : '❌'} {ext}
            </div>
            <div style={{ fontSize:'0.62rem', color:'#334155', whiteSpace:'pre-line' }}>{desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const btnPrimary = { display:'inline-flex', alignItems:'center', gap:7, padding:'8px 16px', borderRadius:8, background:'rgba(99,102,241,0.15)', border:'1px solid rgba(99,102,241,0.35)', color:'#818cf8', fontSize:'0.78rem', fontWeight:700, cursor:'pointer', fontFamily:'inherit' };
const btnOutline = { display:'inline-flex', alignItems:'center', gap:7, padding:'8px 14px', borderRadius:8, background:'transparent', border:'1px solid rgba(255,255,255,0.1)', color:'#475569', fontSize:'0.78rem', cursor:'pointer', fontFamily:'inherit' };

export default function Flashcards() {
  const [cards, setCards]       = useStorage('flashcards', []);
  const [fcStats, setFcStats]   = useStorage('fc_stats', {});
  const [aba, setAba]           = useState('banco');
  const [form, setForm]         = useState(empty);
  const [filterMat, setFilterMat] = useState('');   // filtro do banco
  const [filterMatEstudo, setFilterMatEstudo] = useState(''); // filtro do estudo — independente
  const [filterSR, setFilterSR]   = useState(false);
  const [search, setSearch]     = useState('');
  const [flipped, setFlipped]   = useState({});
  const [studyIdx, setStudyIdx] = useState(0);
  const [studyFlipped, setStudyFlipped] = useState(false);
  const [shuffled, setShuffled] = useState(null);
  const f = k => v => setForm(p => ({ ...p, [k]: v }));

  // Seleção em lote no banco
  const [selMode, setSelMode]   = useState(false); // modo seleção ativo
  const [selected, setSelected] = useState(new Set()); // IDs selecionados

  const toggleSel = (id) => setSelected(prev => {
    const s = new Set(prev);
    s.has(id) ? s.delete(id) : s.add(id);
    return s;
  });
  const selecionarTodosFiltrados = () => setSelected(new Set(filtered.map(c => c.id)));
  const limparSelecao = () => { setSelected(new Set()); };

  const excluirSelecionados = () => {
    if (selected.size === 0) return;
    if (!window.confirm(`Excluir ${selected.size} card${selected.size > 1 ? 's' : ''}? Esta ação não pode ser desfeita.`)) return;
    setCards(prev => prev.filter(c => !selected.has(c.id)));
    setFcStats(prev => {
      const n = { ...prev };
      selected.forEach(id => delete n[id]);
      return n;
    });
    setSelected(new Set());
    setSelMode(false);
  };

  const sairModoSelecao = () => { setSelMode(false); setSelected(new Set()); };

  // Trocar de aba sem carregar filtro de outra aba
  const mudarAba = (k) => {
    setAba(k);
    if (k === 'banco') {
      // Não limpar filterMat do banco, mas garantir que shuffled do estudo não afete
    }
    if (k === 'estudo') {
      setStudyIdx(0);
      setStudyFlipped(false);
      setShuffled(null);
    }
  };

  const hoje = new Date().toISOString().slice(0,10);

  /* Cards para revisar hoje (SR) */
  const cardsSR = useMemo(() =>
    cards.filter(c => devePraticar(fcStats[c.id])),
    [cards, fcStats]
  );

  // Filtro do banco (aba Banco)
  const filtered = useMemo(() => cards.filter(c =>
    (!filterMat || c.materia.toLowerCase().trim() === filterMat.toLowerCase().trim()) &&
    (!filterSR  || devePraticar(fcStats[c.id])) &&
    (!search    || c.frente.toLowerCase().includes(search.toLowerCase()) || c.verso.toLowerCase().includes(search.toLowerCase()))
  ), [cards, filterMat, filterSR, fcStats, search]);

  // Filtro do estudo (aba Estudo) — independente do banco
  const filteredEstudo = useMemo(() => cards.filter(c =>
    (!filterMatEstudo || c.materia.toLowerCase().trim() === filterMatEstudo.toLowerCase().trim())
  ), [cards, filterMatEstudo]);

  const deck = shuffled ?? filteredEstudo;
  const cur  = deck[studyIdx];

  const markCard = (id, resultado) => {
    const sr = proximaRevisao(fcStats[id], resultado);
    setFcStats(p => ({
      ...p,
      [id]: {
        ...(p[id]||{}),
        [resultado]: ((p[id]?.[resultado]||0)+1),
        nivel:   sr.nivel,
        proxima: sr.proxima,
        ultima:  hoje,
      }
    }));
    setStudyFlipped(false);
    setStudyIdx(i => i+1);
  };

  /* Stats globais */
  const totalAcertei = Object.values(fcStats).reduce((a,b)=>a+(b.acertei||0),0);
  const totalRepetir = Object.values(fcStats).reduce((a,b)=>a+(b.repetir||0),0);

  return (
    <div>
      {/* Stats strip */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:10, marginBottom:18 }}>
        {[
          { v:cards.length,       l:'Cards',       c:'#6366f1' },
          { v:cardsSR.length,     l:'Revisar hoje', c:cardsSR.length>0?'#f59e0b':'#10b981' },
          { v:totalAcertei,       l:'Acertei',     c:'#10b981' },
          { v:totalRepetir,       l:'Repetir',     c:'#ef4444' },
          { v:[...new Set(cards.map(c=>c.materia))].length, l:'Matérias', c:'#94a3b8' },
        ].map(({v,l,c}) => (
          <div key={l} style={{ background:'#111120', border:'1px solid rgba(255,255,255,0.06)', borderRadius:10, padding:'13px 10px', textAlign:'center' }}>
            <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'1.4rem', fontWeight:700, color:c }}>{v}</div>
            <div style={{ fontSize:'0.58rem', color:'#334155', textTransform:'uppercase', letterSpacing:'0.08em', marginTop:3 }}>{l}</div>
          </div>
        ))}
      </div>

      {/* Alerta SR */}
      {cardsSR.length > 0 && aba !== 'estudo' && (
        <div style={{ marginBottom:14, padding:'12px 16px', background:'rgba(245,158,11,0.08)',
            border:'1px solid rgba(245,158,11,0.25)', borderRadius:10,
            display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ fontSize:'1.2rem' }}>🔔</span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:'0.78rem', fontWeight:700, color:'#f59e0b' }}>
              {cardsSR.length} card{cardsSR.length>1?'s':''} para revisar hoje
            </div>
            <div style={{ fontSize:'0.65rem', color:'#64748b', marginTop:2 }}>
              Spaced repetition — revise agora para consolidar a memória
            </div>
          </div>
          <button onClick={() => {
            const sr = cardsSR.sort(() => Math.random()-0.5);
            setShuffled(sr); setStudyIdx(0); setStudyFlipped(false); mudarAba('estudo');
          }} style={{ padding:'7px 16px', background:'rgba(245,158,11,0.15)',
              border:'1px solid rgba(245,158,11,0.35)', borderRadius:8,
              color:'#f59e0b', fontSize:'0.72rem', fontWeight:700, cursor:'pointer', flexShrink:0 }}>
            Revisar agora
          </button>
        </div>
      )}

      {/* Abas */}
      <div style={{ display:'flex', gap:2, background:'rgba(255,255,255,0.03)', borderRadius:10, padding:4, marginBottom:18, width:'fit-content' }}>
        {[['banco','🗂 Banco'],['estudo','📖 Estudo'],['criar','✏️ Criar'],['importar','📥 Importar Anki']].map(([k,l]) => (
          <button key={k} onClick={() => mudarAba(k)}
            style={{ padding:'7px 16px', borderRadius:7, border:'none', cursor:'pointer',
              fontSize:'0.78rem', fontWeight:600,
              background:aba===k?'rgba(99,102,241,0.2)':'transparent',
              color:aba===k?'#818cf8':'#475569', transition:'all 0.18s' }}>{l}</button>
        ))}
      </div>

      {/* ── BANCO ── */}
      {aba==='banco' && (
        <div>
          {/* Filtros */}
          <div style={{ display:'flex', gap:10, marginBottom:10, flexWrap:'wrap', alignItems:'center' }}>
            <input style={{ flex:1, minWidth:140, padding:'8px 12px', borderRadius:8, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', color:'#e2e8f0', fontSize:'0.83rem' }}
              placeholder="Buscar…" value={search} onChange={e=>setSearch(e.target.value)}/>
            <select style={{ padding:'8px 10px', borderRadius:8, background:'#0d0d1a', border:'1px solid rgba(255,255,255,0.08)', color:'#e2e8f0', fontSize:'0.83rem', cursor:'pointer' }}
              value={filterMat} onChange={e=>setFilterMat(e.target.value)}>
              <option value="">Todas as matérias ({cards.length})</option>
              {[...new Set(cards.map(c=>c.materia).filter(Boolean))].sort().map(m=><option key={m}>{m}</option>)}
            </select>
            <button onClick={() => setFilterSR(v=>!v)}
              style={{ padding:'8px 14px', borderRadius:8, fontSize:'0.72rem', fontWeight:600, cursor:'pointer',
                background:filterSR?'rgba(245,158,11,0.12)':'rgba(255,255,255,0.03)',
                border:`1px solid ${filterSR?'rgba(245,158,11,0.35)':'rgba(255,255,255,0.08)'}`,
                color:filterSR?'#f59e0b':'#475569' }}>
              {filterSR ? '🔔 Só para revisar' : '🔔 Filtrar revisão'}
            </button>
            {/* Botão entrar modo seleção */}
            {!selMode ? (
              <button onClick={() => { setSelMode(true); setSelected(new Set()); }}
                style={{ padding:'8px 14px', borderRadius:8, fontSize:'0.72rem', fontWeight:600, cursor:'pointer',
                  background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', color:'#ef4444' }}>
                ☑ Selecionar
              </button>
            ) : (
              <button onClick={sairModoSelecao}
                style={{ padding:'8px 14px', borderRadius:8, fontSize:'0.72rem', fontWeight:600, cursor:'pointer',
                  background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'#475569' }}>
                ✕ Cancelar
              </button>
            )}
          </div>

          {/* Barra de ações em lote — só aparece no modo seleção */}
          {selMode && (
            <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px',
                background:'rgba(239,68,68,0.07)', border:'1px solid rgba(239,68,68,0.2)',
                borderRadius:10, marginBottom:12, flexWrap:'wrap' }}>
              <span style={{ fontSize:'0.78rem', color:'#ef4444', fontWeight:700, flex:1 }}>
                {selected.size > 0
                  ? `${selected.size} card${selected.size > 1 ? 's' : ''} selecionado${selected.size > 1 ? 's' : ''}`
                  : 'Clique nos cards para selecionar'}
              </span>
              <button onClick={selecionarTodosFiltrados}
                style={{ padding:'5px 12px', borderRadius:7, fontSize:'0.72rem', fontWeight:600, cursor:'pointer',
                  background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'#94a3b8' }}>
                Selecionar todos ({filtered.length})
              </button>
              <button onClick={limparSelecao}
                style={{ padding:'5px 12px', borderRadius:7, fontSize:'0.72rem', fontWeight:600, cursor:'pointer',
                  background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'#94a3b8' }}>
                Limpar
              </button>
              <button onClick={excluirSelecionados} disabled={selected.size === 0}
                style={{ padding:'5px 14px', borderRadius:7, fontSize:'0.72rem', fontWeight:700, cursor:'pointer',
                  background: selected.size > 0 ? 'rgba(239,68,68,0.18)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${selected.size > 0 ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.06)'}`,
                  color: selected.size > 0 ? '#ef4444' : '#334155',
                  opacity: selected.size === 0 ? 0.5 : 1 }}>
                🗑 Excluir selecionados
              </button>
            </div>
          )}
          {filtered.length===0 ? (
            <div style={{ background:'#111120', border:'1px solid rgba(255,255,255,0.06)', borderRadius:12, padding:'40px', textAlign:'center', color:'#334155' }}>
              Nenhum card. {cards.length===0 ? 'Crie um na aba "Criar".' : 'Tente outro filtro.'}
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:12 }}>
              {filtered.map(c => {
                const isFlipped = flipped[c.id];
                const st = fcStats[c.id];
                const nivel = st?.nivel ?? -1;
                const paraRevisar = devePraticar(st);
                return (
                  <div key={c.id} style={{ perspective:800, minHeight:160, cursor:'pointer', position:'relative' }}
                    onClick={() => selMode ? toggleSel(c.id) : setFlipped(p=>({...p,[c.id]:!p[c.id]}))}>
                    {/* Overlay de seleção */}
                    {selMode && (
                      <div style={{ position:'absolute', inset:0, zIndex:10, borderRadius:12,
                          background: selected.has(c.id) ? 'rgba(99,102,241,0.15)' : 'transparent',
                          border: `2px solid ${selected.has(c.id) ? '#6366f1' : 'transparent'}`,
                          pointerEvents:'none', transition:'all 0.15s' }}/>
                    )}
                    {selMode && (
                      <div style={{ position:'absolute', top:10, left:10, zIndex:11 }}>
                        <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleSel(c.id)}
                          onClick={e => e.stopPropagation()}
                          style={{ width:16, height:16, accentColor:'#6366f1', cursor:'pointer' }}/>
                      </div>
                    )}
                    <div style={{ position:'relative', width:'100%', minHeight:160, transformStyle:'preserve-3d', transition:'transform 0.4s', transform:(!selMode && isFlipped)?'rotateY(180deg)':'none' }}>
                      {/* Frente */}
                      <div style={{ position:'absolute', inset:0, background:'#111120', border:`1px solid ${paraRevisar?'rgba(245,158,11,0.3)':'rgba(99,102,241,0.15)'}`, borderRadius:12, padding:'14px', backfaceVisibility:'hidden', display:'flex', flexDirection:'column' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
                          <div style={{ fontSize:'0.58rem', fontWeight:700, color:'#6366f1', textTransform:'uppercase', letterSpacing:'0.1em' }}>{c.materia}</div>
                          {/* Indicador SR */}
                          <div style={{ padding:'2px 7px', borderRadius:20, fontSize:'0.55rem', fontWeight:700,
                              background:`${NIVEL_COLOR[nivel+1]||NIVEL_COLOR[0]}20`,
                              border:`1px solid ${NIVEL_COLOR[nivel+1]||NIVEL_COLOR[0]}40`,
                              color:NIVEL_COLOR[nivel+1]||NIVEL_COLOR[0] }}>
                            {paraRevisar ? '📅 Revisar' : `↻ ${NIVEL_LABEL[nivel+1]||'60d'}`}
                          </div>
                        </div>
                        <div style={{ fontSize:'0.82rem', color:'#e2e8f0', lineHeight:1.5, flex:1 }}>{c.frente}</div>
                        <div style={{ fontSize:'0.58rem', color:'#334155', marginTop:8, textAlign:'center' }}>Clique para ver a resposta</div>
                      </div>
                      {/* Verso */}
                      <div style={{ position:'absolute', inset:0, background:'#0d1a12', border:'1px solid rgba(16,185,129,0.2)', borderRadius:12, padding:'14px', backfaceVisibility:'hidden', transform:'rotateY(180deg)', display:'flex', flexDirection:'column' }}>
                        <div style={{ fontSize:'0.58rem', fontWeight:700, color:'#10b981', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:6 }}>Resposta</div>
                        <div style={{ fontSize:'0.82rem', color:'#6ee7b7', lineHeight:1.5, flex:1 }}>{c.verso}</div>
                      </div>
                    </div>
                    {!selMode && (
                      <button style={{ position:'absolute', top:8, right:8, background:'none', border:'none', color:'#334155', cursor:'pointer', zIndex:12, fontSize:'0.75rem' }}
                        onClick={e=>{e.stopPropagation();setCards(p=>p.filter(x=>x.id!==c.id))}}>✕</button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── ESTUDO ── */}
      {aba==='estudo' && (
        <div style={{ maxWidth:540, margin:'0 auto' }}>
          <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' }}>
            <select style={{ flex:1, padding:'8px 10px', borderRadius:8, background:'#0d0d1a', border:'1px solid rgba(255,255,255,0.08)', color:'#e2e8f0', fontSize:'0.83rem' }}
              value={filterMatEstudo} onChange={e=>{ setFilterMatEstudo(e.target.value); setShuffled(null); setStudyIdx(0); setStudyFlipped(false); }}>
              <option value="">Todas as matérias</option>
              {[...new Set(cards.map(c=>c.materia).filter(Boolean))].sort().map(m=><option key={m}>{m}</option>)}
            </select>
            <button style={{ padding:'8px 12px', background:'rgba(99,102,241,0.1)', border:'1px solid rgba(99,102,241,0.25)', borderRadius:8, color:'#818cf8', fontSize:'0.72rem', fontWeight:600, cursor:'pointer' }}
              onClick={()=>{setShuffled([...filteredEstudo].sort(()=>Math.random()-0.5));setStudyIdx(0);setStudyFlipped(false);}}>
              🔀 Embaralhar
            </button>
            <button style={{ padding:'8px 12px', background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.3)', borderRadius:8, color:'#f59e0b', fontSize:'0.72rem', fontWeight:600, cursor:'pointer' }}
              onClick={()=>{setShuffled(cardsSR.sort(()=>Math.random()-0.5));setStudyIdx(0);setStudyFlipped(false);}}>
              📅 Revisar hoje ({cardsSR.length})
            </button>
            <button style={{ padding:'8px 12px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:8, color:'#475569', fontSize:'0.72rem', cursor:'pointer' }}
              onClick={()=>{setShuffled(null);setStudyIdx(0);setStudyFlipped(false);}}>↺</button>
          </div>

          {deck.length===0 ? (
            <div style={{ background:'#111120', border:'1px solid rgba(255,255,255,0.06)', borderRadius:12, padding:'40px', textAlign:'center', color:'#334155' }}>Nenhum card disponível.</div>
          ) : studyIdx >= deck.length ? (
            <div style={{ background:'#111120', border:'1px solid rgba(255,255,255,0.06)', borderRadius:14, padding:'48px 24px', textAlign:'center' }}>
              <div style={{ fontSize:'3rem', marginBottom:12 }}>🏁</div>
              <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'1.2rem', fontWeight:700, color:'#e2e8f0', marginBottom:8 }}>Deck concluído!</div>
              <div style={{ fontSize:'0.72rem', color:'#475569', marginBottom:20 }}>
                Os cards foram agendados automaticamente para revisão futura.
              </div>
              <button style={{ padding:'9px 20px', background:'rgba(99,102,241,0.15)', border:'1px solid rgba(99,102,241,0.3)', borderRadius:8, color:'#818cf8', fontWeight:700, cursor:'pointer' }}
                onClick={()=>{setStudyIdx(0);setStudyFlipped(false);}}>Recomeçar</button>
            </div>
          ) : (
            <>
              {/* Progresso */}
              <div style={{ marginBottom:10 }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.65rem', color:'#334155', marginBottom:5 }}>
                  <span>Card {studyIdx+1} de {deck.length}</span>
                  <span style={{ color: NIVEL_COLOR[(fcStats[cur?.id]?.nivel??-1)+1] || '#475569' }}>
                    {cur?.materia} · Nível {NIVEL_LABEL[(fcStats[cur?.id]?.nivel??-1)+1] || 'Novo'}
                  </span>
                </div>
                <div style={{ height:3, background:'rgba(255,255,255,0.05)', borderRadius:99 }}>
                  <div style={{ width:`${(studyIdx/deck.length)*100}%`, height:'100%', background:'#6366f1', borderRadius:99, transition:'width 0.3s', boxShadow:'0 0 8px rgba(99,102,241,0.5)' }}/>
                </div>
              </div>

              {/* Card */}
              <div style={{ background:studyFlipped?'#0d1a12':'#111120',
                  border:`1px solid ${studyFlipped?'rgba(16,185,129,0.2)':'rgba(99,102,241,0.15)'}`,
                  borderRadius:14, padding:'32px 24px', minHeight:160, display:'flex',
                  flexDirection:'column', alignItems:'center', justifyContent:'center',
                  cursor:'pointer', transition:'all 0.3s', userSelect:'none' }}
                onClick={()=>setStudyFlipped(f=>!f)}>
                <div style={{ fontSize:'0.62rem', fontWeight:700, color:studyFlipped?'#10b981':'#6366f1',
                    textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:10 }}>
                  {studyFlipped ? '✅ Resposta' : '❓ Pergunta'}
                </div>
                <div style={{ fontSize:'0.95rem', color:studyFlipped?'#6ee7b7':'#e2e8f0', lineHeight:1.6, textAlign:'center' }}>
                  {studyFlipped ? cur?.verso : cur?.frente}
                </div>
                {!studyFlipped && <div style={{ fontSize:'0.62rem', color:'#334155', marginTop:14 }}>Clique para revelar</div>}
              </div>

              {/* Botões com indicador de próximo intervalo */}
              {studyFlipped && (
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginTop:12 }}>
                  <button style={{ padding:'10px', background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:9, color:'#ef4444', fontWeight:700, fontSize:'0.78rem', cursor:'pointer' }}
                    onClick={()=>markCard(cur.id,'repetir')}>
                    ↺ Repetir
                    <div style={{ fontSize:'0.58rem', fontWeight:400, marginTop:2, opacity:0.7 }}>revisar amanhã</div>
                  </button>
                  <button style={{ padding:'10px', background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.3)', borderRadius:9, color:'#10b981', fontWeight:700, fontSize:'0.78rem', cursor:'pointer' }}
                    onClick={()=>markCard(cur.id,'acertei')}>
                    ✓ Acertei
                    <div style={{ fontSize:'0.58rem', fontWeight:400, marginTop:2, opacity:0.7 }}>
                      próx: {INTERVALOS[Math.min((fcStats[cur?.id]?.nivel||0)+1, INTERVALOS.length-1)]}d
                    </div>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── CRIAR ── */}
      {aba==='criar' && (
        <div style={{ maxWidth:480 }}>
          <div style={{ background:'#111120', border:'1px solid rgba(255,255,255,0.06)', borderRadius:14, padding:'22px' }}>
            <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'1rem', fontWeight:700, color:'#e2e8f0', marginBottom:16 }}>Novo Flashcard</div>
            {[
              ['Matéria','materia','select'],
              ['Subtópico','subtopico','text'],
              ['Pergunta (Frente) *','frente','textarea'],
              ['Resposta (Verso) *','verso','textarea'],
            ].map(([label, key, type]) => (
              <div key={key} style={{ marginBottom:12 }}>
                <div style={{ fontSize:'0.62rem', fontWeight:700, color:'#334155', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:5 }}>{label}</div>
                {type==='select' ? (
                  <select style={{ width:'100%', padding:'8px 10px', borderRadius:8, background:'#0d0d1a', border:'1px solid rgba(255,255,255,0.08)', color:'#e2e8f0', fontSize:'0.83rem', boxSizing:'border-box' }}
                    value={form[key]} onChange={e=>f(key)(e.target.value)}>
                    <option value="">Selecione…</option>
                    {MATERIAS.map(m=><option key={m}>{m}</option>)}
                  </select>
                ) : type==='textarea' ? (
                  <textarea style={{ width:'100%', padding:'8px 10px', borderRadius:8, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', color:'#e2e8f0', fontSize:'0.83rem', minHeight:72, resize:'vertical', fontFamily:"'Inter',sans-serif", boxSizing:'border-box' }}
                    value={form[key]} onChange={e=>f(key)(e.target.value)}/>
                ) : (
                  <input style={{ width:'100%', padding:'8px 10px', borderRadius:8, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', color:'#e2e8f0', fontSize:'0.83rem', boxSizing:'border-box' }}
                    value={form[key]} onChange={e=>f(key)(e.target.value)}/>
                )}
              </div>
            ))}
            <button style={{ width:'100%', padding:'10px', background:'rgba(99,102,241,0.15)', border:'1px solid rgba(99,102,241,0.35)', borderRadius:9, color:'#818cf8', fontFamily:"'Space Grotesk',sans-serif", fontSize:'0.82rem', fontWeight:700, cursor:'pointer', opacity:(!form.frente||!form.verso)?0.5:1 }}
              onClick={()=>{ if(!form.frente||!form.verso) return; setCards(p=>[{id:Date.now(),...form,criado:hoje},...p]); setForm(empty); }}>
              + Criar Flashcard
            </button>
          </div>
        </div>
      )}

      {/* ── IMPORTAR ANKI ── */}
      {aba==='importar' && (
        <ImportarAnki
          cards={cards}
          setCards={setCards}
          onVoltar={() => setAba('banco')}
        />
      )}
    </div>
  );
}
