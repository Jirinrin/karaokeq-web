import { RefObject, useEffect, useLayoutEffect, useRef } from "react";

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

// https://dev.to/n8tb1t/tracking-scroll-position-with-react-hooks-3bbj

function getScrollPosition(p: { element?: RefObject<HTMLElement>, useWindow?: boolean }): number {
  const target = p.element ? p.element.current : document.body
  const position = target?.getBoundingClientRect()

  return p.useWindow ? window.scrollY : position?.top ?? 0
}

export function useScrollPosition(effect: (p: {prevPos: number, currPos: number}) => void, deps: any[], element?: RefObject<HTMLElement>, useWindow?: boolean, wait?: number) {
  const position = useRef(getScrollPosition({ useWindow }))

  // let throttleTimeout: NodeJS.Timeout|null = null

  const callBack = () => {
    const currPos = getScrollPosition({ element, useWindow })
    effect({ prevPos: position.current, currPos })
    position.current = currPos
    // throttleTimeout = null
  }

  useLayoutEffect(() => {
    const handleScroll = () => {
      if (wait) {
        // if (throttleTimeout === null) throttleTimeout = setTimeout(callBack, wait)
      } else {
        callBack()
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
