import React, { useEffect, useRef, useState, useMemo } from 'react';

const DEFAULT_CONFIG = {
  position: 'bottom',
  strength: 2,
  height: '6rem',
  divCount: 5,
  exponential: false,
  zIndex: 1000,
  animated: false,
  duration: '0.3s',
  easing: 'ease-out',
  opacity: 1,
  curve: 'linear',
  responsive: false,
  target: 'parent',
  className: '',
  style: {} as React.CSSProperties,
};

const PRESETS: Record<string, Partial<typeof DEFAULT_CONFIG>> = {
  top:           { position: 'top',    height: '6rem' },
  bottom:        { position: 'bottom', height: '6rem' },
  left:          { position: 'left',   height: '6rem' },
  right:         { position: 'right',  height: '6rem' },
  subtle:        { height: '4rem', strength: 1, opacity: 0.8, divCount: 3 },
  intense:       { height: '10rem', strength: 4, divCount: 8, exponential: true },
  smooth:        { height: '8rem', curve: 'bezier', divCount: 10 },
  sharp:         { height: '5rem', curve: 'linear', divCount: 4 },
  header:        { position: 'top',    height: '8rem', curve: 'ease-out' },
  footer:        { position: 'bottom', height: '8rem', curve: 'ease-out' },
  sidebar:       { position: 'left',   height: '6rem', strength: 2.5 },
  'page-header': { position: 'top',    height: '10rem', target: 'page', strength: 3 },
  'page-footer': { position: 'bottom', height: '10rem', target: 'page', strength: 3 },
};

const CURVE_FUNCTIONS: Record<string, (p: number) => number> = {
  linear:       p => p,
  bezier:       p => p * p * (3 - 2 * p),
  'ease-in':    p => p * p,
  'ease-out':   p => 1 - Math.pow(1 - p, 2),
  'ease-in-out': p => p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2,
};

type GradualBlurProps = Partial<typeof DEFAULT_CONFIG> & {
  preset?: string;
  hoverIntensity?: number;
  onAnimationComplete?: () => void;
  mobileHeight?: string;
  tabletHeight?: string;
  desktopHeight?: string;
  mobileWidth?: string;
  tabletWidth?: string;
  desktopWidth?: string;
  width?: string;
};

const getGradientDirection = (position: string) =>
  ({ top: 'to top', bottom: 'to bottom', left: 'to left', right: 'to right' }[position] ?? 'to bottom');

const debounce = <T extends unknown[]>(fn: (...a: T) => void, wait: number) => {
  let t: ReturnType<typeof setTimeout>;
  return (...a: T) => { clearTimeout(t); t = setTimeout(() => fn(...a), wait); };
};

const useResponsiveDimension = (responsive: boolean, config: GradualBlurProps, key: keyof GradualBlurProps) => {
  const [val, setVal] = useState<string | undefined>(config[key] as string | undefined);
  useEffect(() => {
    if (!responsive) return;
    const capKey = (key as string)[0].toUpperCase() + (key as string).slice(1);
    const calc = () => {
      const w = window.innerWidth;
      let v = config[key] as string | undefined;
      if (w <= 480 && config[('mobile' + capKey) as keyof GradualBlurProps]) v = config[('mobile' + capKey) as keyof GradualBlurProps] as string;
      else if (w <= 768 && config[('tablet' + capKey) as keyof GradualBlurProps]) v = config[('tablet' + capKey) as keyof GradualBlurProps] as string;
      else if (w <= 1024 && config[('desktop' + capKey) as keyof GradualBlurProps]) v = config[('desktop' + capKey) as keyof GradualBlurProps] as string;
      setVal(v);
    };
    const deb = debounce(calc, 100);
    calc();
    window.addEventListener('resize', deb);
    return () => window.removeEventListener('resize', deb);
  }, [responsive, config, key]);
  return responsive ? val : (config[key] as string | undefined);
};

const GradualBlur = (props: GradualBlurProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  const config = useMemo<GradualBlurProps>(() => {
    const presetConfig = props.preset && PRESETS[props.preset] ? PRESETS[props.preset] : {};
    return { ...DEFAULT_CONFIG, ...presetConfig, ...props };
  }, [props]);

  useEffect(() => {
    if (config.animated !== 'scroll' || !containerRef.current) return;
    setIsVisible(false);
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.1 }
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [config.animated]);

  const responsiveHeight = useResponsiveDimension(!!config.responsive, config, 'height');
  const responsiveWidth  = useResponsiveDimension(!!config.responsive, config, 'width');

  const blurDivs = useMemo(() => {
    const divs: React.ReactNode[] = [];
    const increment = 100 / (config.divCount ?? 5);
    const currentStrength =
      isHovered && config.hoverIntensity
        ? (config.strength ?? 2) * config.hoverIntensity
        : (config.strength ?? 2);
    const curveFunc = CURVE_FUNCTIONS[config.curve ?? 'linear'] ?? CURVE_FUNCTIONS.linear;

    for (let i = 1; i <= (config.divCount ?? 5); i++) {
      let progress = i / (config.divCount ?? 5);
      progress = curveFunc(progress);

      const blurValue = config.exponential
        ? Math.pow(2, progress * 4) * 0.0625 * currentStrength
        : 0.0625 * (progress * (config.divCount ?? 5) + 1) * currentStrength;

      const r = (n: number) => Math.round(n * 10) / 10;
      const p1 = r(increment * i - increment);
      const p2 = r(increment * i);
      const p3 = r(increment * i + increment);
      const p4 = r(increment * i + increment * 2);
      let gradient = `transparent ${p1}%, black ${p2}%`;
      if (p3 <= 100) gradient += `, black ${p3}%`;
      if (p4 <= 100) gradient += `, transparent ${p4}%`;

      const direction = getGradientDirection(config.position ?? 'bottom');
      const divStyle: React.CSSProperties = {
        position: 'absolute',
        inset: '0',
        maskImage: `linear-gradient(${direction}, ${gradient})`,
        WebkitMaskImage: `linear-gradient(${direction}, ${gradient})`,
        backdropFilter: `blur(${blurValue.toFixed(3)}rem)`,
        WebkitBackdropFilter: `blur(${blurValue.toFixed(3)}rem)`,
        opacity: config.opacity ?? 1,
        transition: config.animated && config.animated !== 'scroll'
          ? `backdrop-filter ${config.duration} ${config.easing}`
          : undefined,
      };
      divs.push(<div key={i} style={divStyle} />);
    }
    return divs;
  }, [config, isHovered]);

  const containerStyle = useMemo<React.CSSProperties>(() => {
    const isVertical   = ['top', 'bottom'].includes(config.position ?? 'bottom');
    const isHorizontal = ['left', 'right'].includes(config.position ?? 'bottom');
    const isPageTarget = config.target === 'page';

    const base: React.CSSProperties = {
      position: isPageTarget ? 'fixed' : 'absolute',
      pointerEvents: config.hoverIntensity ? 'auto' : 'none',
      opacity: isVisible ? 1 : 0,
      transition: config.animated ? `opacity ${config.duration} ${config.easing}` : undefined,
      zIndex: isPageTarget ? (config.zIndex ?? 1000) + 100 : config.zIndex ?? 1000,
      ...config.style,
    };

    if (isVertical) {
      base.height = responsiveHeight;
      base.width  = responsiveWidth ?? '100%';
      base[config.position as 'top' | 'bottom'] = 0;
      base.left   = 0;
      base.right  = 0;
    } else if (isHorizontal) {
      base.width  = responsiveWidth ?? responsiveHeight;
      base.height = '100%';
      base[config.position as 'left' | 'right'] = 0;
      base.top    = 0;
      base.bottom = 0;
    }
    return base;
  }, [config, responsiveHeight, responsiveWidth, isVisible]);

  useEffect(() => {
    if (!isVisible || config.animated !== 'scroll' || !config.onAnimationComplete) return;
    const t = setTimeout(config.onAnimationComplete, parseFloat(config.duration ?? '0.3') * 1000);
    return () => clearTimeout(t);
  }, [isVisible, config.animated, config.onAnimationComplete, config.duration]);

  return (
    <div
      ref={containerRef}
      className={`gradual-blur ${config.target === 'page' ? 'gradual-blur-page' : 'gradual-blur-parent'} ${config.className ?? ''}`}
      style={containerStyle}
      onMouseEnter={config.hoverIntensity ? () => setIsHovered(true)  : undefined}
      onMouseLeave={config.hoverIntensity ? () => setIsHovered(false) : undefined}
    >
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>{blurDivs}</div>
    </div>
  );
};

const GradualBlurMemo = React.memo(GradualBlur);
GradualBlurMemo.displayName = 'GradualBlur';
export default GradualBlurMemo;
