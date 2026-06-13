import { ImageResponse } from 'next/og';

// Edge runtime: WASM (resvg/yoga) bundled correctly, no Prisma needed
export const runtime = 'edge';

export async function GET(request) {
  const { searchParams } = new URL(request.url);

  const imgUrl   = searchParams.get('img') || '';
  const loc      = searchParams.get('loc') || '';
  const layout   = searchParams.get('layout') || '';
  const info     = searchParams.get('info') || '';
  const legal    = searchParams.get('legal') || '';
  const speed    = searchParams.get('speed') || '';
  const amenities = searchParams.get('amenities') || '—';
  const locscore  = searchParams.get('locscore') || '—';
  const isRent   = searchParams.get('rent') === '1';

  // Fallback if called without params
  const hasData = loc || layout || info;

  if (!hasData) {
    return new ImageResponse(
      <div style={{ display: 'flex', width: '100%', height: '100%', background: '#0f172a', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', fontSize: 52, fontWeight: 800, color: '#fff' }}>TN Property Mandi</div>
        <div style={{ display: 'flex', fontSize: 22, color: '#94a3b8' }}>Real Estate in Tamil Nadu</div>
      </div>,
      { width: 1200, height: 630 }
    );
  }

  const cell = (bg, label, sublabel, value) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: bg, padding: '14px 4px', flex: 1 }}>
      <span style={{ display: 'flex', fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'center' }}>{label}</span>
      <span style={{ display: 'flex', fontSize: 11, color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>{sublabel}</span>
      <span style={{ display: 'flex', fontSize: 24, fontWeight: 800, color: '#fff' }}>{value}</span>
    </div>
  );

  return new ImageResponse(
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', background: '#f8fafc', fontFamily: 'sans-serif' }}>
      {/* Property photo top ~55% */}
      {imgUrl
        ? <div style={{ display: 'flex', width: '100%', height: 346, background: '#1e3a5f' }}>
            <img src={imgUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
          </div>
        : <div style={{ display: 'flex', width: '100%', height: 346, background: '#1e3a5f', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ display: 'flex', fontSize: 36, fontWeight: 700, color: 'rgba(255,255,255,0.25)' }}>TN Property Mandi</span>
          </div>
      }

      {/* Card bottom ~45% */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '14px 40px 12px', background: '#f0fdf4' }}>
        {/* Location | Layout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <div style={{ display: 'flex', width: 8, height: 8, background: '#3b82f6', borderRadius: 4 }} />
          {loc ? <span style={{ display: 'flex', fontSize: 15, color: '#475569', fontWeight: 600 }}>{loc}</span> : null}
          {loc && layout ? <span style={{ display: 'flex', fontSize: 15, color: '#cbd5e1', margin: '0 4px' }}>|</span> : null}
          {layout ? <span style={{ display: 'flex', fontSize: 17, fontWeight: 800, color: '#0f172a' }}>{layout}</span> : null}
        </div>

        {info ? <div style={{ display: 'flex', fontSize: 13, color: '#64748b', fontWeight: 500, marginBottom: 10 }}>{info}</div> : null}

        {/* Ratings */}
        <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1px solid #cbd5e1', marginBottom: 10 }}>
          {!isRent && legal ? cell('#24675e', 'Legal', 'grade', legal) : null}
          {!isRent && speed ? cell('#235bd8', 'Area Sales', 'speed', speed) : null}
          {cell('#d3a72f', 'Amenities', 'rating', amenities)}
          {cell('#ea580c', 'Location', 'score', locscore)}
        </div>

        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ display: 'flex', width: 16, height: 16, background: '#24675e', borderRadius: 3, alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ display: 'flex', color: '#fff', fontSize: 10, fontWeight: 800 }}>TN</span>
          </div>
          <span style={{ display: 'flex', fontSize: 13, color: '#64748b', fontWeight: 600 }}>tnpropertymandi.in</span>
        </div>
      </div>
    </div>,
    { width: 1200, height: 630 }
  );
}
