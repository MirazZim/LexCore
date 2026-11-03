import { SkipForward } from 'lucide-react';
import { HERO_GREEN } from './twoTone';

// Secondary action beside a phase's main (green) button: jump past the rest of
// this word's phases. A white card the same height as .rv-btn-hero so the two
// read as a pair. Used by Context Theatre and the Collocation Forge.
export function SkipWordButton({ onClick, isLastWord }: { onClick: () => void; isLastWord: boolean }) {
  const label = isLastWord ? 'Finish' : 'Next word';
  return (
    <button
      type="button"
      onClick={onClick}
      title={isLastWord ? 'Skip the remaining steps and finish the session' : 'Skip the remaining steps for this word'}
      aria-label={label}
      className="group shrink-0 h-12 pl-1.5 pr-1.5 sm:pr-4 rounded-2xl flex items-center gap-2.5 bg-white text-left transition-all duration-200 outline-none hover:-translate-y-px active:translate-y-0 active:scale-[0.985] focus-visible:ring-2 focus-visible:ring-emerald-600/40"
      style={{
        border: '1px solid rgba(15,23,20,0.1)',
        boxShadow: '0 1px 2px rgba(15,23,20,0.06), 0 4px 12px -6px rgba(15,23,20,0.12)',
      }}
    >
      {/* Icon tile fills with the hero green on hover, echoing the main button */}
      <span className="relative w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center bg-emerald-50 text-emerald-700 transition-colors duration-200 group-hover:text-white">
        <span className="absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100" style={{ background: HERO_GREEN }} />
        <SkipForward className="relative h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
      </span>
      <span className="hidden sm:flex flex-col leading-none">
        <span className="text-[13px] font-bold text-zinc-800" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{label}</span>
        <span className="text-[10px] font-medium text-zinc-500 mt-1">{isLastWord ? 'end the session' : 'skip the rest'}</span>
      </span>
    </button>
  );
}
