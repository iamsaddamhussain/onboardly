import { useEffect, useRef, useState } from "react"

// Animates a number from 0 up to `target` with an ease-out curve, re-running
// whenever the target changes. Returns the current animated value so a
// component can simply render it (see StatValue on the dashboard).
export function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(0)
  const frame = useRef<number>(0)

  useEffect(() => {
    const start = performance.now()
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      // Ease-out so it slows near the end.
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(target * eased))
      if (progress < 1) frame.current = requestAnimationFrame(tick)
    }
    frame.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame.current)
  }, [target, duration])

  return value
}
