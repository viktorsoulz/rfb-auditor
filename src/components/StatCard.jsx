export default function StatCard({ icon, value, label, sub, color = '#6366f1' }) {
  return (
    <div style={{
      background: '#111120',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 12,
      padding: '14px 16px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{ position:'absolute', top:0, left:0, width:44, height:44, background:`${color}10`, borderRadius:'0 0 44px 0', pointerEvents:'none' }}/>
      <div style={{ width:30, height:30, borderRadius:8, background:`${color}18`, border:`1px solid ${color}28`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.9rem', marginBottom:8 }}>{icon}</div>
      <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'1.35rem', fontWeight:700, color, lineHeight:1, marginBottom:2 }}>{value}</div>
      <div style={{ fontSize:'0.62rem', fontWeight:700, color:'#475569', textTransform:'uppercase', letterSpacing:'0.08em' }}>{label}</div>
      {sub && <div style={{ fontSize:'0.62rem', color:'#334155', marginTop:2 }}>{sub}</div>}
    </div>
  );
}
