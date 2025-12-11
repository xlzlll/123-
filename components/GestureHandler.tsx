import React, { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { GestureType } from '../types';

interface GestureHandlerProps {
  onGesture: (type: GestureType) => void;
  onHandMove: (x: number, y: number) => void;
}

const GestureHandler: React.FC<GestureHandlerProps> = ({ onGesture, onHandMove }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastGestureRef = useRef<GestureType>(GestureType.NONE);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let handLandmarker: HandLandmarker | null = null;
    let animationFrameId: number;

    const setup = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm"
        );

        handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1
        });

        setLoaded(true);
        startWebcam();
      } catch (err) {
        console.error("Failed to initialize MediaPipe:", err);
        setError("Failed to load vision model");
      }
    };

    const startWebcam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 640, height: 480 } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.addEventListener("loadeddata", predictWebcam);
        }
      } catch (err) {
        console.error("Error accessing webcam:", err);
        setError("Camera access denied");
      }
    };

    const predictWebcam = () => {
      if (!handLandmarker || !videoRef.current) return;
      
      const startTimeMs = performance.now();
      if (videoRef.current.videoWidth > 0 && !videoRef.current.paused && !videoRef.current.ended) {
          try {
            const results = handLandmarker.detectForVideo(videoRef.current, startTimeMs);
            
            if (results.landmarks && results.landmarks.length > 0) {
              const landmarks = results.landmarks[0];
              analyzeGestures(landmarks);
            }
          } catch (e) {
            console.warn("Prediction error", e);
          }
      }
      animationFrameId = requestAnimationFrame(predictWebcam);
    };

    const analyzeGestures = (landmarks: any[]) => {
      // 0: Wrist
      const wrist = landmarks[0];
      
      // Calculate normalized position (-1 to 1)
      // Video is mirrored, so we invert X.
      // X: 0 (left) -> 1 (right). Mirrored: we want 1 (left) -> -1 (right) or standard?
      // Let's use standard screen space: Center is 0,0. Left is -1, Right is 1. Up is 1, Down is -1.
      
      const x = (1 - wrist.x) * 2 - 1; 
      const y = (1 - wrist.y) * 2 - 1; // Invert Y because MediaPipe 0 is top.
      
      onHandMove(x, y);

      // 2. Detect Gestures
      const thumbTip = landmarks[4];
      const indexTip = landmarks[8];
      const middleTip = landmarks[12];
      const ringTip = landmarks[16];
      const pinkyTip = landmarks[20];

      const dist = (p1: any, p2: any) => Math.hypot(p1.x - p2.x, p1.y - p2.y, p1.z - p2.z);
      
      const fingers = [indexTip, middleTip, ringTip, pinkyTip];
      const avgDistToWrist = fingers.reduce((acc, tip) => acc + dist(tip, wrist), 0) / 4;
      const pinchDist = dist(thumbTip, indexTip);
      
      let detected = GestureType.NONE;

      if (pinchDist < 0.05) {
        detected = GestureType.GRAB;
      } else if (avgDistToWrist < 0.18) { 
        detected = GestureType.FIST;
      } else if (avgDistToWrist > 0.3) { 
        detected = GestureType.OPEN_PALM;
      }

      if (detected !== GestureType.NONE && detected !== lastGestureRef.current) {
        lastGestureRef.current = detected;
        onGesture(detected);
      }
    };

    setup();

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (handLandmarker) handLandmarker.close();
      if (videoRef.current && videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
    };
  }, [onGesture, onHandMove]);

  return (
    <>
      <video 
        ref={videoRef} 
        id="webcam-preview" 
        autoPlay 
        playsInline 
        muted
        style={{ display: loaded ? 'block' : 'none' }}
      />
      {!loaded && !error && (
        <div className="absolute bottom-6 left-6 z-50 text-xs text-arix-pink animate-pulse font-sans tracking-widest">
          INITIALIZING VISION AI...
        </div>
      )}
      {error && (
        <div className="absolute bottom-6 left-6 z-50 text-xs text-red-500 font-sans tracking-widest">
          {error}
        </div>
      )}
    </>
  );
};

export default GestureHandler;