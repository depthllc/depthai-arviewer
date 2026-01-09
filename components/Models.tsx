import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import { SceneSettings } from '../types';

// Component to handle loading external GLB/GLTF files
export const LoadedModel = ({ url, settings }: { url: string; settings: SceneSettings }) => {
  const { scene } = useGLTF(url);
  const ref = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    if (settings.autoRotate && ref.current) {
      // Uses delta to ensure rotation speed is consistent (e.g. 60fps vs 120fps)
      ref.current.rotation.y += delta * settings.rotationSpeed;
    }
  });

  const sceneClone = useMemo(() => scene.clone(), [scene]);

  return <primitive ref={ref} object={sceneClone} scale={settings.scale} />;
};

// Default Fox Model when no file is uploaded
export const PlaceholderModel = ({ settings }: { settings: SceneSettings }) => {
  // Load the Fox model
  const { scene, animations } = useGLTF('assets/Duck.glb');
  const groupRef = useRef<THREE.Group>(null);
  
  // Initialize animations
  const { actions } = useAnimations(animations, groupRef);

  useEffect(() => {
    const actionName = actions['Survey'] ? 'Survey' : Object.keys(actions)[0];
    if (actionName && actions[actionName]) {
      const action = actions[actionName];
      action?.reset().fadeIn(0.5).play();
    }
  }, [actions]);

  useFrame((state, delta) => {
    if (groupRef.current && settings.autoRotate) {
      groupRef.current.rotation.y += delta * settings.rotationSpeed;
    }
  });

  // Clone scene for multiple instances to ensure independence
  const sceneClone = useMemo(() => scene.clone(), [scene]);

  return (
    <group ref={groupRef} scale={settings.scale}>
      {/* 
         The primitive object is the root of the GLTF scene.
         We wrap it in a group to apply animations and transforms cleanly.
      */}
      <primitive object={sceneClone} />
    </group>
  );
};

// Preload the default model
useGLTF.preload('assets/Duck.glb');