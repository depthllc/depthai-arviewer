import React, { useState, useEffect, useRef } from 'react';
import { useFrame, useThree, ThreeEvent } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { DebugLogFn } from '../types';

// Reusable 3D Button Component for AR HUD
const HudButton = ({
  position,
  text,
  color,
  onClick,
  setUiBlocked
}: {
  position: [number, number, number];
  text: string;
  color: string;
  onClick: () => void;
  setUiBlocked: (blocked: boolean) => void;
}) => {
  const [clicked, setClicked] = useState(false);

  useEffect(() => {
    if (clicked) {
      const timer = setTimeout(() => setClicked(false), 200);
      return () => clearTimeout(timer);
    }
  }, [clicked]);

  const handleInteraction = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setUiBlocked(true);
    onClick();
    setClicked(true);
  };

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setUiBlocked(true);
  };

  const width = 0.14;
  const height = 0.05;

  return (
    <group position={position} scale={clicked ? 1.1 : 1}>
       {/* Background */}
        <mesh renderOrder={999} onClick={handleInteraction} onPointerDown={handlePointerDown}>
            <planeGeometry args={[width, height]} />
            <meshBasicMaterial 
              color={clicked ? "white" : color} 
              transparent 
              opacity={0.8} 
              depthTest={false} 
              side={THREE.DoubleSide}
            />
        </mesh>

        {/* Border */}
        <lineSegments renderOrder={1000}>
            <edgesGeometry args={[new THREE.PlaneGeometry(width, height)]} />
            <lineBasicMaterial 
              color="white" 
              transparent 
              opacity={0.5} 
              depthTest={false} 
            />
        </lineSegments>

        <Text 
          position={[0, 0, 0.001]} 
          fontSize={0.014} 
          color={clicked ? "black" : "white"}
          anchorX="center" 
          anchorY="middle"
          renderOrder={1001}
          material-depthTest={false}
          // @ts-ignore
          raycast={() => null} 
        >
          {text}
        </Text>
    </group>
  );
};

export const FloatingHUD = ({ 
  onLog, 
  setUiBlocked,
  onClear,
  isPlacementMode,
  togglePlacementMode
}: { 
  onLog: DebugLogFn;
  setUiBlocked: (blocked: boolean) => void;
  onClear: () => void;
  isPlacementMode: boolean;
  togglePlacementMode: () => void;
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

  // Use standard priority (default) to avoid potential conflicts/crashes in XR loop
  useFrame(() => {
    if (groupRef.current && camera) {
      // Direct calculation of position in front of camera
      // This is safer than iterative transformations which can drift or fail if a frame is skipped
      
      const distance = 0.5; // 50cm in front
      const heightOffset = 0.25; // 25cm up

      // Get forward vector
      const forward = new THREE.Vector3(0, 0, -1);
      forward.applyQuaternion(camera.quaternion);
      
      // Get up vector (relative to camera rotation to keep HUD 'up' in view)
      const up = new THREE.Vector3(0, 1, 0);
      up.applyQuaternion(camera.quaternion);

      // Calculate position: CameraPos + (Forward * dist) + (Up * height)
      const targetPos = camera.position.clone()
        .add(forward.multiplyScalar(distance))
        .add(up.multiplyScalar(heightOffset));

      groupRef.current.position.copy(targetPos);
      groupRef.current.quaternion.copy(camera.quaternion);
    }
  });

  return (
    <group ref={groupRef} renderOrder={999}>
      <HudButton 
        position={[-0.08, 0, 0]}
        text="CLEAR SCENE"
        color="#ef4444"
        onClick={() => {
            onClear();
            onLog("Scene Cleared");
        }}
        setUiBlocked={setUiBlocked}
      />

      <HudButton 
        position={[0.08, 0, 0]}
        text={isPlacementMode ? "PLACE: ON" : "PLACE: OFF"}
        color={isPlacementMode ? "#22c55e" : "#6b7280"}
        onClick={() => {
            togglePlacementMode();
            onLog(isPlacementMode ? "Placement Disabled" : "Placement Enabled");
        }}
        setUiBlocked={setUiBlocked}
      />
    </group>
  );
};