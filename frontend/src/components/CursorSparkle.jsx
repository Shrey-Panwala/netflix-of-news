import { useEffect, useRef, useState } from 'react'

const MAX_PARTICLES = 36

function makeParticle(x, y, burst = false) {
  const angle = Math.random() * Math.PI * 2
  const radius = burst ? 10 + Math.random() * 26 : 4 + Math.random() * 12
  const driftX = Math.cos(angle) * radius
  const driftY = Math.sin(angle) * radius

  return {
    id: `${Date.now()}-${Math.random()}`,
    x,
    y,
    dx: driftX,
    dy: driftY,
    size: burst ? 5 + Math.random() * 4 : 3 + Math.random() * 3,
    rotation: Math.random() * 180,
    duration: burst ? 850 + Math.random() * 350 : 650 + Math.random() * 250,
    delay: Math.random() * 60,
  }
}

export default function CursorSparkle() {
  const [particles, setParticles] = useState([])
  const throttleRef = useRef(0)

  useEffect(() => {
    if (window.matchMedia('(pointer: coarse)').matches) return undefined

    function pushParticles(nextParticles) {
      setParticles(current => [...current, ...nextParticles].slice(-MAX_PARTICLES))

      nextParticles.forEach((particle) => {
        window.setTimeout(() => {
          setParticles(current => current.filter(item => item.id !== particle.id))
        }, particle.duration + particle.delay)
      })
    }

    function handleMove(event) {
      const now = Date.now()
      if (now - throttleRef.current < 24) return
      throttleRef.current = now
      pushParticles([makeParticle(event.clientX, event.clientY)])
    }

    function handleDown(event) {
      pushParticles([
        makeParticle(event.clientX, event.clientY, true),
        makeParticle(event.clientX, event.clientY, true),
        makeParticle(event.clientX, event.clientY, true),
        makeParticle(event.clientX, event.clientY, true),
      ])
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerdown', handleDown)

    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerdown', handleDown)
    }
  }, [])

  return (
    <div className="cursor-sparkle-layer" aria-hidden="true">
      {particles.map((particle) => (
        <span
          key={particle.id}
          className="cursor-sparkle"
          style={{
            left: particle.x,
            top: particle.y,
            width: particle.size,
            height: particle.size,
            '--sparkle-dx': `${particle.dx}px`,
            '--sparkle-dy': `${particle.dy}px`,
            '--sparkle-rotate': `${particle.rotation}deg`,
            animationDuration: `${particle.duration}ms`,
            animationDelay: `${particle.delay}ms`,
          }}
        />
      ))}
    </div>
  )
}
