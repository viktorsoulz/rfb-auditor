export default function SectionTitle({ children, style = {} }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      marginBottom: 12,
      fontSize: '0.62rem', fontWeight: 800,
      letterSpacing: '0.14em', textTransform: 'uppercase', color: '#475569',
      ...style,
    }}>
      <span style={{ width:3, height:12, background:'#6366f1', borderRadius:99, flexShrink:0, display:'block' }}/>
      {children}
    </div>
  );
}
