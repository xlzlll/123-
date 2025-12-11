import React, { useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, Float, Sparkles, ContactShadows } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import * as THREE from 'three';
import Foliage from './Foliage';
import Ornaments from './Ornaments';
import Photos from './Photos';
import { TreeMorphState, HandPosition } from '../types';

interface ExperienceProps {
  treeState: TreeMorphState;
  handPosition: HandPosition;
  isZoomed: boolean;
}

const SceneContent: React.FC<ExperienceProps> = ({ treeState, handPosition, isZoomed }) => {
  const { scene } = useThree();
  const cameraGroupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    scene.userData.treeState = treeState;
  }, [treeState, scene]);

  // Handle Camera Rotation based on Hand Position
  useFrame((state, delta) => {
    if (cameraGroupRef.current) {
      if (treeState === TreeMorphState.SCATTERED && !isZoomed) {
         // Map hand position X (-1 to 1) to Yaw
         const targetRotationY = handPosition.x * (Math.PI / 3);
         
         // Map hand position Y (-1 to 1) to Pitch (Tilt up/down)
         const targetRotationX = handPosition.y * (Math.PI / 6); 
        
        cameraGroupRef.current.rotation.y = THREE.MathUtils.lerp(
          cameraGroupRef.current.rotation.y,
          targetRotationY,
          delta * 2
        );

        cameraGroupRef.current.rotation.x = THREE.MathUtils.lerp(
          cameraGroupRef.current.rotation.x,
          targetRotationX,
          delta * 2
        );
      } else {
         // Reset rotation smoothly
         cameraGroupRef.current.rotation.y = THREE.MathUtils.lerp(cameraGroupRef.current.rotation.y, 0, delta * 2);
         cameraGroupRef.current.rotation.x = THREE.MathUtils.lerp(cameraGroupRef.current.rotation.x, 0, delta * 2);
      }
    }
  });

  return (
    <>
      <color attach="background" args={['#100508']} />
      
      <Environment preset="city" environmentIntensity={0.6} />
      <ambientLight intensity={0.3} color="#ffc0cb" />
      
      <spotLight
        position={[10, 20, 10]}
        angle={0.25}
        penumbra={1}
        intensity={180}
        color="#ffe0e0"
        castShadow
        shadow-bias={-0.0001}
      />
      
      <spotLight position={[-12, 5, 8]} angle={0.5} penumbra={1} intensity={90} color="#ff007f" />
      <pointLight position={[0, 8, -10]} intensity={60} color="#e0ffff" distance={30} />

      {/* --- Scene Group for Camera Rotation --- */}
      <group ref={cameraGroupRef}>
          <group position={[0, -3, 0]}>
            <Foliage count={12000} state={treeState} />
            <Ornaments count={150} type="gift" state={treeState} />
            <Ornaments count={300} type="bauble" state={treeState} />
            
            {/* Pass hand position to Photos for parallax/holding effect */}
            <Photos state={treeState} isZoomed={isZoomed} handPosition={handPosition} />
            
            <Float speed={1.5} rotationIntensity={0.4} floatIntensity={0.8}>
              <Sparkles count={250} scale={15} size={3} speed={0.4} opacity={0.6} color="#ffc0cb" />
            </Float>
          </group>
      </group>

      <ContactShadows resolution={1024} scale={60} blur={2.5} opacity={0.5} far={10} color="#ff007f" />

      <EffectComposer disableNormalPass>
        <Bloom luminanceThreshold={0.85} mipmapBlur intensity={1.5} radius={0.5} />
        <Vignette eskil={false} offset={0.1} darkness={0.65} />
        <Noise opacity={0.03} />
      </EffectComposer>
    </>
  );
};

const Experience: React.FC<ExperienceProps> = (props) => {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [0, 4, 20], fov: 40 }}
      gl={{ 
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.1,
        antialias: false 
      }}
    >
      <SceneContent {...props} />
      <OrbitControls 
        enablePan={false} 
        minPolarAngle={Math.PI / 4} 
        maxPolarAngle={Math.PI / 1.8}
        minDistance={10}
        maxDistance={40}
        autoRotate={props.treeState === TreeMorphState.TREE_SHAPE && !props.isZoomed}
        autoRotateSpeed={0.8}
        enabled={!props.isZoomed} 
      />
    </Canvas>
  );
};

export default Experience;