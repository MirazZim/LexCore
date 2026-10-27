import { HERO, HERO_GREEN, SURFACE } from '@/components/review/twoTone';

export const RV_STYLES = `
  .rv-glass {
    background: rgba(24,24,27,0.55);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border: 1px solid rgba(255,255,255,0.05);
  }
  .rv-input {
    width: 100%;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 0.875rem;
    padding: 0.75rem 1rem;
    color: #fff;
    font-size: 0.9rem;
    outline: none;
    transition: border-color 0.2s;
  }
  .rv-input::placeholder { color: #52525b; }
  .rv-input:focus { border-color: rgba(0,255,200,0.45); }
  .rv-textarea {
    width: 100%;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 0.875rem;
    padding: 0.75rem 1rem;
    color: #fff;
    font-size: 0.9rem;
    outline: none;
    resize: none;
    min-height: 100px;
    transition: border-color 0.2s;
  }
  .rv-textarea::placeholder { color: #52525b; }
  .rv-textarea:focus { border-color: rgba(0,255,200,0.45); }
  .rv-btn-mint {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    padding: 14px;
    border-radius: 1rem;
    font-weight: 700;
    font-size: 0.9rem;
    color: #18181b;
    background: linear-gradient(135deg, #2cffca 0%, #00FFC8 100%);
    box-shadow: 0 0 20px rgba(0,255,200,0.25);
    transition: opacity 0.15s, transform 0.15s;
    cursor: pointer;
  }
  .rv-btn-mint:hover { opacity: 0.88; transform: scale(1.015); }
  .rv-btn-mint:disabled { opacity: 0.35; transform: none; cursor: not-allowed; box-shadow: none; }
  .rv-btn-secondary {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    padding: 14px;
    border-radius: 1rem;
    font-weight: 600;
    font-size: 0.9rem;
    color: #a1a1aa;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.08);
    transition: all 0.15s;
    cursor: pointer;
  }
  .rv-btn-secondary:hover { background: rgba(255,255,255,0.09); color: #fff; border-color: rgba(255,255,255,0.15); }

  /* ── Two-tone review cards (see components/review/twoTone.ts) ── */
  .rv-hero {
    background: ${HERO.background};
    border: ${HERO.border};
    color: #fff;
  }
  .rv-surface {
    background: ${SURFACE.background};
    color: #18181b;
  }
  .rv-tile {
    background: #fff;
    border: 1px solid rgba(15,23,20,0.08);
    box-shadow: 0 1px 2px rgba(15,23,20,0.05);
  }
  .rv-btn-hero {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    padding: 14px;
    border-radius: 1rem;
    font-weight: 600;
    font-size: 0.9rem;
    color: #fff;
    background: ${HERO_GREEN};
    transition: filter 0.15s, transform 0.15s, opacity 0.15s;
    cursor: pointer;
  }
  .rv-btn-hero:hover { filter: brightness(1.25); }
  .rv-btn-hero:active { transform: scale(0.985); }
  .rv-btn-hero:disabled { opacity: 0.35; filter: none; transform: none; cursor: not-allowed; }
  .rv-input-light {
    width: 100%;
    background: #fff;
    border: 1px solid rgba(15,23,20,0.12);
    border-radius: 0.875rem;
    padding: 0.75rem 1rem;
    color: #18181b;
    font-size: 0.9rem;
    outline: none;
    transition: border-color 0.2s;
  }
  .rv-input-light::placeholder { color: #a1a1aa; }
  .rv-input-light:focus { border-color: #059669; }
`;
