import React, { useMemo, useRef, useState, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TreeMorphState, OrnamentData } from '../types';
import { getRandomSpherePosition, getConePosition, easeInOutCubic } from '../utils/math';

interface OrnamentsProps {
  count: number;
  type: 'gift' | 'bauble';
  state: TreeMorphState;
}

const tempObject = new THREE.Object3D();
const vec3Scatter = new THREE.Vector3();
const vec3Tree = new THREE.Vector3();
const vec3Current = new THREE.Vector3();

const Ornaments: React.FC<OrnamentsProps> = ({ count, type, state }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  
  // Generate data once
  const data = useMemo(() => {
    const items: OrnamentData[] = [];
    const colors = type === 'gift' 
      ? ['#ff007f', '#ff69b4', '#e0e0e0'] // Saturated for gifts
      : ['#ffc0cb', '#ffffff', '#silver']; // Metallic for baubles

    for (let i = 0; i < count; i++) {
      const s = getRandomSpherePosition(18); // Slightly wider scatter than leaves
      const t = getConePosition(9, 3.2, 2.2); // Slightly inset from leaves

      items.push({
        id: i,
        position: { tree: t, scatter: s },
        scale: Math.random() * (type === 'gift' ? 0.4 : 0.25) + 0.1,
        rotation: [Math.random() * Math.PI, Math.random() * Math.PI, 0],
        color: colors[Math.floor(Math.random() * colors.length)],
        type: type,
        weight: Math.random() // Unique lag factor
      });
    }
    return items;
  }, [count, type]);

  // Current animation progress (0 to 1)
  const progress = useRef(0);

  // Initial color setting
  useLayoutEffect(() => {
    if (meshRef.current) {
      const color = new THREE.Color();
      data.forEach((d, i) => {
        color.set(d.color);
        meshRef.current!.setColorAt(i, color);
      });
      meshRef.current.instanceColor!.needsUpdate = true;
    }
  }, [data]);

  useFrame((stateRoot, delta) => {
    if (!meshRef.current) return;

    const target = state === TreeMorphState.TREE_SHAPE ? 1 : 0;
    
    // Smoothly interpolate the global progress
    // Gifts move slower than baubles (simulation of weight)
    const speed = type === 'gift' ? 0.8 : 1.2;
    progress.current = THREE.MathUtils.lerp(progress.current, target, delta * speed);

    const t = easeInOutCubic(progress.current);

    data.forEach((d, i) => {
      vec3Scatter.set(...d.position.scatter);
      vec3Tree.set(...d.position.tree);

      // Add floating noise when scattered
      if (progress.current < 0.9) {
        const time = stateRoot.clock.elapsedTime;
        const noiseX = Math.sin(time + d.id) * 0.5 * (1 - t);
        const noiseY = Math.cos(time * 0.5 + d.id) * 0.5 * (1 - t);
        
        // Corrected: Modifying components directly instead of using addValues
        vec3Scatter.x += noiseX;
        vec3Scatter.y += noiseY;
      }

      // Interpolate position
      vec3Current.lerpVectors(vec3Scatter, vec3Tree, t);

      tempObject.position.copy(vec3Current);
      tempObject.rotation.set(
        d.rotation[0] + stateRoot.clock.elapsedTime * 0.1 * (1 - t), // Spin when scattered
        d.rotation[1] + stateRoot.clock.elapsedTime * 0.2 * (1 - t),
        d.rotation[2]
      );
      tempObject.scale.setScalar(d.scale * (0.8 + 0.2 * t)); // Grow slightly when assembled
      tempObject.updateMatrix();
      meshRef.current!.setMatrixAt(i, tempObject.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} castShadow receiveShadow>
      {type === 'gift' ? (
        <boxGeometry args={[1, 1, 1]} />
      ) : (
        <sphereGeometry args={[1, 32, 32]} />
      )}
      <meshStandardMaterial
        color="white" // Base color overridden by instance color
        roughness={type === 'bauble' ? 0.1 : 0.3}
        metalness={type === 'bauble' ? 0.9 : 0.4}
        emissive={type === 'bauble' ? '#ffc0cb' : '#000000'}
        emissiveIntensity={type === 'bauble' ? 0.2 : 0}
      />
    </instancedMesh>
  );
};

export default Ornaments;