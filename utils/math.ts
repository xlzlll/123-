import * as THREE from 'three';

// Random point in sphere
export const getRandomSpherePosition = (radius: number): [number, number, number] => {
  const u = Math.random();
  const v = Math.random();
  const theta = 2 * Math.PI * u;
  const phi = Math.acos(2 * v - 1);
  const r = Math.cbrt(Math.random()) * radius;
  const sinPhi = Math.sin(phi);
  return [
    r * sinPhi * Math.cos(theta),
    r * sinPhi * Math.sin(theta),
    r * Math.cos(phi)
  ];
};

// Point on a cone surface (Christmas tree shape)
export const getConePosition = (height: number, baseRadius: number, yOffset: number = 0): [number, number, number] => {
  const y = Math.random() * height; // Height from base
  const radiusAtY = baseRadius * (1 - y / height);
  const theta = Math.random() * Math.PI * 2;
  
  // Add some randomness to volume, not just surface
  const r = radiusAtY * Math.sqrt(Math.random()); 
  
  return [
    r * Math.cos(theta),
    y - (height / 2) + yOffset, // Center vertically roughly
    r * Math.sin(theta)
  ];
};

// Easing function for smooth animation
export const easeInOutCubic = (t: number): number => {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};