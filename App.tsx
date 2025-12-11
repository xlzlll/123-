import React, { useState, useCallback, useEffect, useRef } from 'react';
import { TreeMorphState, GestureType, HandPosition } from './types';
import Experience from './components/Experience';
import UIOverlay from './components/UIOverlay';
import GestureHandler from './components/GestureHandler';
import { Loader } from '@react-three/drei';
import { Disc3, Mic } from 'lucide-react';

// --- CONFIGURATION ---
const LOCAL_SONG_PATH = "./bgm.mp3";
const LOCAL_LYRIC_PATH = "./lyric.lrc";

// Fallback Stream (G.E.M. - Long Distance)
const STREAM_FALLBACK = "https://music.163.com/song/media/outer/url?id=30352691.mp3";

// Fallback Lyrics (used if lyric.lrc is missing)
const FALLBACK_LYRICS = [
  { time: 0, text: "..." },
  { time: 1, text: "(Listening...)" },
  { time: 5, text: "Lyrics not found" },
  { time: 8, text: "Please add lyric.lrc to root" },
];

// LRC Parser Helper
const parseLrc = (lrcString: string) => {
  const lines = lrcString.split('\n');
  const result: { time: number; text: string }[] = [];
  const timeExp = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/;

  lines.forEach((line) => {
    const match = timeExp.exec(line);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const milliseconds = match[3] ? parseInt(match[3], 10) : 0;
      // Convert everything to seconds
      const time = minutes * 60 + seconds + milliseconds / 1000;
      const text = line.replace(timeExp, '').trim();
      if (text) {
        result.push({ time, text });
      }
    }
  });
  
  // Sort by time to ensure correct sync
  return result.sort((a, b) => a.time - b.time);
};

const App: React.FC = () => {
  const [treeState, setTreeState] = useState<TreeMorphState>(TreeMorphState.SCATTERED);
  const [gesture, setGesture] = useState<GestureType>(GestureType.NONE);
  const [handPosition, setHandPosition] = useState<HandPosition>({ x: 0, y: 0 });
  const [isZoomed, setIsZoomed] = useState(false);
  
  // Audio State
  const [songUrl, setSongUrl] = useState<string>(LOCAL_SONG_PATH);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isIdentified, setIsIdentified] = useState(false); 
  const [currentLyric, setCurrentLyric] = useState("...");
  const [lyricMap, setLyricMap] = useState<{time: number, text: string}[]>(FALLBACK_LYRICS);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const volumeIntervalRef = useRef<number | null>(null);

  // 1. Fetch & Parse Lyrics on Mount
  useEffect(() => {
    fetch(LOCAL_LYRIC_PATH)
      .then(response => {
        if (!response.ok) throw new Error("LRC file missing");
        return response.text();
      })
      .then(text => {
        const parsed = parseLrc(text);
        if (parsed.length > 0) {
          // Add initial listening state if not present
          if (parsed[0].time > 2) {
             parsed.unshift({ time: 0, text: "..." }, { time: 1, text: "(Listening...)" });
          }
          setLyricMap(parsed);
          console.log("Lyrics loaded successfully");
        }
      })
      .catch(err => {
        console.warn("Could not load local lyrics, using fallback:", err);
      });
  }, []);

  // Handle Audio Errors (Auto-fallback)
  const handleAudioError = () => {
    if (songUrl === LOCAL_SONG_PATH) {
      console.warn("Local 'bgm.mp3' not found. Switching to network stream fallback.");
      setSongUrl(STREAM_FALLBACK);
      setIsIdentified(false);
    }
  };

  const startAudio = () => {
    if (audioRef.current) {
      if (audioRef.current.paused) {
          audioRef.current.volume = 0.4;
          const playPromise = audioRef.current.play();
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                setIsPlaying(true);
                setTimeout(() => {
                    setIsIdentified(true);
                }, 2500); 
              })
              .catch(e => console.log("Audio autoplay prevented.", e));
          }
      }
    }
  };

  // 2. Audio Initialization
  useEffect(() => {
    if (gesture !== GestureType.NONE && !isPlaying) {
      startAudio();
    }
    const handleClick = () => {
        if (!isPlaying) startAudio();
    };
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [gesture, isPlaying, songUrl]);

  // 3. Dynamic Volume Control
  useEffect(() => {
    if (!audioRef.current) return;
    const targetVolume = isZoomed ? 1.0 : 0.4; 
    
    if (volumeIntervalRef.current) clearInterval(volumeIntervalRef.current);

    volumeIntervalRef.current = window.setInterval(() => {
      if (!audioRef.current) return;
      const currentVol = audioRef.current.volume;
      const diff = targetVolume - currentVol;
      
      if (Math.abs(diff) < 0.02) {
        audioRef.current.volume = targetVolume;
        if (volumeIntervalRef.current) clearInterval(volumeIntervalRef.current);
      } else {
        audioRef.current.volume = currentVol + diff * 0.05;
      }
    }, 50);

    return () => {
      if (volumeIntervalRef.current) clearInterval(volumeIntervalRef.current);
    };
  }, [isZoomed]);

  // 4. Real-time Lyric Synchronization
  const handleTimeUpdate = () => {
      if (!audioRef.current) return;
      const t = audioRef.current.currentTime;
      // Use the dynamic lyricMap state instead of constant
      const activeItem = [...lyricMap].reverse().find(item => item.time <= t);
      if (activeItem && activeItem.text !== currentLyric) {
          setCurrentLyric(activeItem.text);
      }
  };

  const toggleState = useCallback(() => {
    setTreeState((prev) => 
      prev === TreeMorphState.SCATTERED 
        ? TreeMorphState.TREE_SHAPE 
        : TreeMorphState.SCATTERED
    );
    setIsZoomed(false);
  }, []);

  const handleGesture = useCallback((type: GestureType) => {
    setGesture(type);
    if (type === GestureType.FIST) {
      setTreeState(TreeMorphState.TREE_SHAPE);
      setIsZoomed(false);
    } else if (type === GestureType.OPEN_PALM) {
      setTreeState(TreeMorphState.SCATTERED);
      setIsZoomed(false);
    } else if (type === GestureType.GRAB) {
       setTreeState((current) => {
           if (current === TreeMorphState.SCATTERED) {
               setIsZoomed(true);
           }
           return current;
       });
    }
  }, []);

  const handleHandMove = useCallback((x: number, y: number) => {
    setHandPosition({ x, y });
  }, []);

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      <audio 
        ref={audioRef} 
        src={songUrl} 
        loop 
        crossOrigin="anonymous"
        onError={handleAudioError}
        onTimeUpdate={handleTimeUpdate}
      />

      <div className="absolute inset-0 z-0">
        <Experience 
          treeState={treeState} 
          handPosition={handPosition}
          isZoomed={isZoomed}
        />
      </div>

      <GestureHandler onGesture={handleGesture} onHandMove={handleHandMove} />

      <UIOverlay currentState={treeState} onToggle={toggleState} />
      
      {/* === MUSIC RECOGNITION & LYRICS UI === */}
      <div className={`absolute top-6 right-6 z-20 flex flex-col items-end gap-3 transition-opacity duration-1000 ${isPlaying ? 'opacity-100' : 'opacity-0'}`}>
         
         {/* Status Header */}
         <div className={`
            flex items-center gap-3 px-4 py-2 rounded-full border transition-all duration-700
            ${!isIdentified 
                ? 'bg-black/50 border-arix-magenta/50 shadow-[0_0_15px_rgba(255,0,127,0.3)]' 
                : 'bg-black/30 backdrop-blur-md border-white/10'}
         `}>
            
            {!isIdentified ? (
                <div className="relative flex items-center justify-center w-6 h-6">
                     <span className="absolute w-full h-full rounded-full border-2 border-arix-magenta animate-ping opacity-75"></span>
                     <Mic size={16} className="text-arix-pink animate-pulse" />
                </div>
            ) : (
                <Disc3 size={18} className="text-arix-pink animate-[spin_4s_linear_infinite]" />
            )}

            <div className="flex flex-col items-end min-w-[100px]">
                {!isIdentified ? (
                    <span className="text-arix-pink font-sans text-[10px] tracking-[0.2em] font-bold animate-pulse">
                        LISTENING...
                    </span>
                ) : (
                    <div className="flex flex-col items-end animate-fade-in-right">
                        <span className="text-arix-silver/60 font-sans text-[8px] tracking-widest uppercase mb-0.5">
                            MATCH FOUND
                        </span>
                        {/* We hide the song title until identified, assuming the user updates the LRC file for any song */}
                        <span className="text-arix-pink font-serif text-xs tracking-widest uppercase font-bold shadow-black drop-shadow-md">
                            NOW PLAYING
                        </span>
                    </div>
                )}
            </div>
         </div>

         {/* Lyrics Display */}
         {isIdentified && (
             <div className="relative mt-2 pr-2 max-w-[300px]">
                 <div className={`absolute -right-2 top-0 bottom-0 w-0.5 flex flex-col justify-center gap-0.5 transition-all duration-500 ${isZoomed ? 'opacity-100' : 'opacity-30'}`}>
                    <div className="w-full bg-arix-pink h-1/3 animate-[bounce_0.4s_infinite]" />
                    <div className="w-full bg-arix-pink h-1/2 animate-[bounce_0.6s_infinite]" />
                    <div className="w-full bg-arix-pink h-1/4 animate-[bounce_0.5s_infinite]" />
                 </div>

                 <p 
                    className={`
                        text-white/90 font-serif italic tracking-wider text-right drop-shadow-lg transition-all duration-700
                        ${isZoomed 
                            ? 'text-xl translate-y-0 text-arix-pink drop-shadow-[0_0_8px_rgba(255,192,203,0.8)]' 
                            : 'text-sm translate-y-2 text-white/70'}
                    `}
                 >
                    "{currentLyric}"
                 </p>
             </div>
         )}
      </div>

      {/* Debug/Gesture Indicator */}
      <div className="absolute top-4 left-4 z-20 pointer-events-none flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${gesture !== GestureType.NONE ? 'bg-arix-magenta animate-pulse' : 'bg-gray-600'}`} />
            <p className="text-arix-pink font-sans text-[10px] tracking-widest uppercase opacity-80">
               {gesture === GestureType.NONE ? 'WAITING FOR GESTURE' : gesture}
            </p>
          </div>
          {isZoomed && (
            <div className="text-arix-silver font-serif text-sm italic animate-pulse tracking-wider">
               Hold close...
            </div>
          )}
      </div>

      <Loader 
        containerStyles={{ background: '#050505' }}
        innerStyles={{ background: '#333', width: '200px', height: '1px' }}
        barStyles={{ background: '#ff007f', height: '1px' }}
        dataInterpolation={(p) => `INITIALIZING ${p.toFixed(0)}%`}
        dataStyles={{ color: '#ffc0cb', fontFamily: 'Inter', fontWeight: 400, fontSize: '10px', letterSpacing: '0.3em' }}
      />
    </div>
  );
};

export default App;