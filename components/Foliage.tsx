import React, { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TreeMorphState } from '../types';
import { getRandomSpherePosition, getConePosition } from '../utils/math';

// Custom Shader for the "Barbie Luxury" Particles
const FoliageMaterial = {
  uniforms: {
    uTime: { value: 0 },
    uProgress: { value: 0 }, // 0 = Scattered, 1 = Tree
    uColorPink: { value: new THREE.Color('#ffc0cb') },
    uColorMagenta: { value: new THREE.Color('#ff007f') },
    uColorSilver: { value: new THREE.Color('#ffffff') },
  },
  vertexShader: `
    uniform float uTime;
    uniform float uProgress;
    attribute vec3 aScatterPos;
    attribute vec3 aTreePos;
    attribute float aRandom;
    
    varying float vAlpha;
    varying vec3 vColor;
    varying float vBlink;

    // Cubic easing for smooth transition
    float ease(float t) {
      return t < 0.5 ? 4.0 * t * t * t : 1.0 - pow(-2.0 * t + 2.0, 3.0) / 2.0;
    }

    void main() {
      float t = ease(uProgress);
      
      // Interpolate position
      vec3 pos = mix(aScatterPos, aTreePos, t);
      
      // Add "breathing" and floating effect
      float noise = sin(uTime * 2.0 + aRandom * 10.0) * 0.1;
      float floatY = sin(uTime * 0.5 + aRandom * 5.0) * (0.2 * (1.0 - t)); // Float more when scattered
      
      pos.x += noise * 0.5;
      pos.y += floatY + noise * 0.5;
      pos.z += noise * 0.5;

      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_Position = projectionMatrix * mvPosition;

      // Size attenuation
      gl_PointSize = (8.0 * aRandom + 4.0) * (10.0 / -mvPosition.z);

      // Color logic
      vBlink = sin(uTime * 3.0 + aRandom * 20.0);
    }
  `,
  fragmentShader: `
    uniform vec3 uColorPink;
    uniform vec3 uColorMagenta;
    uniform vec3 uColorSilver;
    
    varying float vBlink;

    void main() {
      // Circular particle
      vec2 coord = gl_PointCoord - vec2(0.5);
      float dist = length(coord);
      if (dist > 0.5) discard;

      // Soft edge glow
      float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
      
      // Mix colors based on blink for sparkly effect
      vec3 finalColor = mix(uColorPink, uColorMagenta, 0.5 + 0.5 * sin(vBlink));
      
      // Add silver rim/core highlights
      if (dist < 0.1) {
        finalColor = mix(finalColor, uColorSilver, 0.8);
      }

      gl_FragColor = vec4(finalColor, alpha);
    }
  `
};

interface FoliageProps {
  count: number;
  state: TreeMorphState;
}

const Foliage: React.FC<FoliageProps> = ({ count, state }) => {
  const shaderRef = useRef<THREE.ShaderMaterial>(null);
  
  // Memoize geometry attributes
  const { positions, scatterPositions, treePositions, randoms } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const scatter = new Float32Array(count * 3);
    const tree = new Float32Array(count * 3);
    const rands = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const s = getRandomSpherePosition(15);
      const t = getConePosition(10, 3.5, 2);

      scatter[i * 3] = s[0];
      scatter[i * 3 + 1] = s[1];
      scatter[i * 3 + 2] = s[2];

      tree[i * 3] = t[0];
      tree[i * 3 + 1] = t[1];
      tree[i * 3 + 2] = t[2];

      // Initial buffer position (doesn't matter much as shader overrides)
      pos[i * 3] = s[0];
      pos[i * 3 + 1] = s[1];
      pos[i * 3 + 2] = s[2];

      rands[i] = Math.random();
    }
    return { positions: pos, scatterPositions: scatter, treePositions: tree, randoms: rands };
  }, [count]);

  useFrame((state, delta) => {
    if (shaderRef.current) {
      shaderRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      
      // Linear interpolation of progress uniform
      const target = state.scene.userData.treeState === TreeMorphState.TREE_SHAPE ? 1 : 0;
      shaderRef.current.uniforms.uProgress.value = THREE.MathUtils.lerp(
        shaderRef.current.uniforms.uProgress.value,
        target,
        delta * 1.5 // Speed of transition
      );
    }
  });

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aScatterPos"
          count={scatterPositions.length / 3}
          array={scatterPositions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aTreePos"
          count={treePositions.length / 3}
          array={treePositions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aRandom"
          count={randoms.length}
          array={randoms}
          itemSize={1}
        />
      </bufferGeometry>
      <shaderMaterial
        ref={shaderRef}
        attach="material"
        args={[FoliageMaterial]}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

export default Foliage;