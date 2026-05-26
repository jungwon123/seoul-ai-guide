import { useEffect, useState, type ComponentType } from 'react';

interface LottiePlayerProps {
  /** Path under /public (e.g. '/animations/loading.json') or full URL */
  src: string;
  /** Fallback node shown while fetching JSON or loading the Lottie runtime */
  fallback?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  loop?: boolean;
  autoplay?: boolean;
  ariaLabel?: string;
}

type Data = Record<string, unknown>;
type LottieComp = ComponentType<{
  animationData: Data;
  loop?: boolean;
  autoplay?: boolean;
}>;

const dataCache = new Map<string, Data>();
// lottie-react 모듈은 한 번 import 하면 캐시 — 반복 LottiePlayer 가 다시 import 안 함.
let lottieModulePromise: Promise<LottieComp> | null = null;

function loadLottie(): Promise<LottieComp> {
  if (!lottieModulePromise) {
    lottieModulePromise = import('lottie-react').then((m) => m.default as LottieComp);
  }
  return lottieModulePromise;
}

export default function LottiePlayer({
  src,
  fallback = null,
  className,
  style,
  loop = true,
  autoplay = true,
  ariaLabel,
}: LottiePlayerProps) {
  const [data, setData] = useState<Data | null>(() => dataCache.get(src) ?? null);
  const [Lottie, setLottie] = useState<LottieComp | null>(null);
  const [failed, setFailed] = useState(false);

  // JSON fetch
  useEffect(() => {
    if (data || failed) return;
    let cancelled = false;
    fetch(src)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((json: Data) => {
        if (cancelled) return;
        dataCache.set(src, json);
        setData(json);
      })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [src, data, failed]);

  // Lottie 모듈 lazy import — JSON 받은 뒤 한 번만.
  useEffect(() => {
    if (!data || Lottie) return;
    let cancelled = false;
    loadLottie()
      .then((Comp) => { if (!cancelled) setLottie(() => Comp); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [data, Lottie]);

  if (failed || !data || !Lottie) {
    return <>{fallback}</>;
  }

  return (
    <div className={className} style={style} role="img" aria-label={ariaLabel}>
      <Lottie animationData={data} loop={loop} autoplay={autoplay} />
    </div>
  );
}
