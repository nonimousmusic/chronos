import React, { useRef, useMemo, Suspense, useState, Dispatch, SetStateAction } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF, Sphere, Float } from '@react-three/drei';
import * as THREE from 'three';

// 1. The Holographic Material
const hologramMaterial = new THREE.MeshStandardMaterial({
  color: '#00ffa3', // Neon mint green
  wireframe: true,
  transparent: true,
  opacity: 0.15,
});

interface HologramBodyProps {
  modelPos: [number, number, number];
  modelRot: [number, number, number];
  modelScale: number;
}

// 2. The Model Loader Component
const HologramBody = ({ modelPos, modelRot, modelScale }: HologramBodyProps) => {
  const { scene } = useGLTF('/patient.glb');

  useMemo(() => {
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        (child as THREE.Mesh).material = hologramMaterial;
      }
    });
  }, [scene]);

  return <primitive object={scene} scale={modelScale} position={modelPos} rotation={modelRot} />;
};

interface RiskNodeProps {
  highlightOrgan?: string;
  riskLevel?: number;
  calibPos?: [number, number, number] | null;
}

// 3. The Dynamic Risk Node (The glowing red organ)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const RiskNode = ({ highlightOrgan, riskLevel, calibPos }: RiskNodeProps) => {
  const nodeRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (nodeRef.current) {
      const scale = 1 + Math.sin(clock.getElapsedTime() * 4) * 0.2;
      nodeRef.current.scale.set(scale, scale, scale);
    }
  });

  const getCoordinates = (organ: string): [number, number, number] => {
    switch (organ) {
      case 'heart':
      case 'Septic Shock':
      case 'Post-CABG Recovery':
        return [-1.35, 1.05, -1.15];
      case 'lungs':
      case 'Pneumonia / ARDS':
        return [0, 0.5, 0.4];
      case 'kidneys':
      case 'Acute Kidney Injury':
        return [0, 0.1, -0.4];
      case 'stomach':
      case 'GI Bleed':
        return [0, 0.2, 0.8];
      case 'Trauma - MVC':
        return [0, 1.2, 0];
      default:
        return [0, 999, 0];
    }
  };

  const position = calibPos || (highlightOrgan ? getCoordinates(highlightOrgan) : [0, 0, 0]);
  const baseColor = riskLevel && riskLevel > 0.7 ? '#e11d48' : (riskLevel && riskLevel > 0.4 ? '#fbbf24' : '#64d2ff');

  if (!highlightOrgan) return null;

  return (
    <Sphere ref={nodeRef} args={[0.08, 16, 16]} position={position}>
      <meshBasicMaterial color={baseColor} wireframe={true} />
    </Sphere>
  );
};


interface CalibRowProps {
  label: string;
  value: number;
  setter: Dispatch<SetStateAction<number>>;
  step?: number;
  labelWidth?: string;
}

const CalibRow = ({ label, value, setter, step = 0.05, labelWidth = "w-4" }: CalibRowProps) => {
  const handleWheel = (e: React.WheelEvent<HTMLInputElement>) => {
    (e.target as HTMLInputElement).blur();
    const delta = e.deltaY < 0 ? step : -step;
    setter(prev => Number((prev + delta).toFixed(3)));
  };

  return (
    <div className="flex justify-between items-center mb-1">
      <span className={`text-slate-300 ${labelWidth}`}>{label}:</span>
      <button onClick={() => setter(prev => Number((prev - step).toFixed(3)))} className="bg-slate-700 w-6 h-6 rounded hover:bg-slate-600 flex items-center justify-center">-</button>
      <input 
        type="number" 
        step={step} 
        value={value} 
        onChange={(e) => setter(Number(e.target.value))} 
        onWheel={handleWheel}
        className="bg-slate-900 text-white w-20 text-center border-none focus:ring-1 focus:ring-emerald-500 rounded text-xs py-1 cursor-ns-resize" 
      />
      <button onClick={() => setter(prev => Number((prev + step).toFixed(3)))} className="bg-slate-700 w-6 h-6 rounded hover:bg-slate-600 flex items-center justify-center">+</button>
    </div>
  );
};

interface HumanModel3DProps {
  highlightOrgan?: string;
  riskLevel?: number;
}

export default function HumanModel3D({ highlightOrgan, riskLevel }: HumanModel3DProps) {
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [activeTab, setActiveTab] = useState<'node' | 'pos' | 'rot' | 'scale'>('node');
  const [isRotating, setIsRotating] = useState(true);

  // Risk Node Calibration
  const [calibX, setCalibX] = useState(-1.35);
  const [calibY, setCalibY] = useState(1.05);
  const [calibZ, setCalibZ] = useState(-1.15);
  const [lockedNodePos, setLockedNodePos] = useState<[number, number, number] | null>(null);

  // Model Position Calibration
  const [modelX, setModelX] = useState(-0.2);
  const [modelY, setModelY] = useState(0);
  const [modelZ, setModelZ] = useState(0);

  // Model Rotation Calibration
  const [rotX, setRotX] = useState(-3.14);
  const [rotY, setRotY] = useState(0);
  const [rotZ, setRotZ] = useState(3.14);

  // Model Scale Calibration
  const [scaleVal, setScaleVal] = useState(0.06);

  const activeRisk = highlightOrgan || 'Septic Shock';

  const currentModelPos: [number, number, number] = [modelX, modelY, modelZ];
  const currentModelRot: [number, number, number] = [rotX, rotY, rotZ];

  return (
    <div className="w-full h-full relative rounded-xl overflow-hidden" style={{ background: 'linear-gradient(to bottom, transparent, var(--glass-bg))' }}>

      <Canvas camera={{ position: [0, 2, 6], fov: 45 }} gl={{ antialias: true, alpha: true }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} color="#00ffa3" />

        <Float speed={1.5} rotationIntensity={0.05} floatIntensity={0.1}>
          <Suspense fallback={<LoadingFallback />}>
            <HologramBody
              modelPos={currentModelPos}
              modelRot={currentModelRot}
              modelScale={scaleVal}
            />
            <RiskNode 
              highlightOrgan={activeRisk} 
              riskLevel={riskLevel} 
              calibPos={isCalibrating && activeTab === 'node' ? [calibX, calibY, calibZ] : lockedNodePos} 
            />
          </Suspense>
        </Float>

        <OrbitControls
          enableZoom={true}
          enablePan={true}
          autoRotate={isRotating}
          autoRotateSpeed={0.5}
          maxPolarAngle={Math.PI / 2.2}
          minPolarAngle={0}
        />
      </Canvas>

      <div className="absolute top-4 left-4 text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded backdrop-blur-sm z-20" style={{ background: 'var(--glass-bg)', border: '1px solid var(--color-border-subtle)', color: 'var(--color-text-secondary)' }}>
        Active Scan // Full Body Telemetry
      </div>

      <div className="absolute bottom-4 right-4 z-30 flex gap-2">
        <button
          onClick={() => setIsRotating(!isRotating)}
          className="px-3 py-1 rounded-full text-[10px] uppercase tracking-widest transition-colors backdrop-blur-md"
          style={{ background: 'var(--glass-bg)', border: '1px solid var(--color-border-subtle)', color: 'var(--color-text-secondary)' } as any}
        >
          {isRotating ? 'Stop Rotation' : 'Spin Model'}
        </button>
        <button
          onClick={() => setIsCalibrating(!isCalibrating)}
          className="px-3 py-1 rounded-full text-[10px] uppercase tracking-widest transition-colors backdrop-blur-md"
          style={{ background: 'var(--glass-bg)', border: '1px solid var(--color-border-subtle)', color: 'var(--color-text-secondary)' } as any}
        >
          {isCalibrating ? 'Cancel Calibration' : 'Calibrate 3D'}
        </button>
      </div>

      {isCalibrating && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          onPointerMove={(e) => e.stopPropagation()}
          onWheel={(e) => e.stopPropagation()}
          className="absolute top-1/2 right-4 -translate-y-1/2 z-30 bg-black/80 p-4 rounded-xl border border-emerald-500/30 backdrop-blur-md flex flex-col gap-3 font-mono text-xs w-64 shadow-2xl"
        >
          <div className="text-emerald-400 font-bold mb-1 border-b border-emerald-400/30 pb-2">3D Calibrator Hub</div>

          <div className="flex gap-1 mb-2">
            <button onClick={() => setActiveTab('node')} className={`flex-1 py-1 rounded ${activeTab === 'node' ? 'bg-emerald-500 text-black' : 'bg-slate-800 text-slate-400'}`}>Node</button>
            <button onClick={() => setActiveTab('pos')} className={`flex-1 py-1 rounded ${activeTab === 'pos' ? 'bg-emerald-500 text-black' : 'bg-slate-800 text-slate-400'}`}>Pos</button>
            <button onClick={() => setActiveTab('rot')} className={`flex-1 py-1 rounded ${activeTab === 'rot' ? 'bg-emerald-500 text-black' : 'bg-slate-800 text-slate-400'}`}>Rot</button>
            <button onClick={() => setActiveTab('scale')} className={`flex-1 py-1 rounded ${activeTab === 'scale' ? 'bg-emerald-500 text-black' : 'bg-slate-800 text-slate-400'}`}>Scale</button>
          </div>

          <div className="text-[10px] text-slate-400 mb-2 italic">Hover & scroll or type:</div>

          {activeTab === 'node' && (
            <>
              <CalibRow label="X" value={calibX} setter={setCalibX} />
              <CalibRow label="Y" value={calibY} setter={setCalibY} />
              <CalibRow label="Z" value={calibZ} setter={setCalibZ} />
            </>
          )}

          {activeTab === 'pos' && (
            <>
              <CalibRow label="X" value={modelX} setter={setModelX} step={0.1} />
              <CalibRow label="Y" value={modelY} setter={setModelY} step={0.1} />
              <CalibRow label="Z" value={modelZ} setter={setModelZ} step={0.1} />
            </>
          )}

          {activeTab === 'rot' && (
            <>
              <CalibRow label="X" value={rotX} setter={setRotX} />
              <CalibRow label="Y" value={rotY} setter={setRotY} />
              <CalibRow label="Z" value={rotZ} setter={setRotZ} />
            </>
          )}

          {activeTab === 'scale' && (
            <CalibRow label="Scale" value={scaleVal} setter={setScaleVal} step={0.005} labelWidth="w-10" />
          )}

          <button onClick={() => {
            console.log(`\n✅ CALIBRATION LOCKED!`);
            console.log(`MODEL POS: [${modelX}, ${modelY}, ${modelZ}]`);
            console.log(`MODEL ROT: [${rotX}, ${rotY}, ${rotZ}]`);
            console.log(`MODEL SCALE: ${scaleVal}`);
            console.log(`NODE POS: [${calibX}, ${calibY}, ${calibZ}]`);

            setLockedNodePos([calibX, calibY, calibZ]);
            setIsCalibrating(false);
          }} className="mt-2 w-full bg-emerald-500/20 text-emerald-300 py-2 rounded font-bold hover:bg-emerald-500/40 transition-colors border border-emerald-500/30">
            Log & Lock View
          </button>
        </div>
      )}

    </div>
  );
}

function LoadingFallback() {
  return (
    <mesh>
      <sphereGeometry args={[0.1, 16, 16]} />
      <meshBasicMaterial color="#00ffa3" wireframe={true} />
    </mesh>
  );
}
