import React, { useState, Suspense, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { XR, createXRStore, useXR } from '@react-three/xr';
import { Environment, ContactShadows, OrbitControls, Grid } from '@react-three/drei';
import { ModelViewer } from './components/ModelViewer';
import { Controls } from './components/Controls';
import { SceneSettings, DebugLogFn } from './types';
import { Box, AlertTriangle, Scan } from 'lucide-react';

// Initialize XR store
// We will configure the session request parameters dynamically when entering AR
const store = createXRStore();

const App: React.FC = () => {
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [isAR, setIsAR] = useState<boolean>(false);
  const [arSupported, setArSupported] = useState<boolean>(false);
  const [debugLog, setDebugLog] = useState<string[]>([]);
  
  const [settings, setSettings] = useState<SceneSettings>({
    ambientIntensity: 0.8,
    directionalIntensity: 1.5,
    scale: 0.5, // Reduced default scale from 1.0 to 0.5
    rotationSpeed: 0.5,
    autoRotate: true
  });

  // Helper to add logs
  const addLog: DebugLogFn = (msg) => {
    setDebugLog(prev => [msg, ...prev].slice(0, 5)); // Keep last 5 logs
  };

  // 1. Check for WebXR AR support on mount
  useEffect(() => {
    const nav = navigator as any;
    if ('xr' in nav && nav.xr) {
      nav.xr.isSessionSupported('immersive-ar')
        .then((supported: boolean) => setArSupported(supported))
        .catch((err: any) => {
          console.warn("WebXR check failed", err);
          setArSupported(false);
        });
    } else {
      setArSupported(false);
    }
  }, []);

  // 2. Sync React state with WebXR Store
  // This ensures that if the user exits AR via the hardware 'Back' button, 
  // our UI updates correctly.
  useEffect(() => {
    const unsub = store.subscribe((state) => {
      setIsAR(!!state.session);
    });
    return () => unsub();
  }, []);

  const handleEnterAR = async () => {
    if (!arSupported) {
      alert("AR not supported on this device.");
      return;
    }

    try {
      addLog("Initializing AR...");
      
      // Get the UI container to overlay
      const overlayRoot = document.getElementById('ar-ui-root');

      // Configure settings for AR
      // We keep the scale consistent or reset it to a known good AR value
      setSettings(prev => ({ ...prev, autoRotate: false, scale: 0.5 }));
      
      // Force pass session configuration to enable Hit Test and DOM Overlay.
      // This is critical for mobile AR.
      const sessionInit = {
        requiredFeatures: ['hit-test', 'dom-overlay'],
        domOverlay: { root: overlayRoot || document.body }
      };

      // @ts-ignore - Ignoring TS warning to pass native WebXR config object
      await store.enterAR('immersive-ar', sessionInit);
      
    } catch (e: any) {
      console.error("Failed to start AR session:", e);
      addLog(`Start Error: ${e.message}`);
      alert("Could not start AR session. See logs.");
    }
  };

  const handleFileUpload = (file: File) => {
    if (modelUrl) {
      URL.revokeObjectURL(modelUrl);
    }
    const url = URL.createObjectURL(file);
    setModelUrl(url);
  };

  return (
    // Updated Background: Radial Gradient from Slate to Black
    <div className="relative w-full h-[100dvh] overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800 via-gray-900 to-black">
      
      {/* Main 3D View */}
      <div className="absolute top-0 left-0 w-full h-full z-10">
         <Canvas shadows camera={{ position: [0, 1.5, 3], fov: 50 }}>
            <XR store={store}>
              <SceneContent 
                modelUrl={modelUrl} 
                settings={settings} 
                onLog={addLog}
              />
            </XR>
         </Canvas>
      </div>

      {/* AR UI Container - Everything inside here stays visible in AR */}
      <div id="ar-ui-root" className="absolute top-0 left-0 w-full h-full z-20 pointer-events-none flex flex-col justify-between">
        
        {/* Header Area */}
        <div className="w-full pt-6 flex flex-col items-center gap-2 pointer-events-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-black/40 backdrop-blur-md rounded-full border border-white/10 text-white shadow-lg">
             <Box size={16} className="text-blue-400"/>
             <span className="font-medium text-sm">XR Viewer by DepthAI</span>
          </div>
          
          {/* Debug Console */}
          {isAR && (
             <div className="max-w-xs w-full mx-4 bg-black/60 backdrop-blur-md rounded-lg p-2 text-[10px] text-green-400 font-mono text-left space-y-1 border border-white/5 pointer-events-none">
                <div className="text-gray-400 border-b border-white/10 pb-1 mb-1 font-bold">SYSTEM LOGS</div>
                {debugLog.length === 0 ? <div>Waiting for session...</div> : debugLog.map((log, i) => (
                  <div key={i} className="truncate">{`> ${log}`}</div>
                ))}
             </div>
          )}

          {!arSupported && (
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-500/20 backdrop-blur-md rounded-lg border border-yellow-500/30 text-yellow-200 text-xs">
              <AlertTriangle size={12} />
              <span>Device incompatible with AR</span>
            </div>
          )}
        </div>

        {/* Center Crosshair (AR Only) */}
        {isAR && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-50">
             <Scan size={48} className="text-white" />
             <div className="w-1.5 h-1.5 bg-red-500 rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 shadow-[0_0_10px_rgba(255,0,0,0.8)]"></div>
          </div>
        )}

        {/* Bottom Controls */}
        <div className="pointer-events-auto w-full">
          <Controls 
            settings={settings}
            onSettingsChange={setSettings}
            onFileUpload={handleFileUpload}
            onEnterAR={handleEnterAR}
            isAR={isAR}
            arSupported={arSupported}
          />
        </div>
      </div>
    </div>
  );
};

const SceneContent = ({ 
  modelUrl, 
  settings,
  onLog
}: { 
  modelUrl: string | null, 
  settings: SceneSettings,
  onLog: DebugLogFn
}) => {
  // We use this to detect if we are effectively in AR mode
  const isPresenting = useXR((state) => state.mode === 'immersive-ar');

  return (
    <>
      <ambientLight intensity={settings.ambientIntensity} />
      <directionalLight 
        position={[5, 10, 5]} 
        intensity={settings.directionalIntensity} 
        castShadow
      />
      
      {/* Environment & Controls only active when NOT in AR 
          This is crucial to prevent the 'City' environment from blocking the camera feed
          and to stop orbit controls from fighting the AR device movement.
      */}
      {!isPresenting && (
        <>
          <Environment preset="city" />
          <Grid 
            infiniteGrid 
            fadeDistance={30} 
            sectionColor="#555555" 
            cellColor="#333333" 
            position={[0, -0.01, 0]} 
          />
          <ContactShadows position={[0, -0.01, 0]} opacity={0.5} scale={10} blur={1.5} far={1} />
          <OrbitControls makeDefault 
          target={[0, 0.5, 0]}/>
        </>
      )}

      <Suspense fallback={null}>
        <ModelViewer 
          url={modelUrl} 
          settings={settings} 
          onLog={onLog}
        />
      </Suspense>
    </>
  );
}

export default App;