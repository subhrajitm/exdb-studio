'use client'

import { useEffect, useRef } from 'react'

export default function Hero() {
  const cellLinesRef = useRef<HTMLDivElement>(null)
  const mouseGlowRef = useRef<HTMLDivElement>(null)
  const dataCellsRef = useRef<HTMLDivElement>(null)
  const mainRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const cellLinesContainer = cellLinesRef.current
    const mouseGlow = mouseGlowRef.current
    const dataCells = dataCellsRef.current
    const mainSection = mainRef.current

    if (!cellLinesContainer || !mainSection) return

    const cellWidth = 80
    const cellHeight = 25
    const maxLines = 8

    function createFlowingLine() {
      if (!cellLinesContainer) return

      const isHorizontal = Math.random() > 0.5
      const line = document.createElement('div')
      line.className = 'cell-line'

      if (isHorizontal) {
        line.classList.add('horizontal')
        const direction = Math.random() > 0.5 ? 'flow-right' : 'flow-left'
        line.classList.add(direction)

        const maxRows = Math.floor(window.innerHeight / cellHeight)
        const row = Math.floor(Math.random() * maxRows)
        const top = row * cellHeight

        const left = Math.random() * (window.innerWidth - cellWidth)

        line.style.top = top + 'px'
        line.style.left = left + 'px'
        line.style.animationDelay = Math.random() * 2 + 's'
        line.style.animationDuration = (3 + Math.random() * 2) + 's'
      } else {
        line.classList.add('vertical')
        const direction = Math.random() > 0.5 ? 'flow-down' : 'flow-up'
        line.classList.add(direction)

        const maxCols = Math.floor(window.innerWidth / cellWidth)
        const col = Math.floor(Math.random() * maxCols)
        const left = col * cellWidth

        const top = Math.random() * (window.innerHeight - cellHeight)

        line.style.left = left + 'px'
        line.style.top = top + 'px'
        line.style.animationDelay = Math.random() * 2 + 's'
        line.style.animationDuration = (2.5 + Math.random() * 1.5) + 's'
      }

      cellLinesContainer.appendChild(line)

      setTimeout(() => {
        if (line.parentNode) {
          line.remove()
        }
      }, 6000)
    }

    // Create initial lines
    for (let i = 0; i < maxLines; i++) {
      setTimeout(() => {
        createFlowingLine()
      }, i * 500)
    }

    // Continuously create new lines
    const intervalId = setInterval(() => {
      if (cellLinesContainer.children.length < maxLines) {
        createFlowingLine()
      }
    }, 2000 + Math.random() * 3000)

    // Mouse animation effects
    let trailTimeout: NodeJS.Timeout | null = null
    let particleTimeout: NodeJS.Timeout | null = null

    const handleMouseMove = (e: MouseEvent) => {
      if (!mainSection || !mouseGlow || !dataCells) return

      const rect = mainSection.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      if (mouseGlow) {
        mouseGlow.style.left = x + 'px'
        mouseGlow.style.top = y + 'px'
        mouseGlow.classList.add('active')
      }

      // Create soft trail dots
      if (!trailTimeout && dataCells) {
        trailTimeout = setTimeout(() => {
          trailTimeout = null
        }, 50)

        const trail = document.createElement('div')
        trail.className = 'mouse-trail'
        trail.style.left = x + 'px'
        trail.style.top = y + 'px'
        dataCells.appendChild(trail)

        setTimeout(() => {
          trail.remove()
        }, 1000)
      }

      // Create gentle particles occasionally
      if (!particleTimeout && Math.random() > 0.7 && dataCells) {
        particleTimeout = setTimeout(() => {
          particleTimeout = null
        }, 200)

        for (let i = 0; i < 3; i++) {
          const particle = document.createElement('div')
          particle.className = 'mouse-particle'
          const angle = (Math.PI * 2 * i) / 3
          const distance = 20 + Math.random() * 30
          const tx = Math.cos(angle) * distance
          const ty = Math.sin(angle) * distance

          particle.style.left = x + 'px'
          particle.style.top = y + 'px'
          particle.style.setProperty('--tx', tx + 'px')
          particle.style.setProperty('--ty', ty + 'px')
          dataCells.appendChild(particle)

          setTimeout(() => {
            particle.remove()
          }, 2000)
        }
      }
    }

    const handleMouseLeave = () => {
      if (mouseGlow) {
        mouseGlow.classList.remove('active')
      }
    }

    const handleMouseEnter = () => {
      const cells = mainSection?.querySelectorAll('.data-cell')
      cells?.forEach((cell, index) => {
        setTimeout(() => {
          ;(cell as HTMLElement).style.opacity = '1'
        }, index * 50)
      })
    }

    const handleMouseLeaveCells = () => {
      const cells = mainSection?.querySelectorAll('.data-cell')
      cells?.forEach((cell) => {
        ;(cell as HTMLElement).style.opacity = '0'
      })
    }

    mainSection.addEventListener('mousemove', handleMouseMove)
    mainSection.addEventListener('mouseleave', handleMouseLeave)
    mainSection.addEventListener('mouseenter', handleMouseEnter)
    mainSection.addEventListener('mouseleave', handleMouseLeaveCells)

    return () => {
      clearInterval(intervalId)
      mainSection.removeEventListener('mousemove', handleMouseMove)
      mainSection.removeEventListener('mouseleave', handleMouseLeave)
      mainSection.removeEventListener('mouseenter', handleMouseEnter)
      mainSection.removeEventListener('mouseleave', handleMouseLeaveCells)
    }
  }, [])

  const dataCells = [
    { top: 50, left: 80, value: '1,234' },
    { top: 75, left: 160, value: '5,678' },
    { top: 100, left: 320, value: '9,012' },
    { top: 125, left: 480, value: '3,456' },
    { top: 150, left: 80, value: '7,890' },
    { top: 175, left: 400, value: '2,345' },
    { top: 200, left: 240, value: '6,789' },
    { top: 225, left: 560, value: '1,111' },
    { top: 250, left: 160, value: '4,567' },
    { top: 275, left: 400, value: '8,901' },
    { top: 300, left: 0, value: '5,432' },
    { top: 325, left: 240, value: '9,876' },
    { top: 350, left: 480, value: '2,109' },
    { top: 375, left: 80, value: '6,543' },
    { top: 400, left: 320, value: '1,987' },
  ]

  return (
    <main
      ref={mainRef}
      className="relative flex flex-col items-center justify-center text-center min-h-screen px-4 border-b border-black/5 overflow-hidden"
    >
      <div className="line-grid"></div>
      <div className="cell-lines" ref={cellLinesRef}></div>
      <div className="mouse-glow" ref={mouseGlowRef}></div>
      <div className="data-cells" ref={dataCellsRef}>
        {dataCells.map((cell, index) => (
          <div
            key={index}
            className="data-cell"
            style={{ top: `${cell.top}px`, left: `${cell.left}px` }}
            data-value={cell.value}
          ></div>
        ))}
      </div>
      <div className="data-bars"></div>
      <div className="relative z-10 max-w-4xl mx-auto">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-light text-black tracking-tight mb-6">
          From Excel to<br />
          <span className="font-bold">Insights — Instantly</span>
        </h1>
        <p className="text-base sm:text-lg text-black/60 max-w-2xl mx-auto mb-8 leading-relaxed">
          Transform spreadsheets into databases, AI insights, and presentations.<br />
          No coding required.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <a
            className="inline-flex items-center justify-center px-6 py-2.5 text-sm font-medium text-white bg-black hover:bg-black/90 transition-all duration-300 rounded-lg shadow-sm hover:shadow-md"
            href="#"
          >
            Try Free Now
            <span className="material-symbols-outlined text-base ml-1.5">arrow_forward</span>
          </a>
          <a
            className="inline-flex items-center justify-center px-6 py-2.5 text-sm font-medium text-black/70 border border-black/20 hover:border-black/40 hover:bg-black/5 hover:text-black transition-all duration-300 rounded-lg"
            href="#"
          >
            <span className="material-symbols-outlined text-base mr-1.5">play_circle</span>
            Watch Demo
          </a>
        </div>
      </div>
    </main>
  )
}

