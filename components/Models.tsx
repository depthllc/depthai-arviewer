import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import { SceneSettings } from '../types';

const DUCK_URL = `${import.meta.env.BASE_URL}assets/Duck.glb`;

// Component to handle loading external GLB/GLTF files
export const LoadedModel = ({ url, settings }: { url: string; settings: SceneSettings }) => {
  // If someone passes a relative path, make it work under the GitHub Pages base.
  const resolvedUrl =
    url.startsWith('http') || url.startsWith('blob:') || url.startsWith('data:')
      ? url
      : `${import.meta.env.BASE_URL}${url.replace(/^\/+/, '')}`;

  const { scene } = useGLTF(resolvedUrl);
  const ref = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    if (settings.autoRotate && ref.current) {
      ref.current.rotation.y += delta * settings.rotationSpeed;
    }
  });

  const sceneClone = useMemo(() => scene.clone(), [scene]);

  return <primitive ref={ref} object={sceneClone} scale={settings.scale} />;
};

// Default Model when no file is uploaded
export const PlaceholderModel = ({ settings }: { settings: SceneSettings }) => {
  const { scene, animations } = useGLTF(DUCK_URL);
  const groupRef = useRef<THREE.Group>(null);

  const { actions } = useAnimations(animations, groupRef);

  useEffect(() => {
    const actionName = actions['Survey'] ? 'Survey' : Object.keys(actions)[0];
    if (actionName && actions[actionName]) {
      actions[actionName]?.reset().fadeIn(0.5).play();
    }
  }, [actions]);

  useFrame((state, delta) => {
    if (groupRef.current && settings.autoRotate) {
      groupRef.current.rotation.y += delta * settings.rotationSpeed;
    }
  });

  const sceneClone = useMemo(() => scene.clone(), [scene]);

  return (
    <group ref={groupRef} scale={settings.scale}>
      <primitive object={sceneClone} />
    </group>
  );
};

useGLTF.preload(DUCK_URL);
