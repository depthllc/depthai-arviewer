import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { useXR } from '@react-three/xr';
import * as THREE from 'three';
import { SceneSettings, DebugLogFn } from '../types';
import { LoadedModel, PlaceholderModel } from './Models';
import { FloatingHUD } from './ArHud';

interface ModelViewerProps {
  url: string | null;
  settings: SceneSettings;
  onLog: DebugLogFn;
}

export const ModelViewer: React.FC<ModelViewerProps> = ({ url, settings, onLog }) => {
  const { gl } = useThree();
  const mode = useXR((state) => state.mode);
  const session = useXR((state) => state.session);
  const isPresenting = mode === 'immersive-ar';

  // Using a simpler ID generator
  const [models, setModels] = useState<{ position: THREE.Vector3, id: string, rotation: THREE.Euler }[]>([]);
  const [isPlacementMode, setIsPlacementMode] = useState(true);

  const reticleRef = useRef<THREE.Group>(null);
  const previewRef = useRef<THREE.Group>(null);
  
  const hitTestSource = useRef<any>(null); 
  const [isSurfaceDetected, setIsSurfaceDetected] = useState(false);
  const [hasLoggedHit, setHasLoggedHit] = useState(false);
  
  const isUiBlocked = useRef(false);

  const setUiBlocked = useCallback((blocked: boolean) => {
    isUiBlocked.current = blocked;
    if (blocked) {
      setTimeout(() => {
        isUiBlocked.current = false;
      }, 500);
    }
  }, []);

  useEffect(() => {
    if (isPresenting) {
        setHasLoggedHit(false);
        setIsSurfaceDetected(false);
    }
  }, [isPresenting]);

  useEffect(() => {
    if (!session || !isPresenting) {
      hitTestSource.current = null;
      return;
    }

    let source: any = null;

    const initHitTest = async () => {
      try {
        const space = await session.requestReferenceSpace('viewer');
        source = await session.requestHitTestSource({ space });
        hitTestSource.current = source;
      } catch (e: any) {
        console.error(e);
        onLog(`Hit Test Error: ${e.message}`);
      }
    };

    initHitTest();

    return () => {
      if (source) {
        try { source.cancel(); } catch (e) {}
      }
      hitTestSource.current = null;
    };
  }, [session, isPresenting, onLog]);

  useFrame((state, delta, frame: any) => {
    if (!isPresenting || !frame) return;

    // Default: hide reticle
    if (reticleRef.current) reticleRef.current.visible = false;

    // If not in placement mode, just update floating preview if needed (or hide it)
    if (!isPlacementMode) {
      return;
    }

    const cam = state.camera;
    const referenceSpace = gl.xr.getReferenceSpace();
    
    let hitPose = null;
    let hitMatrix = null;

    // 1. Perform Hit Test
    if (hitTestSource.current && referenceSpace) {
       const results = frame.getHitTestResults(hitTestSource.current);
       if (results.length > 0) {
         const hit = results[0];
         const pose = hit.getPose(referenceSpace);
         if (pose) {
           hitPose = pose;
           hitMatrix = new THREE.Matrix4().fromArray(pose.transform.matrix);
         }
       }
    }

    if (hitPose && hitMatrix) {
      // -- SURFACE DETECTED --
      if (!isSurfaceDetected) setIsSurfaceDetected(true);
      if (!hasLoggedHit) {
         onLog("Surface detected!");
         setHasLoggedHit(true);
      }

      if (reticleRef.current) {
        reticleRef.current.visible = true;
        reticleRef.current.matrix.copy(hitMatrix);
      }

      if (previewRef.current) {
         const p = new THREE.Vector3();
         const q = new THREE.Quaternion();
         const s = new THREE.Vector3();
         hitMatrix.decompose(p, q, s);
         
         previewRef.current.position.copy(p);
         previewRef.current.quaternion.copy(q);
      }

    } else {
      // -- NO SURFACE --
      if (isSurfaceDetected) setIsSurfaceDetected(false);
      
      if (previewRef.current) {
         const targetPos = new THREE.Vector3(0, 0, -1.5).applyMatrix4(cam.matrixWorld);
         previewRef.current.position.lerp(targetPos, delta * 5);
         previewRef.current.lookAt(cam.position);
      }
    }
  });

  const placeModel = useCallback(() => {
    if (!isPresenting) return;
    if (!isPlacementMode) return;
    if (isUiBlocked.current) return;

    // Robust placement logic
    if (isSurfaceDetected && previewRef.current) {
        try {
            const position = previewRef.current.position.clone();
            const rotation = previewRef.current.rotation.clone();
            const id = `model-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

            setModels(prev => [...prev, { position, rotation, id }]);
            onLog("Model placed");
        } catch (e) {
            console.error("Placement error", e);
        }
    } else if (!isSurfaceDetected) {
        onLog("Find a surface first");
    }
  }, [isPresenting, isSurfaceDetected, isPlacementMode, onLog, setUiBlocked]);

  const clearScene = useCallback(() => {
    setModels([]);
    onLog("Scene cleared");
  }, [onLog]);

  useEffect(() => {
    if (session) {
      const handleSelect = () => placeModel();
      session.addEventListener('select', handleSelect);
      return () => session.removeEventListener('select', handleSelect);
    }
  }, [session, placeModel]);

  if (!isPresenting) {
    return (
      <group position={[0, 0, 0]}>
        {url ? <LoadedModel url={url} settings={settings} /> : <PlaceholderModel settings={settings} />}
      </group>
    );
  }

  return (
    <>
      <FloatingHUD 
        onLog={onLog} 
        setUiBlocked={setUiBlocked}
        onClear={clearScene}
        isPlacementMode={isPlacementMode}
        togglePlacementMode={() => setIsPlacementMode(prev => !prev)}
      />

      <group ref={reticleRef} visible={false} matrixAutoUpdate={false}>
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.01, 0]}>
          <ringGeometry args={[0.15, 0.17, 32]} />
          <meshBasicMaterial color="white" opacity={0.5} transparent />
        </mesh>
      </group>

      {isPlacementMode && (
        <group ref={previewRef}>
          {url ? <LoadedModel url={url} settings={settings} /> : <PlaceholderModel settings={settings} />}
          {isSurfaceDetected && (
              <Text 
                position={[0, settings.scale * 0.8 + 0.3, 0]} 
                fontSize={0.15} 
                color="white" 
                anchorX="center" 
                anchorY="bottom"
              >
                Tap to Place
              </Text>
          )}
        </group>
      )}

      {models.map((model) => (
        <group key={model.id} position={model.position} rotation={model.rotation}>
           {url ? <LoadedModel url={url} settings={settings} /> : <PlaceholderModel settings={settings} />}
        </group>
      ))}
    </>
  );
};