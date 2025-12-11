import React from 'react';
import { TreeMorphState } from '../types';
import { Wand2, PartyPopper } from 'lucide-react';

interface UIOverlayProps {
  currentState: TreeMorphState;
  onToggle: () => void;
}

const UIOverlay: React.FC<UIOverlayProps> = ({ currentState, onToggle }) => {
  return (
    <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-8">
      {/* Header */}
      <header className="flex flex-col items-center animate-fade-in-down">
        <h1 className="font-serif text-4xl md:text-6xl text-transparent bg-clip-text bg-gradient-to-r from-arix-pink via-white to-arix-silver tracking-widest drop-shadow-[0_0_10px_rgba(255,192,203,0.5)] text-center">
          ARIX SIGNATURE
        </h1>
        <p className="font-sans text-xs md:text-sm text-arix-pink tracking-[0.3em] mt-2 uppercase">
          Interactive Holiday Experience
        </p>
      </header>

      {/* Controls */}
      <div className="flex justify-center mb-8 pointer-events-auto">
        <button
          onClick={onToggle}
          className={`
            group relative flex items-center gap-3 px-8 py-4 rounded-full 
            border border-arix-pink/30 backdrop-blur-md 
            transition-all duration-500 ease-out
            hover:border-arix-pink hover:bg-arix-pink/10 hover:shadow-[0_0_30px_rgba(255,0,127,0.4)]
            ${currentState === TreeMorphState.TREE_SHAPE ? 'bg-arix-magenta/20' : 'bg-black/20'}
          `}
        >
          {/* Animated Glow Border */}
          <div className="absolute inset-0 rounded-full border border-white/10" />
          
          <span className="text-arix-silver group-hover:text-white transition-colors duration-300">
            {currentState === TreeMorphState.SCATTERED ? <Wand2 size={24} /> : <PartyPopper size={24} />}
          </span>
          
          <span className="font-serif text-lg text-arix-silver group-hover:text-white tracking-widest transition-colors duration-300">
            {currentState === TreeMorphState.SCATTERED ? 'ASSEMBLE' : 'SCATTER'}
          </span>
        </button>
      </div>

      {/* Footer / Credits */}
      <div className="absolute bottom-4 right-8 text-right opacity-50">
         <p className="font-sans text-[10px] text-arix-pink tracking-widest">DESIGNED BY ARIX</p>
      </div>
    </div>
  );
};

export default UIOverlay;