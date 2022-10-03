import { useEffect, useRef } from "react";

export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();
  useEffect(() => { ref.current = value }, [value]);
  return ref.current;
}

export function useLastNonNull<T>(value: T|null): T | null {
  const ref = useRef<T|null>();
  useEffect(() => { ref.current = value ?? ref.current }, [value]);
  return value ?? ref.current ?? value
}
