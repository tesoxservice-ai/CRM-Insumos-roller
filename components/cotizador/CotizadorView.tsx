// components/cotizador/CotizadorView.tsx
// Calculadora de precios de cortinas — portada 1:1 desde el proyecto
// Cotizador-insumos-roller (Vite + React independiente) al CRM. La lógica de
// cálculo y los estilos se mantienen igual; solo cambia de dónde lee los datos
// (misma Supabase del CRM en vez de un proyecto aparte) y se saca el login,
// que ahora lo maneja el CRM.

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Registro = Record<string, number>

interface ResultadoCalculo {
  costo: number
  contado: number
  lista: number
  cuota3: number
  cuota6: number
  tipo: string
  medidas: string
  metrosTela?: number
  panos?: number
  metrosRiel?: number
  m2?: number
  anchoBuscar?: number
  altoBuscar?: number
}

const fmt = (n: number) =>
  Math.round(n).toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })

function calcPrecios(costo: number, margen: number, config: Registro | null) {
  const recargo = config?.recargo_cuotas ?? 50
  const contado = costo * (1 + margen / 100)
  const lista = contado * (1 + recargo / 100)
  return { costo, contado, lista, cuota3: lista / 3, cuota6: lista / 6 }
}

export function CotizadorView() {
  const router = useRouter()
  const [tab, setTab] = useState<'textiles' | 'verticales' | 'roller'>('textiles')
  const [config, setConfig] = useState<Registro | null>(null)
  const [preciosTextiles, setPreciosTextiles] = useState<Registro | null>(null)
  const [preciosVerticales, setPreciosVerticales] = useState<Registro | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const cargar = async () => {
      try {
        const supabase = createClient()
        const [{ data: cfg }, { data: pt }, { data: pv }] = await Promise.all([
          supabase.from('configuracion').select('*'),
          supabase.from('precios_textiles').select('*'),
          supabase.from('precios_verticales').select('*'),
        ])
        const c = Object.fromEntries((cfg || []).map((r) => [r.clave, parseFloat(r.valor)]))
        const t = Object.fromEntries((pt || []).map((r) => [r.material, parseFloat(r.precio)]))
        const v = Object.fromEntries((pv || []).map((r) => [r.material, parseFloat(r.precio)]))
        setConfig(c)
        setPreciosTextiles(t)
        setPreciosVerticales(v)
      } catch (e) {
        setError('Error al cargar precios.')
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    cargar()
  }, [])

  const tabs: { id: typeof tab; label: string; icon: React.ReactNode }[] = [
    {
      id: 'textiles',
      label: 'Textiles',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6h18M3 12h18M3 18h18" />
        </svg>
      ),
    },
    {
      id: 'verticales',
      label: 'Verticales',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 3v18M15 3v18M3 9h18M3 15h18" />
        </svg>
      ),
    },
    {
      id: 'roller',
      label: 'Roller',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 9h18" />
        </svg>
      ),
    },
  ]

  return (
    <>
      <style>{`
        .cotizador-shell, .cotizador-shell *, .cotizador-shell *::before, .cotizador-shell *::after { box-sizing: border-box; }
        .cotizador-shell { background: #f0f2f5; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: -12px -12px -112px -12px; }
        @media (min-width: 768px) { .cotizador-shell { margin: -24px; } }

        .app { min-height: 100%; display: flex; flex-direction: column; background: #f0f2f5; color: #1a1a2e; }

        .btn-admin {
          display: flex;
          align-items: center;
          gap: 6px;
          height: 36px;
          padding: 0 14px;
          border-radius: 8px;
          border: 1px solid #fde68a;
          background: #fef3c7;
          color: #92400e;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
          flex-shrink: 0;
        }
        .btn-admin:hover { background: #1a1a2e; color: #fff; border-color: #1a1a2e; }

        /* TABS */
        .tabs-bar {
          background: #ffffff;
          border-bottom: 1px solid #e5e7eb;
          padding: 0 40px;
          display: flex;
          gap: 2px;
          align-items: center;
          justify-content: space-between;
          height: 52px;
        }
        .tabs-bar-group { display: flex; gap: 2px; align-items: center; }
        .tab-btn {
          display: flex;
          align-items: center;
          gap: 0;
          padding: 8px 20px;
          border: none;
          background: transparent;
          font-size: 13.5px;
          font-weight: 600;
          color: #9ca3af;
          cursor: pointer;
          border-radius: 8px;
          letter-spacing: 0.02em;
          transition: all 0.15s;
          position: relative;
        }
        .tab-btn:hover { color: #374151; background: #eff1f5; }
        .tab-btn.active {
          color: #1a1a2e;
          background: #ffffff;
          box-shadow: 0 1px 4px rgba(0,0,0,0.10), 0 0 0 1px #e5e7eb;
        }
        .tab-btn svg { display: none; }

        /* MAIN LAYOUT */
        .main-layout {
          flex: 1;
          display: grid;
          grid-template-columns: 400px 1fr;
          gap: 0;
          max-width: 1100px;
          width: 100%;
          margin: 0 auto;
          padding: 32px 40px 48px;
          gap: 24px;
          align-items: start;
        }

        /* FORM PANEL */
        .form-panel {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          overflow: hidden;
        }
        .form-header {
          padding: 18px 22px 16px;
          border-bottom: 1px solid #f3f4f6;
        }
        .form-header-title {
          font-size: 14px;
          font-weight: 700;
          color: #1a1a2e;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .form-header-title svg { color: #6b7280; }
        .form-body { padding: 22px; display: flex; flex-direction: column; gap: 18px; }

        .field-group { display: flex; flex-direction: column; gap: 7px; }
        .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .cotizador-shell label {
          font-size: 12px;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .cotizador-shell label svg { color: #9ca3af; }
        .cotizador-shell input[type="number"] {
          height: 48px;
          padding: 0 14px;
          border: 1.5px solid #e5e7eb;
          border-radius: 9px;
          font-size: 16px;
          font-weight: 500;
          color: #1a1a2e;
          background: #fff;
          outline: none;
          width: 100%;
          transition: border-color 0.15s;
          -webkit-appearance: none;
        }
        .cotizador-shell input[type="number"]:focus { border-color: #1a1a2e; }
        .input-suffix {
          position: relative;
        }
        .input-suffix input { padding-right: 36px; }
        .suffix-label {
          position: absolute;
          right: 13px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 13px;
          color: #9ca3af;
          font-weight: 500;
          pointer-events: none;
        }

        .radio-group { display: flex; gap: 8px; }
        .radio-btn {
          flex: 1;
          height: 44px;
          border: 1.5px solid #e5e7eb;
          border-radius: 9px;
          background: #fff;
          font-size: 13px;
          font-weight: 600;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.15s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }
        .radio-btn:hover { border-color: #9ca3af; color: #374151; }
        .radio-btn.active { border-color: #1a1a2e; background: #1a1a2e; color: #fff; }

        .btn-calcular {
          height: 52px;
          width: 100%;
          background: #1e40af;
          color: #fff;
          border: none;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          transition: background 0.15s, transform 0.1s;
          margin-top: 4px;
        }
        .btn-calcular:hover { background: #1d3a9f; }
        .btn-calcular:active { transform: scale(0.99); }
        .btn-calcular:disabled { background: #93c5fd; cursor: not-allowed; }

        /* RESULT PANEL */
        .result-panel {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .result-card {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          overflow: hidden;
        }
        .result-header {
          padding: 16px 22px;
          border-bottom: 1px solid #f3f4f6;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .result-header-icon {
          width: 34px;
          height: 34px;
          border-radius: 8px;
          background: #eff6ff;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #1e40af;
        }
        .result-header-text { flex: 1; }
        .result-header-title {
          font-size: 13px;
          font-weight: 700;
          color: #1a1a2e;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .result-header-sub { font-size: 12px; color: #9ca3af; margin-top: 1px; }

        .price-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 15px 22px;
          border-bottom: 1px solid #f9fafb;
        }
        .price-row:last-child { border-bottom: none; }
        .price-row-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .price-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          flex-shrink: 0;
        }
        .price-label { font-size: 14px; color: #4b5563; }
        .price-value { font-size: 17px; font-weight: 700; color: #1a1a2e; }

        .price-row.costo .price-icon { background: #f3f4f6; }
        .price-row.costo .price-value { color: #6b7280; font-size: 15px; }

        .price-row.contado { background: #f0fdf4; }
        .price-row.contado .price-icon { background: #dcfce7; }
        .price-row.contado .price-label { color: #166534; font-weight: 600; }
        .price-row.contado .price-value { color: #16a34a; font-size: 20px; }

        .price-row.lista .price-icon { background: #eff6ff; }
        .price-row.cuota .price-icon { background: #faf5ff; }
        .price-row.cuota .price-value { font-size: 15px; }
        .cuota-sub { font-size: 11px; color: #9ca3af; font-weight: 400; margin-left: 2px; }

        .btn-ojo {
          display: flex;
          align-items: center;
          gap: 5px;
          height: 30px;
          padding: 0 12px;
          border-radius: 20px;
          border: 1px solid #e5e7eb;
          background: #f9fafb;
          color: #6b7280;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
        }
        .btn-ojo:hover { background: #1a1a2e; color: #fff; border-color: #1a1a2e; }
        .btn-copiar {
          margin: 14px 22px 18px;
          height: 46px;
          border: 1.5px solid #1a1a2e;
          border-radius: 9px;
          background: transparent;
          color: #1a1a2e;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.15s;
        }
        .btn-copiar:hover { background: #1a1a2e; color: #fff; }
        .btn-copiar.copiado { background: #1a1a2e; color: #fff; }

        /* DESGLOSE */
        .desglose-card {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          overflow: hidden;
        }
        .desglose-header {
          padding: 13px 22px;
          border-bottom: 1px solid #f3f4f6;
          font-size: 11px;
          font-weight: 700;
          color: #9ca3af;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          display: flex;
          align-items: center;
          gap: 7px;
        }
        .desglose-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 11px 22px;
          border-bottom: 1px solid #f9fafb;
          font-size: 14px;
        }
        .desglose-row:last-child { border-bottom: none; }
        .desglose-label { color: #6b7280; }
        .desglose-value { font-weight: 600; color: #1a1a2e; }

        /* EMPTY STATE */
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 56px 32px;
          text-align: center;
          gap: 12px;
          color: #9ca3af;
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 14px;
        }
        .empty-state svg { color: #d1d5db; margin-bottom: 4px; }
        .empty-title { font-size: 15px; font-weight: 600; color: #6b7280; }
        .empty-sub { font-size: 13px; }

        /* NOTICE */
        .notice {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 13px 18px;
          display: flex;
          align-items: flex-start;
          gap: 10px;
          font-size: 13px;
          color: #6b7280;
        }
        .notice svg { color: #1e40af; margin-top: 1px; flex-shrink: 0; }

        /* LOADING / ERROR */
        .loading-screen {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          color: #6b7280;
          font-size: 15px;
        }
        .spinner {
          width: 36px; height: 36px;
          border: 3px solid #e5e7eb;
          border-top-color: #1e40af;
          border-radius: 50%;
          animation: cotizador-spin 0.7s linear infinite;
        }
        @keyframes cotizador-spin { to { transform: rotate(360deg); } }
        .error-box {
          background: #fef2f2; border: 1px solid #fecaca;
          border-radius: 9px; padding: 14px 18px;
          font-size: 14px; color: #dc2626;
        }

        /* FOOTER */
        .footer {
          text-align: center;
          padding: 20px;
          font-size: 12px;
          color: #9ca3af;
          border-top: 1px solid #e5e7eb;
          background: #fff;
        }
        .footer strong { color: #1a1a2e; }

        /* RESPONSIVE */
        @media (max-width: 768px) {
          .tabs-bar { padding: 0 16px; }
          .main-layout {
            grid-template-columns: 1fr;
            padding: 16px;
            gap: 16px;
          }
        }
      `}</style>

      <div className="cotizador-shell">
        <div className="app">
          {loading ? (
            <div className="loading-screen">
              <div className="spinner" />
              Cargando precios…
            </div>
          ) : error ? (
            <div style={{ padding: 32 }}>
              <div className="error-box">{error}</div>
            </div>
          ) : (
            <>
              {/* TABS */}
              <nav className="tabs-bar">
                <div className="tabs-bar-group">
                  {tabs.map((t) => (
                    <button
                      key={t.id}
                      className={`tab-btn ${tab === t.id ? 'active' : ''}`}
                      onClick={() => setTab(t.id)}
                    >
                      {t.icon}
                      {t.label}
                    </button>
                  ))}
                </div>
                <button className="btn-admin" onClick={() => router.push('/cotizador/precios')}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 1l3.09 6.26L22 8.27l-5 4.87L18.18 20 12 16.77 5.82 20 7 13.14 2 8.27l6.91-1.01L12 1z" />
                  </svg>
                  Precios
                </button>
              </nav>

              {/* MAIN */}
              <main className="main-layout">
                {tab === 'textiles' && <ModuloTextiles precios={preciosTextiles} config={config} />}
                {tab === 'verticales' && <ModuloVerticales precios={preciosVerticales} config={config} />}
                {tab === 'roller' && <ModuloRoller config={config} />}
              </main>
            </>
          )}

          <footer className="footer">
            <strong>INSUMOS ROLLER</strong> © 2024 &nbsp;·&nbsp; Diseñado para simplificar tu trabajo.
          </footer>
        </div>
      </div>
    </>
  )
}

function Resultado({ result, mostrarCosto = true, oculto, onToggleOculto }: {
  result: ResultadoCalculo
  config: Registro | null
  tipo: string
  medidas: string
  mostrarCosto?: boolean
  oculto?: boolean
  onToggleOculto?: () => void
}) {
  const [copiado, setCopiado] = useState(false)
  const desc = 30

  const copiar = () => {
    const texto = `🏠 Cotización Cortinas\nTipo: ${result.tipo}\n${result.medidas}\n\n💰 Precio contado/transferencia: ${fmt(result.contado)} (${desc}% OFF)\n📋 Precio financiado: ${fmt(result.lista)}\n💳 3 cuotas sin interés: ${fmt(result.cuota3)}/cuota\n💳 6 cuotas sin interés: ${fmt(result.cuota6)}/cuota\n\n✅ Consultas sin compromiso`
    navigator.clipboard.writeText(texto).then(() => {
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2500)
    })
  }

  return (
    <div className="result-card">
      <div className="result-header">
        <div className="result-header-icon">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
            <line x1="7" y1="7" x2="7.01" y2="7" />
          </svg>
        </div>
        <div className="result-header-text">
          <div className="result-header-title">Resultado</div>
          <div className="result-header-sub">Precios calculados</div>
        </div>
        {mostrarCosto && (
          <button className="btn-ojo" onClick={onToggleOculto} title={oculto ? 'Mostrar datos internos' : 'Ocultar datos internos'}>
            {oculto ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
            {oculto ? 'Mostrar' : 'Ocultar'}
          </button>
        )}
      </div>

      {mostrarCosto && !oculto && (
        <div className="price-row costo">
          <div className="price-row-left">
            <div className="price-icon">💼</div>
            <span className="price-label">Costo de materiales</span>
          </div>
          <span className="price-value">{fmt(result.costo)}</span>
        </div>
      )}

      <div className="price-row contado">
        <div className="price-row-left">
          <div className="price-icon">💵</div>
          <span className="price-label">Precio contado</span>
        </div>
        <span className="price-value">{fmt(result.contado)}</span>
      </div>

      <div className="price-row lista">
        <div className="price-row-left">
          <div className="price-icon">🏷️</div>
          <span className="price-label">Precio financiado</span>
        </div>
        <span className="price-value">{fmt(result.lista)}</span>
      </div>

      <div className="price-row cuota">
        <div className="price-row-left">
          <div className="price-icon" style={{ background: '#faf5ff', fontSize: 13, fontWeight: 700, color: '#7c3aed' }}>3</div>
          <span className="price-label">3 cuotas sin interés</span>
        </div>
        <span className="price-value">
          {fmt(result.cuota3)}<span className="cuota-sub">/cuota</span>
        </span>
      </div>

      <div className="price-row cuota">
        <div className="price-row-left">
          <div className="price-icon" style={{ background: '#faf5ff', fontSize: 13, fontWeight: 700, color: '#7c3aed' }}>6</div>
          <span className="price-label">6 cuotas sin interés</span>
        </div>
        <span className="price-value">
          {fmt(result.cuota6)}<span className="cuota-sub">/cuota</span>
        </span>
      </div>

      <button className={`btn-copiar ${copiado ? 'copiado' : ''}`} onClick={copiar}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
        {copiado ? '✓ ¡Copiado!' : 'Copiar cotización'}
      </button>
    </div>
  )
}

function EmptyResult({ label }: { label: string }) {
  return (
    <div className="empty-state">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M9 9h6M9 12h6M9 15h4" />
      </svg>
      <div className="empty-title">Sin resultados aún</div>
      <div className="empty-sub">Completá los datos y presioná {label}</div>
    </div>
  )
}

/* ─── MÓDULO TEXTILES ─── */
function ModuloTextiles({ precios, config }: { precios: Registro | null; config: Registro | null }) {
  const [ancho, setAncho] = useState('')
  const [tela, setTela] = useState<'gasa' | 'blackout'>('gasa')
  const [margen, setMargen] = useState(80)
  const [result, setResult] = useState<ResultadoCalculo | null>(null)
  const [oculto, setOculto] = useState(false)

  const calcular = () => {
    const aCm = parseFloat(ancho)
    if (!aCm || aCm <= 0 || !precios) return
    const a = aCm / 100 // cm → metros
    const precioTela = tela === 'gasa' ? precios.tela_gasa : precios.tela_blackout
    const factor = tela === 'gasa' ? 2.5 : 2
    const metrosTela = a * factor
    const panos = Math.ceil(metrosTela / 1.5)
    const costo = metrosTela * precioTela + panos * precios.paño + a * precios.riel
    setResult({
      ...calcPrecios(costo, margen, config),
      metrosTela,
      panos,
      metrosRiel: a,
      tipo: `Textiles - ${tela === 'gasa' ? 'Gasa / Voile' : 'Blackout'}`,
      medidas: `Ancho: ${aCm} cm (${a.toFixed(2)} m)`,
    })
  }

  return (
    <>
      <div className="form-panel">
        <div className="form-header">
          <div className="form-header-title">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
            Datos del paño
          </div>
        </div>
        <div className="form-body">
          <div className="field-group">
            <label>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 6H3M15 12H3M17 18H3" /></svg>
              Ancho
            </label>
            <div className="input-suffix">
              <input type="number" inputMode="numeric" placeholder="Ej: 206" value={ancho} onChange={(e) => setAncho(e.target.value)} min={0} step={1} />
              <span className="suffix-label">cm</span>
            </div>
          </div>

          <div className="field-group">
            <label>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 10h16M4 14h8" /></svg>
              Tipo de tela
            </label>
            <div className="radio-group">
              {([['gasa', 'Gasa / Voile'], ['blackout', 'Blackout']] as const).map(([v, l]) => (
                <button key={v} type="button" className={`radio-btn ${tela === v ? 'active' : ''}`} onClick={() => setTela(v)}>{l}</button>
              ))}
            </div>
          </div>

          {!oculto && (
            <div className="field-group">
              <label>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
                Margen de ganancia
              </label>
              <div className="input-suffix">
                <input type="number" value={margen} onChange={(e) => setMargen(parseFloat(e.target.value) || 0)} min={0} />
                <span className="suffix-label">%</span>
              </div>
            </div>
          )}

          <button className="btn-calcular" onClick={calcular}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="2" width="16" height="20" rx="2" /><path d="M8 6h8M8 10h8M8 14h4" />
            </svg>
            Calcular
          </button>
        </div>
      </div>

      <div className="result-panel">
        {result ? (
          <>
            <div className="desglose-card">
              <div className="desglose-header">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
                Desglose
              </div>
              <div className="desglose-row"><span className="desglose-label">Metros de tela</span><span className="desglose-value">{result.metrosTela!.toFixed(2)} m</span></div>
              <div className="desglose-row"><span className="desglose-label">Paños</span><span className="desglose-value">{result.panos}</span></div>
              <div className="desglose-row"><span className="desglose-label">Metros de riel</span><span className="desglose-value">{result.metrosRiel!.toFixed(2)} m</span></div>
            </div>
            <Resultado result={result} config={config} tipo={result.tipo} medidas={result.medidas} oculto={oculto} onToggleOculto={() => setOculto((o) => !o)} />
          </>
        ) : (
          <EmptyResult label="Calcular" />
        )}
        <div className="notice">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
          <span><strong>Importante:</strong> Los precios son estimativos y pueden variar según el proveedor y la disponibilidad.</span>
        </div>
      </div>
    </>
  )
}

/* ─── MÓDULO VERTICALES ─── */
function ModuloVerticales({ precios, config }: { precios: Registro | null; config: Registro | null }) {
  const [ancho, setAncho] = useState('')
  const [alto, setAlto] = useState('')
  const [tela, setTela] = useState<'blackout_premium' | 'screen'>('blackout_premium')
  const [margen, setMargen] = useState(80)
  const [result, setResult] = useState<ResultadoCalculo | null>(null)
  const [oculto, setOculto] = useState(false)

  const calcular = () => {
    const aCm = parseFloat(ancho)
    const hCm = parseFloat(alto)
    if (!aCm || !hCm || !precios) return
    const a = aCm / 100 // cm → metros
    const h = hCm / 100
    const m2 = a * h
    const precioTela = tela === 'blackout_premium' ? precios.blackout_premium_m2 : precios.screen_m2
    const costo = a * precios.riel_por_metro + m2 * precioTela
    setResult({
      ...calcPrecios(costo, margen, config),
      m2,
      tipo: `Verticales - ${tela === 'blackout_premium' ? 'Blackout Premium' : 'Screen'}`,
      medidas: `Ancho: ${aCm} cm | Alto: ${hCm} cm`,
    })
  }

  return (
    <>
      <div className="form-panel">
        <div className="form-header">
          <div className="form-header-title">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 3v18M15 3v18" /></svg>
            Dimensiones
          </div>
        </div>
        <div className="form-body">
          <div className="field-row">
            <div className="field-group">
              <label>Ancho</label>
              <div className="input-suffix">
                <input type="number" inputMode="numeric" placeholder="200" value={ancho} onChange={(e) => setAncho(e.target.value)} min={0} step={1} />
                <span className="suffix-label">cm</span>
              </div>
            </div>
            <div className="field-group">
              <label>Alto</label>
              <div className="input-suffix">
                <input type="number" inputMode="numeric" placeholder="200" value={alto} onChange={(e) => setAlto(e.target.value)} min={0} step={1} />
                <span className="suffix-label">cm</span>
              </div>
            </div>
          </div>

          <div className="field-group">
            <label>Tipo de tela</label>
            <div className="radio-group">
              {([['blackout_premium', 'Blackout Premium'], ['screen', 'Screen']] as const).map(([v, l]) => (
                <button key={v} type="button" className={`radio-btn ${tela === v ? 'active' : ''}`} onClick={() => setTela(v)}>{l}</button>
              ))}
            </div>
          </div>

          {!oculto && (
            <div className="field-group">
              <label>Margen de ganancia</label>
              <div className="input-suffix">
                <input type="number" value={margen} onChange={(e) => setMargen(parseFloat(e.target.value) || 0)} min={0} />
                <span className="suffix-label">%</span>
              </div>
            </div>
          )}

          <button className="btn-calcular" onClick={calcular}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="2" width="16" height="20" rx="2" /><path d="M8 6h8M8 10h8M8 14h4" />
            </svg>
            Calcular
          </button>
        </div>
      </div>

      <div className="result-panel">
        {result ? (
          <>
            <div className="desglose-card">
              <div className="desglose-header">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /></svg>
                Desglose
              </div>
              <div className="desglose-row"><span className="desglose-label">Metros cuadrados</span><span className="desglose-value">{result.m2!.toFixed(2)} m²</span></div>
            </div>
            <Resultado result={result} config={config} tipo={result.tipo} medidas={result.medidas} oculto={oculto} onToggleOculto={() => setOculto((o) => !o)} />
          </>
        ) : (
          <EmptyResult label="Calcular" />
        )}
        <div className="notice">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
          <span><strong>Importante:</strong> Los precios son estimativos y pueden variar según el proveedor y la disponibilidad.</span>
        </div>
      </div>
    </>
  )
}

/* ─── MÓDULO ROLLER ─── */
function ModuloRoller({ config }: { config: Registro | null }) {
  const [ancho, setAncho] = useState('')
  const [alto, setAlto] = useState('')
  const [tipo, setTipo] = useState<'blackout' | 'screen'>('blackout')
  const [result, setResult] = useState<ResultadoCalculo | null>(null)
  const [loadingCalc, setLoadingCalc] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const calcular = async () => {
    const a = parseInt(ancho, 10)
    const h = parseInt(alto, 10)
    if (!a || !h) return
    const anchoBuscar = Math.ceil(a / 10) * 10
    const altoBuscar = Math.ceil(h / 10) * 10
    setLoadingCalc(true)
    setErrorMsg(null)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('precios_roller')
      .select('precio')
      .eq('alto_cm', altoBuscar)
      .eq('ancho_cm', anchoBuscar)
      .single()
    setLoadingCalc(false)
    if (error || !data) {
      setErrorMsg(`No se encontró precio para ${anchoBuscar}×${altoBuscar} cm.`)
      return
    }
    const precio = data.precio as number
    const recargo = config?.recargo_cuotas ?? 50
    const lista = precio * (1 + recargo / 100)
    setResult({
      costo: precio,
      contado: precio,
      lista,
      cuota3: lista / 3,
      cuota6: lista / 6,
      anchoBuscar,
      altoBuscar,
      tipo: `Roller - ${tipo === 'blackout' ? 'Blackout' : 'Screen'}`,
      medidas: `Ancho: ${a} cm | Alto: ${h} cm`,
    })
  }

  return (
    <>
      <div className="form-panel">
        <div className="form-header">
          <div className="form-header-title">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" /></svg>
            Medidas de la persiana
          </div>
        </div>
        <div className="form-body">
          <div className="field-row">
            <div className="field-group">
              <label>Ancho (cm)</label>
              <div className="input-suffix">
                <input type="number" inputMode="numeric" placeholder="120" value={ancho} onChange={(e) => setAncho(e.target.value)} min={0} />
                <span className="suffix-label">cm</span>
              </div>
            </div>
            <div className="field-group">
              <label>Alto (cm)</label>
              <div className="input-suffix">
                <input type="number" inputMode="numeric" placeholder="160" value={alto} onChange={(e) => setAlto(e.target.value)} min={0} />
                <span className="suffix-label">cm</span>
              </div>
            </div>
          </div>

          <div className="field-group">
            <label>Tipo</label>
            <div className="radio-group">
              {([['blackout', 'Blackout'], ['screen', 'Screen']] as const).map(([v, l]) => (
                <button key={v} type="button" className={`radio-btn ${tipo === v ? 'active' : ''}`} onClick={() => setTipo(v)}>{l}</button>
              ))}
            </div>
          </div>

          {errorMsg && <div className="error-box">{errorMsg}</div>}

          <button className="btn-calcular" disabled={loadingCalc} onClick={calcular}>
            {loadingCalc ? (
              <>
                <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2, borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} />
                Calculando…
              </>
            ) : (
              <>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="2" width="16" height="20" rx="2" /><path d="M8 6h8M8 10h8M8 14h4" />
                </svg>
                Calcular
              </>
            )}
          </button>
        </div>
      </div>

      <div className="result-panel">
        {result ? (
          <>
            <div className="desglose-card">
              <div className="desglose-header">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6" /><line x1="3" y1="6" x2="3.01" y2="6" /></svg>
                Desglose
              </div>
              <div className="desglose-row"><span className="desglose-label">Tabla consultada</span><span className="desglose-value">{result.anchoBuscar}×{result.altoBuscar} cm</span></div>
            </div>
            <Resultado result={result} config={config} tipo={result.tipo} medidas={result.medidas} mostrarCosto={false} />
          </>
        ) : (
          <EmptyResult label="Calcular" />
        )}
        <div className="notice">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
          <span><strong>Importante:</strong> Los precios son estimativos y pueden variar según el proveedor y la disponibilidad.</span>
        </div>
      </div>
    </>
  )
}
