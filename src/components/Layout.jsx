import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const SIDEBAR_W = 220;
const SIDEBAR_C = 64;

const NAV = [
  { path: '/',             icon: <GridIcon />,   label: 'Dashboard' },
  { path: '/tracker',      icon: <BookIcon />,   label: 'Tracker' },
  { path: '/ciclo',        icon: <CycleIcon />,  label: 'Ciclo' },
  { path: '/questoes',     icon: <EditIcon />,   label: 'Questões' },
  { path: '/simulados',    icon: <TargetIcon />, label: 'Simulados' },
  { path: '/flashcards',   icon: <CardsIcon />,  label: 'Flashcards' },
  { path: '/analise',      icon: <ChartIcon />,  label: 'Análise' },
  { path: '/anotacoes',    icon: <NoteIcon />,   label: 'Anotações' },
  { path: '/ferramentas',  icon: <WrenchIcon />, label: 'Ferramentas' },
  { path: '/remuneracao',  icon: <MoneyIcon />,  label: 'Remuneração' },
];

export default function Layout({ children, session }) {
  const [collapsed,  setCollapsed]  = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const sw = collapsed ? SIDEBAR_C : SIDEBAR_W;
  const email = session?.user?.email ?? '';
  const initials = email ? email[0].toUpperCase() : '?';

  const logout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <>
      {mobileOpen && (
        <div onClick={() => setMobileOpen(false)} style={s.overlay} />
      )}

      <aside style={{ ...s.sidebar, width: sw }}>
        {/* Brand */}
        <div style={{ ...s.brand, padding: collapsed ? '18px 14px' : '18px 16px' }}>
          <img
            src="/logo_rfb.png" alt="RFB"
            style={{ width: collapsed ? 28 : 32, height: collapsed ? 28 : 32, objectFit: 'contain', flexShrink: 0, filter: 'brightness(0) invert(1) drop-shadow(0 0 6px rgba(99,102,241,0.5))' }}
          />
          {!collapsed && (
            <div style={{ overflow: 'hidden' }}>
              <div style={s.brandTitle}>RFB</div>
              <div style={s.brandSub}>Auditor Federal</div>
            </div>
          )}
          <button onClick={() => setCollapsed(c => !c)} style={s.collapseBtn} title={collapsed ? 'Expandir' : 'Recolher'}>
            {collapsed ? <ChevronRight /> : <ChevronLeft />}
          </button>
        </div>

        {/* Nav */}
        <nav style={s.nav}>
          {!collapsed && <div style={s.navSection}>PRINCIPAL</div>}
          {NAV.map(({ path, icon, label }) => (
            <NavLink key={path} to={path} end={path === '/'}
              title={collapsed ? label : undefined}
              style={({ isActive }) => ({
                ...s.navItem,
                justifyContent: collapsed ? 'center' : 'flex-start',
                ...(isActive ? s.navActive : {}),
              })}
              onClick={() => setMobileOpen(false)}>
              <span style={s.navIcon}>{icon}</span>
              {!collapsed && <span style={s.navLabel}>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User + logout */}
        <div style={{ padding: collapsed ? '12px 8px' : '12px 16px', borderTop: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
          {!collapsed ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 700, color: '#818cf8', flexShrink: 0 }}>
                {initials}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.62rem', color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</div>
              </div>
              <button onClick={logout} title="Sair"
                style={{ background: 'none', border: 'none', color: '#334155', cursor: 'pointer', padding: 4, borderRadius: 6, transition: 'color 0.15s' }}
                onMouseEnter={e => e.target.style.color = '#ef4444'}
                onMouseLeave={e => e.target.style.color = '#334155'}>
                <LogoutIcon />
              </button>
            </div>
          ) : (
            <button onClick={logout} title="Sair"
              style={{ width: '100%', background: 'none', border: 'none', color: '#334155', cursor: 'pointer', padding: '6px 0', display: 'flex', justifyContent: 'center' }}>
              <LogoutIcon />
            </button>
          )}
        </div>

        {/* Footer */}
        {!collapsed && (
          <div style={s.sidebarFooter}>
            <div style={s.footerEdital}>Edital Nº 1/2022 · FGV</div>
            <div style={s.footerVagas}>699 vagas</div>
          </div>
        )}
      </aside>

      {/* Main wrapper */}
      <div style={{ marginLeft: sw, minHeight: '100vh', display: 'flex', flexDirection: 'column', transition: 'margin-left 0.25s cubic-bezier(0.4,0,0.2,1)', minWidth: 0 }}>
        {/* Topbar */}
        <header style={s.topbar}>
          <button style={s.mobileMenuBtn} onClick={() => setMobileOpen(true)}>
            <MenuIcon />
          </button>
          <div style={s.topbarTitle}>Projeto Receita Federal</div>
          <div style={s.topbarRight}>
            <span style={s.badge1}>AFRFB</span>
            <span style={s.badge2}>ATRFB</span>
          </div>
        </header>

        {/* Page content */}
        <main style={s.main}>
          {children}
        </main>
      </div>
    </>
  );
}

const s = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 199, backdropFilter: 'blur(4px)' },
  sidebar: { position: 'fixed', top: 0, left: 0, bottom: 0, background: '#0d0d1a', borderRight: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1)', overflow: 'hidden', zIndex: 200, boxShadow: '4px 0 32px rgba(0,0,0,0.5)' },
  brand: { display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid rgba(255,255,255,0.05)', minHeight: 64, flexShrink: 0 },
  brandTitle: { fontFamily: "'Space Grotesk',sans-serif", fontSize: '0.95rem', fontWeight: 700, color: '#f1f5f9', lineHeight: 1.1, whiteSpace: 'nowrap' },
  brandSub: { fontSize: '0.6rem', color: '#6366f1', fontWeight: 600, marginTop: 2, whiteSpace: 'nowrap' },
  collapseBtn: { marginLeft: 'auto', flexShrink: 0, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 6, width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6366f1' },
  nav: { flex: 1, padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto', overflowX: 'hidden' },
  navSection: { fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.12em', color: '#1e293b', textTransform: 'uppercase', padding: '4px 8px 8px', whiteSpace: 'nowrap' },
  navItem: { display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 8, textDecoration: 'none', color: '#475569', fontSize: '0.8rem', fontWeight: 500, transition: 'all 0.15s', whiteSpace: 'nowrap', overflow: 'hidden' },
  navActive: { background: 'rgba(99,102,241,0.15)', color: '#818cf8', boxShadow: 'inset 3px 0 0 #6366f1' },
  navIcon: { width: 18, height: 18, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  navLabel: { flex: 1 },
  sidebarFooter: { padding: '8px 16px 12px', borderTop: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 },
  footerEdital: { fontSize: '0.6rem', color: '#1e293b', marginBottom: 2 },
  footerVagas:  { fontSize: '0.65rem', color: '#6366f1', fontWeight: 600 },
  topbar: { height: 52, display: 'flex', alignItems: 'center', gap: 12, padding: '0 24px', flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(10,10,15,0.85)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 50 },
  mobileMenuBtn: { display: 'none', background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: 4 },
  topbarTitle: { fontFamily: "'Space Grotesk',sans-serif", fontSize: '0.85rem', fontWeight: 600, color: '#475569' },
  topbarRight: { marginLeft: 'auto', display: 'flex', gap: 6 },
  badge1: { fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.08em', padding: '3px 9px', borderRadius: 20, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', color: '#818cf8' },
  badge2: { fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.08em', padding: '3px 9px', borderRadius: 20, background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.2)', color: '#22d3ee' },
  main: { flex: 1, padding: '18px 22px 50px', maxWidth: 1380, width: '100%' },
};

/* SVG Icons */
function GridIcon()    { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>; }
function BookIcon()    { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>; }
function CycleIcon()   { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>; }
function EditIcon()    { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>; }
function TargetIcon()  { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>; }
function CardsIcon()   { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="16" height="13" rx="2"/><path d="M22 5c0-1.1-.9-2-2-2H6c-1.1 0-2 .9-2 2"/></svg>; }
function MoneyIcon()   { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>; }
function NoteIcon()    { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>; }
function ChartIcon()   { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>; }
function WrenchIcon()  { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>; }
function ChevronLeft() { return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>; }
function ChevronRight(){ return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>; }
function MenuIcon()    { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>; }
function LogoutIcon()  { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>; }
