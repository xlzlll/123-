import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Image } from '@react-three/drei';
import * as THREE from 'three';
import { TreeMorphState, PhotoData, HandPosition } from '../types';
import { getRandomSpherePosition } from '../utils/math';

interface PhotosProps {
  state: TreeMorphState;
  isZoomed: boolean;
  handPosition: HandPosition;
}

const PHOTO_URLS = [
  "https://images.unsplash.com/photo-1512909006721-3d6018887383?auto=format&fit=crop&w=600&q=80", 
  "https://images.unsplash.com/photo-1543589077-47d81606c1bf?auto=format&fit=crop&w=600&q=80", 
  "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?auto=format&fit=crop&w=600&q=80", 
  "https://images.unsplash.com/photo-1576919228236-a097c32a5cd4?auto=format&fit=crop&w=600&q=80", 
  "https://images.unsplash.com/photo-1513297887119-d46091b24bfa?auto=format&fit=crop&w=600&q=80" 
];

const Photos: React.FC<PhotosProps> = ({ state, isZoomed, handPosition }) => {
  const groupRef = useRef<THREE.Group>(null);
  
  const photos = useMemo(() => {
    return PHOTO_URLS.map((url, i) => {
      const s = getRandomSpherePosition(12);
      return {
        id: i,
        url,
        position: {
          scatter: s,
          tree: [0, -50, 0]
        },
        rotation: [Math.random() * 0.5 - 0.25, Math.random() * 0.5 - 0.25, 0]
      } as PhotoData;
    });
  }, []);

  useFrame((stateRoot, delta) => {
    if (!groupRef.current) return;
    
    const isTree = state === TreeMorphState.TREE_SHAPE;
    const activePhotoIndex = 2; 

    groupRef.current.children.forEach((child, i) => {
        const photo = photos[i];
        
        let targetPos = new THREE.Vector3(...photo.position.scatter);
        let targetScale = isTree ? 0 : 1.2;
        let targetRot = new THREE.Euler(...photo.rotation);
        let lerpSpeed = 2;

        if (isZoomed) {
          if (i === activePhotoIndex) {
            // Zoom logic + Parallax from hand position
            // Base zoom position: [0, 4, 16]
            // Add hand offset: x * 2, y * 2
            const handOffsetX = handPosition.x * 3;
            const handOffsetY = handPosition.y * 3;
            
            targetPos.set(handOffsetX, 4 + handOffsetY, 16); 
            
            // Tilt slightly based on hand
            targetRot.set(handPosition.y * 0.2, -handPosition.x * 0.2, 0);

            targetScale = 3.5;
            lerpSpeed = 3;
          } else {
            targetScale = 0;
            lerpSpeed = 4;
          }
        }

        // Apply smooth interpolation
        child.position.lerp(targetPos, delta * lerpSpeed);
        
        const currentScale = child.scale.x;
        const nextScale = THREE.MathUtils.lerp(currentScale, targetScale, delta * lerpSpeed);
        child.scale.setScalar(nextScale);
        
        if (!isZoomed || i !== activePhotoIndex) {
            child.rotation.x = THREE.MathUtils.lerp(child.rotation.x, targetRot.x + Math.sin(stateRoot.clock.elapsedTime * 0.5 + i) * 0.05, delta);
            child.rotation.y = THREE.MathUtils.lerp(child.rotation.y, targetRot.y + Math.cos(stateRoot.clock.elapsedTime * 0.3 + i) * 0.05, delta);
            child.rotation.z = THREE.MathUtils.lerp(child.rotation.z, targetRot.z, delta);
        } else {
             // Zoomed rotation follows target (hand tilt)
             child.rotation.x = THREE.MathUtils.lerp(child.rotation.x, targetRot.x, delta * lerpSpeed);
             child.rotation.y = THREE.MathUtils.lerp(child.rotation.y, targetRot.y, delta * lerpSpeed);
             child.rotation.z = THREE.MathUtils.lerp(child.rotation.z, targetRot.z, delta * lerpSpeed);
        }
    });
  });

  return (
    <group ref={groupRef}>
      {photos.map((photo, i) => (
        <group key={i} position={new THREE.Vector3(...photo.position.scatter)}>
            <mesh position={[0, 0, -0.01]}>
                <planeGeometry args={[1.1, 1.3]} />
                <meshStandardMaterial 
                  color={i === 2 && isZoomed ? "#ffc0cb" : "#f0f0f0"} 
                  roughness={0.4} 
                  metalness={0.2} 
                />
            </mesh>
            <Image 
              url={photo.url} 
              scale={[1, 1]} 
              transparent
              opacity={1}
              toneMapped={false}
            />
        </group>
      ))}
    </group>
  );
};

export default Photos;