// components/cotizador/PreciosView.tsx
// Panel de precios del Cotizador — portado 1:1 desde Cotizador-insumos-roller
// (antes "Admin"). Se le sacó el login/logout propio, ahora usa el del CRM.

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const toNum = (v: string) => parseFloat(String(v).replace(',', '.')) || 0

type Valores = Record<string, string>

function usePreciosAdmin() {
  const [data, setData] = useState<{ config: Valores; textiles: Valores; verticales: Valores }>({ config: {}, textiles: {}, verticales: {} })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const cargar = async () => {
      try {
        const supabase = createClient()
        const [{ data: cfg, error: eCfg }, { data: tex, error: eTex }, { data: ver, error: eVer }] = await Promise.all([
          supabase.from('configuracion').select('clave,valor'),
          supabase.from('precios_textiles').select('material,precio'),
          supabase.from('precios_verticales').select('material,precio'),
        ])
        if (eCfg || eTex || eVer) throw eCfg || eTex || eVer
        setData({
          config: Object.fromEntries((cfg || []).map((r) => [r.clave, String(r.valor)])),
          textiles: Object.fromEntries((tex || []).map((r) => [r.material, String(r.precio)])),
          verticales: Object.fromEntries((ver || []).map((r) => [r.material, String(r.precio)])),
        })
      } catch (e) {
        setError('No se pudieron cargar los datos. Verificá la conexión.')
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    cargar()
  }, [])

  return { data, setData, loading, error }
}

interface Campo { key: string; label: string; sufijo?: string; tipo: 'porcentaje' | 'precio' }

function Seccion({ titulo, descripcion, icon, fields, values, onChange, onSave, saving, feedback }: {
  titulo: string
  descripcion?: string
  icon: React.ReactNode
  fields: Campo[]
  values: Valores
  onChange: (key: string, value: string) => void
  onSave: () => void
  saving: boolean
  feedback: { ok: boolean; msg: string } | null
}) {
  return (
    <section className="seccion">
      <div className="seccion-header">
        <div className="seccion-header-inner">
          <div className="seccion-icon">{icon}</div>
          <div>
            <h2 className="seccion-titulo">{titulo}</h2>
            {descripcion && <p className="seccion-desc">{descripcion}</p>}
          </div>
        </div>
      </div>
      <div className="seccion-body">
        {fields.map(({ key, label, sufijo, tipo }) => (
          <div className="field-group" key={key}>
            <label htmlFor={key}>{label}</label>
            <div className="input-wrap">
              {tipo === 'porcentaje' && <span className="input-prefix">%</span>}
              {tipo === 'precio' && <span className="input-prefix">$</span>}
              <input
                id={key}
                type="number"
                inputMode="decimal"
                value={values[key] ?? ''}
                onChange={(e) => onChange(key, e.target.value)}
                min={0}
                step={tipo === 'porcentaje' ? '0.01' : '1'}
              />
              {sufijo && <span className="input-sufijo">{sufijo}</span>}
            </div>
          </div>
        ))}
      </div>
      {feedback && (
        <div className={`feedback ${feedback.ok ? 'feedback-ok' : 'feedback-err'}`}>
          {feedback.ok ? '✓ ' : '✗ '}{feedback.msg}
        </div>
      )}
      <div className="seccion-footer">
        <button className="btn-guardar" disabled={saving} onClick={onSave}>
          {saving ? <span className="spinner" /> : (
            <>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
              </svg>
              Guardar cambios
            </>
          )}
        </button>
      </div>
    </section>
  )
}

export function PreciosView() {
  const router = useRouter()
  const { data, setData, loading, error } = usePreciosAdmin()
  const [sectState, setSectState] = useState<Record<'config' | 'textiles' | 'verticales', { saving: boolean; feedback: { ok: boolean; msg: string } | null }>>({
    config: { saving: false, feedback: null },
    textiles: { saving: false, feedback: null },
    verticales: { saving: false, feedback: null },
  })

  const setSect = (seccion: 'config' | 'textiles' | 'verticales', patch: Partial<{ saving: boolean; feedback: { ok: boolean; msg: string } | null }>) =>
    setSectState((s) => ({ ...s, [seccion]: { ...s[seccion], ...patch } }))

  const handleChange = (seccion: 'config' | 'textiles' | 'verticales', key: string, val: string) =>
    setData((d) => ({ ...d, [seccion]: { ...d[seccion], [key]: val } }))

  const guardarConfig = async () => {
    setSect('config', { saving: true, feedback: null })
    try {
      const supabase = createClient()
      const ops = Object.entries(data.config).map(([clave, valor]) =>
        supabase.from('configuracion').update({ valor: String(toNum(valor)) }).eq('clave', clave)
      )
      const results = await Promise.all(ops)
      if (results.find((r) => r.error)) throw new Error()
      setSect('config', { saving: false, feedback: { ok: true, msg: 'Configuración guardada correctamente.' } })
    } catch {
      setSect('config', { saving: false, feedback: { ok: false, msg: 'Error al guardar. Intentá de nuevo.' } })
    }
  }

  const guardarTextiles = async () => {
    setSect('textiles', { saving: true, feedback: null })
    try {
      const supabase = createClient()
      const ops = Object.entries(data.textiles).map(([material, precio]) =>
        supabase.from('precios_textiles').update({ precio: toNum(precio) }).eq('material', material)
      )
      const results = await Promise.all(ops)
      if (results.find((r) => r.error)) throw new Error()
      setSect('textiles', { saving: false, feedback: { ok: true, msg: 'Precios actualizados correctamente.' } })
    } catch {
      setSect('textiles', { saving: false, feedback: { ok: false, msg: 'Error al guardar. Intentá de nuevo.' } })
    }
  }

  const guardarVerticales = async () => {
    setSect('verticales', { saving: true, feedback: null })
    try {
      const supabase = createClient()
      const ops = Object.entries(data.verticales).map(([material, precio]) =>
        supabase.from('precios_verticales').update({ precio: toNum(precio) }).eq('material', material)
      )
      const results = await Promise.all(ops)
      if (results.find((r) => r.error)) throw new Error()
      setSect('verticales', { saving: false, feedback: { ok: true, msg: 'Precios actualizados correctamente.' } })
    } catch {
      setSect('verticales', { saving: false, feedback: { ok: false, msg: 'Error al guardar. Intentá de nuevo.' } })
    }
  }

  return (
    <>
      <style>{`
        .cotizador-shell, .cotizador-shell *, .cotizador-shell *::before, .cotizador-shell *::after { box-sizing: border-box; }
        .cotizador-shell { background: #f0f2f5; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: -12px -12px -112px -12px; }
        @media (min-width: 768px) { .cotizador-shell { margin: -24px; } }

        .admin-app { min-height: 100%; display: flex; flex-direction: column; background: #f0f2f5; color: #1a1a2e; }

        .header {
          background: #ffffff;
          padding: 0 40px;
          height: 72px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: sticky;
          top: 0;
          z-index: 10;
          box-shadow: 0 1px 0 #e5e7eb, 0 2px 16px rgba(0,0,0,0.05);
        }
        .logo img {
          height: 52px;
          width: auto;
          object-fit: contain;
          display: block;
        }
        .header-center {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          pointer-events: none;
        }
        .header-center-title {
          font-size: 15px;
          font-weight: 700;
          color: #1a1a2e;
          letter-spacing: -0.01em;
        }
        .header-center-sub {
          font-size: 11px;
          color: #9ca3af;
          font-weight: 500;
          letter-spacing: 0.04em;
        }
        .header-actions { display: flex; gap: 8px; }
        .btn-header {
          display: flex;
          align-items: center;
          gap: 6px;
          height: 36px;
          padding: 0 14px;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
          background: #f9fafb;
          color: #374151;
        }
        .btn-header:hover { background: #1a1a2e; color: #fff; border-color: #1a1a2e; }

        .sub-header {
          background: #ffffff;
          border-bottom: 1px solid #e5e7eb;
          padding: 12px 40px;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .admin-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #fef3c7;
          color: #92400e;
          font-size: 11.5px;
          font-weight: 700;
          letter-spacing: 0.05em;
          padding: 4px 12px;
          border-radius: 20px;
          text-transform: uppercase;
          border: 1px solid #fde68a;
        }
        .sub-header-desc {
          font-size: 13px;
          color: #6b7280;
        }

        .content {
          flex: 1;
          padding: 32px 40px 56px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          max-width: 680px;
          width: 100%;
          margin: 0 auto;
        }

        .seccion {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          overflow: hidden;
        }
        .seccion-header {
          padding: 20px 24px 16px;
          border-bottom: 1px solid #f3f4f6;
        }
        .seccion-header-inner {
          display: flex;
          align-items: flex-start;
          gap: 14px;
        }
        .seccion-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: #f3f4f6;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          color: #374151;
        }
        .seccion-titulo {
          font-size: 15px;
          font-weight: 700;
          color: #1a1a2e;
          letter-spacing: -0.01em;
          margin-top: 2px;
        }
        .seccion-desc {
          font-size: 12.5px;
          color: #9ca3af;
          margin-top: 3px;
          line-height: 1.45;
        }
        .seccion-body {
          padding: 20px 24px 4px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .seccion-footer {
          padding: 16px 24px 20px;
        }

        .field-group { display: flex; flex-direction: column; gap: 7px; }
        .field-group label {
          font-size: 12px;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .input-wrap {
          display: flex;
          align-items: center;
          border: 1.5px solid #e5e7eb;
          border-radius: 9px;
          background: #fff;
          overflow: hidden;
          transition: border-color 0.15s;
        }
        .input-wrap:focus-within { border-color: #1a1a2e; }
        .input-prefix {
          padding: 0 10px 0 14px;
          font-size: 15px;
          color: #9ca3af;
          font-weight: 500;
          flex-shrink: 0;
          user-select: none;
        }
        .input-sufijo {
          padding: 0 14px 0 4px;
          font-size: 13px;
          color: #9ca3af;
          flex-shrink: 0;
          user-select: none;
        }
        .input-wrap input {
          flex: 1;
          height: 48px;
          border: none;
          outline: none;
          background: transparent;
          font-size: 16px;
          font-weight: 500;
          color: #1a1a2e;
          -webkit-appearance: none;
          appearance: none;
          min-width: 0;
          padding: 0 4px 0 0;
        }

        .feedback {
          margin: 0 24px 4px;
          padding: 11px 14px;
          border-radius: 8px;
          font-size: 13.5px;
          font-weight: 500;
          line-height: 1.4;
        }
        .feedback-ok {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          color: #166534;
        }
        .feedback-err {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
        }

        .btn-guardar {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          height: 48px;
          background: #1e40af;
          color: #fff;
          border: none;
          border-radius: 9px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.15s, transform 0.1s;
        }
        .btn-guardar:hover:not(:disabled) { background: #1d3a9f; }
        .btn-guardar:active:not(:disabled) { transform: scale(0.99); }
        .btn-guardar:disabled { background: #93c5fd; cursor: not-allowed; }

        .nota-roller {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          padding: 20px 24px;
          display: flex;
          gap: 14px;
          align-items: flex-start;
        }
        .nota-roller-icon {
          width: 40px; height: 40px;
          background: #f3f4f6;
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          font-size: 18px; flex-shrink: 0;
        }
        .nota-roller-text { font-size: 13.5px; color: #6b7280; line-height: 1.55; padding-top: 2px; }
        .nota-roller-text strong { color: #374151; font-weight: 600; }
        .nota-roller-text code { background: #f3f4f6; padding: 1px 5px; border-radius: 4px; font-size: 12px; color: #1a1a2e; }

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
          width: 20px; height: 20px;
          border: 2.5px solid rgba(255,255,255,0.35);
          border-top-color: #fff;
          border-radius: 50%;
          animation: precios-spin 0.7s linear infinite;
          display: inline-block;
        }
        .spinner-page {
          width: 36px; height: 36px;
          border: 3px solid #e5e7eb;
          border-top-color: #1e40af;
          border-radius: 50%;
          animation: precios-spin 0.7s linear infinite;
        }
        @keyframes precios-spin { to { transform: rotate(360deg); } }
        .error-box {
          background: #fef2f2; border: 1px solid #fecaca;
          border-radius: 9px; padding: 14px 18px;
          font-size: 14px; color: #dc2626;
        }

        .footer {
          text-align: center;
          padding: 20px;
          font-size: 12px;
          color: #9ca3af;
          border-top: 1px solid #e5e7eb;
          background: #fff;
        }
        .footer strong { color: #1a1a2e; }

        @media (max-width: 768px) {
          .header { padding: 0 16px; }
          .header-center { display: none; }
          .logo img { height: 40px; }
          .sub-header { padding: 10px 16px; }
          .content { padding: 20px 16px 48px; }
          .seccion-body { padding: 16px 16px 4px; }
          .seccion-header { padding: 16px 16px 12px; }
          .seccion-footer { padding: 12px 16px 16px; }
          .feedback { margin: 0 16px 4px; }
        }
      `}</style>

      <div className="cotizador-shell">
        <div className="admin-app">

          <header className="header">
            <div className="logo">
              <img src="/LOGO.png" alt="Insumos Roller" />
            </div>
            <div className="header-center">
              <span className="header-center-title">Panel de Administración</span>
              <span className="header-center-sub">Gestión de precios y márgenes</span>
            </div>
            <div className="header-actions">
              <button className="btn-header" onClick={() => router.push('/cotizador')}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                Cotizador
              </button>
            </div>
          </header>

          <div className="sub-header">
            <span className="admin-badge">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1l3.09 6.26L22 8.27l-5 4.87L18.18 20 12 16.77 5.82 20 7 13.14 2 8.27l6.91-1.01L12 1z" /></svg>
              Admin
            </span>
            <span className="sub-header-desc">Los cambios se aplican al cotizador de forma inmediata.</span>
          </div>

          {loading ? (
            <div className="loading-screen">
              <div className="spinner-page" />
              Cargando precios…
            </div>
          ) : error ? (
            <div style={{ padding: 32 }}>
              <div className="error-box">{error}</div>
            </div>
          ) : (
            <main className="content">

              <Seccion
                titulo="Configuración general"
                descripcion="Márgenes y recargos que afectan a todos los tipos de cortinas."
                icon={
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07M8.46 8.46a5 5 0 0 0 0 7.07" />
                  </svg>
                }
                fields={[
                  { key: 'margen_default', label: 'Margen de ganancia por defecto', tipo: 'porcentaje', sufijo: '%' },
                  { key: 'recargo_cuotas', label: 'Recargo precio de lista vs. contado', tipo: 'porcentaje', sufijo: '%' },
                  { key: 'descuento_contado_display', label: 'Descuento contado mostrado al cliente', tipo: 'porcentaje', sufijo: '%' },
                  { key: 'descuento_contado_real', label: 'Descuento contado real (interno)', tipo: 'porcentaje', sufijo: '%' },
                ]}
                values={data.config}
                onChange={(k, v) => handleChange('config', k, v)}
                onSave={guardarConfig}
                saving={sectState.config.saving}
                feedback={sectState.config.feedback}
              />

              <Seccion
                titulo="Cortinas Textiles"
                descripcion="Precios de materiales por unidad (metro o paño)."
                icon={
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18M3 12h18M3 18h18" />
                  </svg>
                }
                fields={[
                  { key: 'tela_gasa', label: 'Tela Gasa (por metro)', tipo: 'precio' },
                  { key: 'tela_blackout', label: 'Tela Blackout (por metro)', tipo: 'precio' },
                  { key: 'paño', label: 'Paño (por unidad)', tipo: 'precio' },
                  { key: 'riel', label: 'Riel (por metro)', tipo: 'precio' },
                ]}
                values={data.textiles}
                onChange={(k, v) => handleChange('textiles', k, v)}
                onSave={guardarTextiles}
                saving={sectState.textiles.saving}
                feedback={sectState.textiles.feedback}
              />

              <Seccion
                titulo="Cortinas Verticales"
                descripcion="Precios de materiales por metro lineal o metro cuadrado."
                icon={
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 3v18M15 3v18M3 9h18M3 15h18" />
                  </svg>
                }
                fields={[
                  { key: 'riel_por_metro', label: 'Riel (por metro de ancho)', tipo: 'precio' },
                  { key: 'blackout_premium_m2', label: 'Tela Blackout Premium (por m²)', tipo: 'precio' },
                  { key: 'screen_m2', label: 'Tela Screen (por m²)', tipo: 'precio' },
                ]}
                values={data.verticales}
                onChange={(k, v) => handleChange('verticales', k, v)}
                onSave={guardarVerticales}
                saving={sectState.verticales.saving}
                feedback={sectState.verticales.feedback}
              />

              <div className="nota-roller">
                <div className="nota-roller-icon">🔒</div>
                <p className="nota-roller-text">
                  <strong>Cortinas Roller:</strong> los precios se cargan desde una tabla
                  fija de 728 registros provista por el proveedor. Para actualizarlos
                  hay que reemplazar la tabla <code>precios_roller</code> directamente en Supabase.
                </p>
              </div>

            </main>
          )}

          <footer className="footer">
            <strong>INSUMOS ROLLER</strong> © 2024 &nbsp;·&nbsp; Panel de administración.
          </footer>
        </div>
      </div>
    </>
  )
}
