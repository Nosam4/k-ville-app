// components/ConfettiComponent.jsx
import Confetti from 'react-confetti'
import { useWindowSize } from '@react-hook/window-size'

const ConfettiComponent = ({ active }) => {
  const [width, height] = useWindowSize()

  if (!active) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 99999, // Ensure this is higher than modal z-index
      }}
    >
      <Confetti
        width={width}
        height={height}
        numberOfPieces={300}
        recycle={false}
        gravity={0.3}
        initialVelocityY={15}
      />
    </div>
  )
}

export default ConfettiComponent
