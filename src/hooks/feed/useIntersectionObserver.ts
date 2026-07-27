import { useEffect, useRef, useState } from 'react';

interface UseIntersectionObserverOptions {
  threshold?: number | number[];
  rootMargin?: string;
  onVisible?: () => void;
  onHidden?: () => void;
}

export function useIntersectionObserver<T extends HTMLElement>({
  threshold = 0.5,
  rootMargin = '0px',
  onVisible,
  onHidden,
}: UseIntersectionObserverOptions) {
  const ref = useRef<T>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          onVisible?.();
        } else {
          setIsVisible(false);
          onHidden?.();
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(ref.current);

    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin, onVisible, onHidden]);

  return { ref, isVisible };
}
