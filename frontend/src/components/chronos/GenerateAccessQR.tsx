import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { QRCodeSVG } from 'qrcode.react'

export type QRStatus = 'idle' | 'generating' | 'generated' | 'claimed';

interface GenerateAccessQRProps {
  patientId: string;
  inline?: boolean;
}

interface QRTokenRecord {
  id: number;
  patient_id: string;
  token_string: string;
  expires_at: string;
  is_used: boolean;
  created_at: string;
}

export default function GenerateAccessQR({ patientId, inline = false }: GenerateAccessQRProps) {
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [status, setStatus] = useState<QRStatus>('idle')
  const [error, setError] = useState<string | null>(null)

  const handleGenerateQR = async () => {
    setLoading(true)
    setError(null)
    try {
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + 24)

      const { data, error: insertError } = await supabase
        .from('qr_tokens')
        .insert({
          patient_id: patientId,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single()

      if (insertError) throw insertError

      const record = data as QRTokenRecord;
      setToken(record.token_string)
      setStatus('generated')
    } catch (err: any) {
      console.error('Error generating QR token:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!token) return

    const subscription = supabase
      .channel(`qr_tokens_changes_${token}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'qr_tokens',
          filter: `token_string=eq.${token}`,
        },
        (payload: any) => {
          if (payload.new.is_used) {
            setStatus('claimed')
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(subscription)
    }
  }, [token])

  return (
    <>
      {status === 'idle' && (
        <button 
          onClick={handleGenerateQR}
          disabled={loading}
          className={`py-2.5 px-4 rounded-lg border border-emerald-400 bg-emerald-500/10 text-emerald-300 font-mono text-xs uppercase tracking-[0.1em] hover:bg-emerald-500/20 hover:text-emerald-200 transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.15)] backdrop-blur-md ${inline ? 'w-auto max-h-[40px]' : 'mt-4 w-full'}`}
          style={{ cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
        >
          {loading ? (inline ? 'GENERATING...' : 'GENERATING SECURE TOKEN...') : (inline ? 'FAMILY ACCESS QR' : 'GENERATE FAMILY ACCESS QR')}
        </button>
      )}

      <style>{`
        @keyframes cyber-entrance {
          from { transform: scale(0.92) translateY(10px); opacity: 0; }
          to { transform: scale(1) translateY(0); opacity: 1; }
        }
        @keyframes scanline {
          0% { transform: translateY(-5px); }
          100% { transform: translateY(220px); }
        }
        @keyframes pulseDot {
          0% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.3); opacity: 1; }
          100% { transform: scale(1); opacity: 0.6; }
        }
        .sync-dot {
          width: 8px;
          height: 8px;
          background: #34d399;
          border-radius: 50%;
          animation: pulseDot 1.6s infinite;
        }
      `}</style>
      
      {(status === 'generated' || status === 'claimed') && token && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-[4px]">
          <div 
            className="relative flex flex-col items-center max-w-[420px] w-[90vw] rounded-2xl p-[28px]"
            style={{ 
              background: 'var(--glass-bg)',
              backdropFilter: 'var(--glass-blur)',
              border: '1px solid var(--sidebar-item-active)',
              boxShadow: 'var(--glass-shadow)',
              animation: 'cyber-entrance 0.25s ease-out forwards'
            } as any}
          >
            <button
               onClick={() => setStatus('idle')}
               className="absolute top-[12px] right-[12px] text-slate-500 hover:text-white transition-opacity opacity-70 hover:opacity-100 text-lg z-10 p-2"
             >
               ✕
             </button>
             
             <div className="w-full border-b border-emerald-500/20 pb-5 mb-5 text-center mt-1">
               <h2 className="text-emerald-400 font-mono text-sm tracking-widest uppercase inline-block">
                 {status === 'claimed' ? 'CONNECTION SUCCESSFUL' : 'SECURE FAMILY ACCESS LINK'}
               </h2>
             </div>
            
            <div className={status === 'claimed' ? "" : "relative bg-white p-[14px] rounded-xl shadow-md mb-4"}>
              {status === 'generated' && (
                <div onClick={() => setStatus('claimed')} style={{ cursor: 'pointer' }}>
                  <QRCodeSVG 
                    value={token} 
                    size={260} 
                    level="H" 
                    bgColor="#ffffff" 
                    fgColor="#000000"
                    includeMargin={false}
                  />
                  {/* Futuristic Scanline Overlay */}
                  <div 
                    className="absolute left-0 right-0 h-1 bg-gradient-to-b from-transparent to-emerald-400 shadow-[0_4px_10px_rgba(16,185,129,0.6)] opacity-70 cursor-pointer pointer-events-none"
                    style={{ animation: 'scanline 2.5s infinite linear' } as any}
                  />
                </div>
              )}
              {status === 'claimed' && (
                <div className="flex flex-col items-center justify-center w-[200px] h-[200px] rounded-xl border-2 border-emerald-500 bg-emerald-500/10 animate-in zoom-in duration-300">
                  <span className="text-6xl mb-4">✅</span>
                  <span className="text-emerald-400 font-bold tracking-widest">CONNECTED</span>
                </div>
              )}
            </div>
            
            {status === 'generated' && (
              <div className="flex flex-col items-center w-full">
                <div className="flex items-center justify-center gap-2 text-emerald-400 text-sm mb-[10px]">
                  <span className="sync-dot"></span>
                  <span className="font-mono text-xs uppercase tracking-widest">Awaiting Mobile Sync</span>
                </div>

                <p className="text-slate-400 text-[10px] text-center uppercase tracking-[0.15em] leading-relaxed">
                  Scan this QR code using the Synapse Mobile App to establish a secure connection
                </p>
              </div>
            )}
            
            {status === 'claimed' && (
              <p className="text-sm text-emerald-400/80 text-center font-mono animate-pulse">
                Family app is now receiving live telemetry.
              </p>
            )}
          </div>
        </div>
      )}

      {status === 'claimed' && (
        <div className={`py-2.5 px-4 rounded-lg border border-emerald-500 bg-emerald-500/20 text-emerald-400 font-mono text-xs uppercase tracking-[0.1em] flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.2)] backdrop-blur-md ${inline ? 'w-auto max-h-[40px]' : 'w-full'}`}>
          <span className="text-lg leading-none mr-2">✓</span> {inline ? 'SYNCED' : 'MOBILE SYNC ACTIVE'}
        </div>
      )}

      {error && (
        <p className="text-rose-500 text-xs mt-2 font-mono bg-rose-500/10 p-2 rounded">
          ERROR: {error}
        </p>
      )}
    </>
  )
}
