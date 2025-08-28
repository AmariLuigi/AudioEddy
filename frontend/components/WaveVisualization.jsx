import React from 'react'

const makePoints = ({ numberOfPoints, amplitude, offsetPixels, width }) => {
  const step = 1 / numberOfPoints
  const stepOffset = offsetPixels / width

  return Array.from({ length: numberOfPoints })
    .map((_, i, arr) => {
      const fraction = ((i - 0.5) % arr.length) * step - stepOffset

      let x = (fraction + 1) % 1
      x = x * width

      let y = Math.sin(Math.abs(fraction) * Math.PI)
      // Shape the wave with cubic easing
      y = y * y * (3 - 2 * y) // Cubic easing approximation
      // Amplify the wave
      y = y * amplitude
      // Every other point above/below center
      y = y * Math.sin((0.5 + i) * Math.PI)

      return { x, y }
    })
    .sort((a, b) => (a.x > b.x ? 1 : -1))
}

const Wave = ({
  sections = 12,
  offsetPixels,
  amplitude,
  width,
  height,
  lines = 2,
  lineGap = 20,
  lineColor = ['#8B5CF6', '#A78BFA'],
  lineThickness = 2,
  topRoundness = 0.4,
  bottomRoundness = 0.4
}) => {
  const w = width
  const h = height
  const nPoints = sections
  const off = offsetPixels % ((2 * width) / sections)

  const linePoints = Array.from({ length: lines }).map((_, i) => {
    const lineShift = i * lineGap
    return makePoints({
      width: w,
      numberOfPoints: nPoints,
      offsetPixels: lineShift + off,
      amplitude: 0.5 * amplitude
    })
  })

  const sectionWidth = w / nPoints
  const topControlPointDistance = topRoundness * sectionWidth
  const bottomControlPointDistance = bottomRoundness * sectionWidth

  const calcPt = (p, prevP) => {
    const isBottomPoint = p.y <= 0

    const currPointControlDistance = isBottomPoint
      ? topControlPointDistance
      : bottomControlPointDistance
    const prevPointControlDistance = isBottomPoint
      ? bottomControlPointDistance
      : topControlPointDistance

    const cp1x = prevP.x + prevPointControlDistance
    const cp1y = prevP.y
    const cp2x = p.x - currPointControlDistance
    const cp2y = p.y
    const px = p.x
    const py = p.y

    return `C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${px} ${py}`
  }

  return (
    <div style={{ width, height }}>
      <svg width={w} height={h} viewBox={`0 -${0.5 * h} ${w} ${h}`}>
        {linePoints.map((line, lineIndex) => {
          const lastP = line[line.length - 1]

          // Repeat colors if there are too few
          const color = Array.isArray(lineColor)
            ? lineColor[lineIndex % lineColor.length]
            : lineColor

          return (
            <path
              key={`line-${lineIndex}`}
              d={`M 0 0, ${line
                .map((p, i, pts) => {
                  const prevP = i === 0 ? { x: 0, y: 0 } : pts[i - 1]
                  return calcPt(p, prevP)
                })
                .join(',')}, ${calcPt({ x: w, y: 0 }, lastP)}`}
              stroke={color}
              strokeWidth={lineThickness}
              fill="none"
            />
          )
        })}
      </svg>
    </div>
  )
}

const WaveVisualization = ({
  frequencyData,
  width,
  height,
  offsetPixelSpeed = -200,
  maxDb,
  minDb,
  ...props
}) => {
  const currentTime = Date.now() / 1000 // Simple time-based animation

  if (!frequencyData) return null

  // Process frequency data to get amplitude
  const amplitudes = frequencyData
    .slice(0, Math.floor(0.25 * frequencyData.length))
    .map((v) => {
      // Simple audio processing without external dependencies
      const normalized = Math.max(0, Math.min(1, v / 100))
      return normalized
    })

  // Calculate RMS (Root Mean Square) for amplitude
  const rms = Math.sqrt(
    amplitudes.reduce((sum, val) => sum + val * val, 0) / amplitudes.length
  )
  
  const amplitude = height * rms * 0.8 // Scale down for better visual

  return (
    <div style={{ width, height }}>
      <Wave
        width={width}
        height={height}
        offsetPixels={offsetPixelSpeed * currentTime}
        amplitude={amplitude}
        {...props}
      />
    </div>
  )
}

export default WaveVisualization