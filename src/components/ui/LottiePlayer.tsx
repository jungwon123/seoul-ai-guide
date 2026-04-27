import { useEffect, useState } from 'react';
import Lottie from 'lottie-react';

interface LottiePlayerProps {
  /** Path under /public (e.g. '/animations/loading.json') or full URL */
  src: string;
  /** Fallback node shown while fetching or if the file is missing */
  fallback?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  loop?: boolean;
  autoplay?: boolean;
  ariaLabel?: string;
}

type Data = Record<string, unknown>;
const cache = new Map<string, Data>();

export default function LottiePlayer({
  src,
  fallback = null,
  className,
  style,
  loop = true,
  autoplay = true,
  ariaLabel,
}: LottiePlayerProps) {
  const [data, setData] = useState<Data | null>(() => cache.get(src) ?? null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (data || failed) return;
    let cancelled = false;
    fetch(src)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((json: Data) => {
        if (cancelled) return;
        cache.set(src, json);
        setData(json);
      })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [src, data, failed]);

  if (failed || !data) {
    return <>{fallback}</>;
  }

  return (
    <div className={className} style={style} role="img" aria-label={ariaLabel}>
      <Lottie animationData={data} loop={loop} autoplay={autoplay} />
    </div>
  );
}
