"use client"

import { useEffect, useState } from "react"

interface UseCountUpOptions {
  end: number
  duration?: number
  delay?: number
  enabled?: boolean
}

export function useCountUp({ end, duration = 2000, delay = 0, enabled = true }: UseCountUpOptions) {
  const [count, setCount] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (!enabled || end === 0) {
      setCount(end)
      return
    }

    const timer = setTimeout(() => {
      setIsAnimating(true)
      const startTime = Date.now()
      const startValue = 0

      const animate = () => {
        const now = Date.now()
        const elapsed = now - startTime
        const progress = Math.min(elapsed / duration, 1)

        // Easing function for smooth animation
        const easeOutQuart = 1 - Math.pow(1 - progress, 4)
        const currentValue = Math.floor(startValue + (end - startValue) * easeOutQuart)

        setCount(currentValue)

        if (progress < 1) {
          requestAnimationFrame(animate)
        } else {
          setCount(end)
          setIsAnimating(false)
        }
      }

      requestAnimationFrame(animate)
    }, delay)

    return () => clearTimeout(timer)
  }, [end, duration, delay, enabled])

  return { count, isAnimating }
}
