import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Login() {
  const [modo, setModo]       = useState('login'); // login | cadastro | reset
  const [email, setEmail]     = useState('');
  const [senha, setSenha]     = useState('');
  const [nome, setNome]       = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro]       = useState('');
  const [msg, setMsg]         = useState('');

  const handleSubmit = async () => {
    setErro(''); setMsg('');
    if (!email || (!senha && modo !== 'reset')) { setErro('Preencha todos os campos.'); return; }
    setLoading(true);

    try {
      if (modo === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
        if (error) setErro(traduzirErro(error.message));

      } else if (modo === 'cadastro') {
        if (senha.length < 6) { setErro('Senha deve ter no mínimo 6 caracteres.'); setLoading(false); return; }
        const { data, error } = await supabase.auth.signUp({ email, password: senha });
        if (error) { setErro(traduzirErro(error.message)); }
        else {
          // Salvar nome no perfil
          if (nome && data.user) {
            await supabase.from('profiles').upsert({ id: data.user.id, email, nome });
          }
          setMsg('Conta criada! Verifique seu e-mail para confirmar o cadastro.');
          setModo('login');
        }

      } else if (modo === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + '/reset-password',
        });
        if (error) setErro(traduzirErro(error.message));
        else setMsg('E-mail de recuperação enviado! Verifique sua caixa de entrada.');
      }
    } catch (e) {
      setErro('Erro inesperado. Tente novamente.');
    }
    setLoading(false);
  };

  const traduzirErro = (msg) => {
    if (msg.includes('Invalid login credentials')) return 'E-mail ou senha incorretos.';
    if (msg.includes('Email not confirmed'))        return 'Confirme seu e-mail antes de entrar.';
    if (msg.includes('User already registered'))    return 'Este e-mail já está cadastrado.';
    if (msg.includes('Password should be'))         return 'Senha muito fraca. Use pelo menos 6 caracteres.';
    if (msg.includes('rate limit'))                 return 'Muitas tentativas. Aguarde alguns minutos.';
    return msg;
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0d0d1a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      fontFamily: "'Source Sans 3', 'Inter', sans-serif",
    }}>
      {/* Card de login */}
      <div style={{
        width: '100%',
        maxWidth: 420,
        background: '#111120',
        border: '1px solid rgba(99,102,241,0.2)',
        borderRadius: 18,
        padding: '36px 32px',
        boxShadow: '0 0 60px rgba(99,102,241,0.08)',
      }}>
        {/* Logo + título */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            background: 'rgba(99,102,241,0.12)',
            border: '1px solid rgba(99,102,241,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px', fontSize: '1.6rem',
          }}>🏛️</div>
          <div style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: '1.3rem', fontWeight: 700, color: '#f1f5f9', marginBottom: 4,
          }}>
            Projeto RFB
          </div>
          <div style={{ fontSize: '0.75rem', color: '#475569' }}>
            Auditor-Fiscal da Receita Federal
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', background: 'rgba(255,255,255,0.03)',
          borderRadius: 10, padding: 4, marginBottom: 24, gap: 4,
        }}>
          {[['login','Entrar'],['cadastro','Criar conta']].map(([k,l]) => (
            <button key={k} onClick={() => { setModo(k); setErro(''); setMsg(''); }}
              style={{
                flex: 1, padding: '8px 0', borderRadius: 7, border: 'none',
                cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600,
                background: modo === k ? 'rgba(99,102,241,0.2)' : 'transparent',
                color: modo === k ? '#818cf8' : '#475569', transition: 'all 0.15s',
              }}>{l}
            </button>
          ))}
        </div>

        {/* Mensagem de sucesso */}
        {msg && (
          <div style={{
            padding: '10px 14px', borderRadius: 9, marginBottom: 16,
            background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)',
            fontSize: '0.78rem', color: '#10b981',
          }}>{msg}</div>
        )}

        {/* Erro */}
        {erro && (
          <div style={{
            padding: '10px 14px', borderRadius: 9, marginBottom: 16,
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
            fontSize: '0.78rem', color: '#ef4444',
          }}>{erro}</div>
        )}

        {/* Campos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {modo === 'cadastro' && (
            <div>
              <label style={s.label}>Nome (opcional)</label>
              <input style={s.input} placeholder="Como quer ser chamado?"
                value={nome} onChange={e => setNome(e.target.value)}/>
            </div>
          )}

          <div>
            <label style={s.label}>E-mail</label>
            <input style={s.input} type="email" placeholder="seu@email.com"
              value={email} onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}/>
          </div>

          {modo !== 'reset' && (
            <div>
              <label style={s.label}>Senha</label>
              <input style={s.input} type="password"
                placeholder={modo === 'cadastro' ? 'Mínimo 6 caracteres' : '••••••••'}
                value={senha} onChange={e => setSenha(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}/>
            </div>
          )}

          <button onClick={handleSubmit} disabled={loading}
            style={{
              width: '100%', padding: '11px', marginTop: 4, borderRadius: 9,
              background: loading ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.2)',
              border: '1px solid rgba(99,102,241,0.4)',
              color: loading ? '#475569' : '#818cf8',
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: '0.88rem', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s',
            }}>
            {loading ? '⏳ Aguarde...'
              : modo === 'login' ? '→ Entrar'
              : modo === 'cadastro' ? '✓ Criar conta'
              : '📧 Enviar e-mail de recuperação'}
          </button>
        </div>

        {/* Link esqueci senha */}
        {modo === 'login' && (
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <button onClick={() => { setModo('reset'); setErro(''); setMsg(''); }}
              style={{ background: 'none', border: 'none', color: '#475569', fontSize: '0.72rem', cursor: 'pointer' }}>
              Esqueci minha senha
            </button>
          </div>
        )}
        {modo === 'reset' && (
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <button onClick={() => { setModo('login'); setErro(''); setMsg(''); }}
              style={{ background: 'none', border: 'none', color: '#475569', fontSize: '0.72rem', cursor: 'pointer' }}>
              ← Voltar ao login
            </button>
          </div>
        )}

        {/* Info */}
        <div style={{
          marginTop: 24, padding: '10px 14px', borderRadius: 8,
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
          fontSize: '0.65rem', color: '#334155', lineHeight: 1.6,
        }}>
          🔒 Seus dados ficam salvos na nuvem e sincronizam em qualquer dispositivo.
          Seus estudos locais serão importados automaticamente ao entrar.
        </div>
      </div>
    </div>
  );
}

const s = {
  label: {
    display: 'block', fontSize: '0.65rem', fontWeight: 700,
    color: '#334155', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 5,
  },
  input: {
    width: '100%', padding: '9px 12px', borderRadius: 8, boxSizing: 'border-box',
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
    color: '#e2e8f0', fontSize: '0.88rem', outline: 'none',
    fontFamily: "'Inter', sans-serif",
  },
};
