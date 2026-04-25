import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Html5Qrcode } from 'html5-qrcode'
import { ChevronRight } from 'lucide-react'
import { supabase } from '@/supabaseClient'
import { Patient } from '@/types'

interface PatientScannerModalProps {
  onClose: () => void
  onSelect: (id: string) => void
  doctorId: string
  allPatients: Patient[]
}

export function PatientScannerModal({ onClose, onSelect, doctorId, allPatients }: PatientScannerModalProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [step, setStep] = useState<'scan' | 'confirm' | 'success'>('scan')
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [loading, setLoading] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)

  useEffect(() => {
    let html5QrCode: Html5Qrcode | null = null;
    let isActuallyScanning = false;

    if (step === 'scan') {
      html5QrCode = new Html5Qrcode("reader");
      scannerRef.current = html5QrCode

      const config = { fps: 10, qrbox: { width: 250, height: 250 } };

      html5QrCode.start(
        { facingMode: "user" },
        config,
        (decodedText) => {
          const match = decodedText.match(/P-\d+/);
          const detectedId = match ? match[0] : decodedText;
          
          const patient = allPatients.find(p => p.id === detectedId);
          if (patient && isActuallyScanning) {
            isActuallyScanning = false;
            setTimeout(() => {
              if (html5QrCode) {
                html5QrCode.stop().then(() => {
                  scannerRef.current = null;
                  setSelectedPatient(patient);
                  setStep('confirm');
                }).catch(() => {
                   scannerRef.current = null;
                   setSelectedPatient(patient);
                   setStep('confirm');
                });
              }
            }, 100);
          }
        },
        () => {}
      ).then(() => {
        isActuallyScanning = true;
      }).catch(err => {
        console.error("Scanning start error:", err);
        setScanError("Unable to access camera. Please ensure permissions are granted.");
      });
    }

    return () => {
      if (html5QrCode && isActuallyScanning) {
        isActuallyScanning = false;
        setTimeout(() => {
          try {
            html5QrCode?.stop().catch(err => console.debug("Cleanup stop suppressed:", err));
          } catch (e) {}
        }, 100);
      }
    }
  }, [step, allPatients])

  const handleConnect = async () => {
    if (!selectedPatient || !doctorId) return
    setLoading(true)
    try {
      const { error } = await supabase
        .from('patients')
        .update({ doctor_id: doctorId })
        .eq('id', selectedPatient.id)
      
      if (error) throw error
      
      setStep('success')
      setTimeout(() => {
        onSelect(selectedPatient.id)
      }, 2000)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const stopScannerAndProceed = (patient: Patient) => {
    if (scannerRef.current) {
        const scanner = scannerRef.current;
        scannerRef.current = null;
        setTimeout(() => {
          try {
            scanner.stop().finally(() => {
              setSelectedPatient(patient); 
              setStep('confirm');
            });
          } catch (e) {
            setSelectedPatient(patient); 
            setStep('confirm');
          }
        }, 100);
      } else {
        setSelectedPatient(patient); 
        setStep('confirm');
      }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[500] flex items-center justify-center bg-black/85 backdrop-blur-xl"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9 }}
        className="glass-shimmer w-full max-w-[420px] p-8 bg-[var(--glass-bg)] rounded-[24px] border border-[var(--color-brand-accent)] text-center shadow-[0_0_50px_rgba(52,211,153,0.15)]"
      >
        <AnimatePresence mode="wait">
          {step === 'scan' && (
            <motion.div key="scan" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
               <div className="mb-5">
                <h2 className="text-[18px] font-bold text-[var(--text-primary)] tracking-wider">
                  SCAN PATIENT IDENTITY
                </h2>
                <div className="text-[9px] text-[var(--color-brand-accent)] font-mono mt-1 tracking-[2px]">
                  AWAITING ENCRYPTED HANDSHAKE...
                </div>
              </div>

              <div className="w-full aspect-square mx-auto mb-6 border border-[var(--color-brand-accent)] rounded-2xl relative overflow-hidden bg-black shadow-[inset_0_0_20px_rgba(52,211,153,0.2)]">
                <div id="reader" className="w-full h-full"></div>
                
                {/* Visual Scanner Overlay */}
                <div className="absolute inset-0 pointer-events-none border-[20px] border-black/40">
                   <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-[var(--color-brand-accent)]"></div>
                   <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-[var(--color-brand-accent)]"></div>
                   <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-[var(--color-brand-accent)]"></div>
                   <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-[var(--color-brand-accent)]"></div>
                </div>

                <motion.div 
                  className="absolute left-0 right-0 h-[2px] bg-[var(--color-brand-accent)] shadow-[0_0_15px_var(--color-brand-accent)] z-10"
                  animate={{ top: ['0%', '100%', '0%'] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                />

                {scanError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-5 text-[var(--color-critical)] text-[12px] z-20">
                     {scanError}
                  </div>
                )}
              </div>

              <div className="text-left">
                <label className="text-[10px] text-zinc-500 font-mono tracking-widest block mb-3 uppercase">
                  OR SELECT FROM DETECTED ROSTER
                </label>
                <div className="flex flex-col gap-2 max-h-[120px] overflow-y-auto pr-1 scrollbar-hide">
                  {allPatients.map(p => (
                    <button 
                      key={p.id}
                      onClick={() => stopScannerAndProceed(p)}
                      className="p-[10px_14px] rounded-xl bg-white/[0.03] border border-[var(--color-border-subtle)] text-[var(--text-primary)] flex justify-between items-center cursor-pointer transition-all hover:border-[var(--color-brand-accent)]"
                    >
                      <div>
                        <div className="text-[13px] font-semibold">{p.name}</div>
                        <div className="text-[9px] text-zinc-500 font-mono">{p.id} {p.unit_id ? `(${p.unit_id})` : ''}</div>
                      </div>
                      <ChevronRight size={14} className="text-zinc-500" />
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {step === 'confirm' && selectedPatient && (
            <motion.div key="confirm" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }}>
              <div className="mb-6">
                <div className="w-[72px] h-[72px] rounded-[20px] bg-[var(--color-brand-accent)] mx-auto mb-4 flex items-center justify-center text-[28px] font-bold text-black shadow-[0_0_30px_rgba(52,211,153,0.3)]">
                  {selectedPatient.name.charAt(0)}
                </div>
                <h2 className="text-[22px] font-bold text-[var(--text-primary)]">{selectedPatient.name}</h2>
                <div className="text-[11px] text-[var(--color-brand-accent)] font-mono mt-1 tracking-[2px]">
                  IDENTITY VERIFIED • {selectedPatient.id}
                </div>
              </div>

              <p className="text-[14px] text-zinc-400 leading-relaxed mb-7">
                You are establishing a secure medical link with this patient. This will grant you full telemetry access and operational command.
              </p>

              <div className="flex gap-3">
                <button 
                  onClick={() => setStep('scan')}
                  className="flex-1 p-3.5 rounded-xl border border-[var(--color-border-subtle)] bg-transparent text-[var(--text-primary)] cursor-pointer font-semibold text-[13px]"
                >
                  BACK
                </button>
                <button 
                  onClick={handleConnect}
                  disabled={loading}
                  className="flex-1 p-3.5 rounded-xl border-none bg-[var(--color-brand-accent)] text-black font-bold text-[13px] cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed shadow-[0_4px_20px_rgba(52,211,153,0.3)]"
                >
                  {loading ? 'CONNECTING...' : 'CONFIRM LINK'}
                </button>
              </div>
            </motion.div>
          )}

          {step === 'success' && selectedPatient && (
            <motion.div key="success" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', damping: 12 }}>
              <div className="w-[100px] h-[100px] rounded-full bg-[var(--color-stable-bg)] border-2 border-[var(--color-stable)] mx-auto mb-6 flex items-center justify-center shadow-[0_0_40px_rgba(52,211,153,0.2)]">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2 }}>
                    <div className="text-[var(--color-stable)] text-4xl">✓</div>
                </motion.div>
              </div>
              <h2 className="text-[22px] font-bold text-[var(--color-stable)]">Patient Scanned</h2>
              <p className="text-[12px] text-zinc-500 mt-2 font-mono tracking-widest">
                HANDSHAKE SUCCESSFUL // {selectedPatient.id}
              </p>
              <div className="mt-6 text-[11px] text-[var(--text-accent)] font-semibold">
                PREPARING OPERATING THEATER...
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}
