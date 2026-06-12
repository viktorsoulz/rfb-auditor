export default function Card({ children, style = {}, glow = false }) {
  return (
    <div style={{
      background: '#111120',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 12,
      padding: '16px 18px',
      ...(glow ? { boxShadow: '0 0 30px rgba(99,102,241,0.07)' } : {}),
      ...style,
    }}>
      {children}
    </div>
  );
}
