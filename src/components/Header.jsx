import { useEffect, useState } from 'react'
import HeaderModal from './HeaderModal'

function Header({
  gameTitle,
  gameSubtitle,
  difficulty,
  setDifficulty,
  guessesRemaining,
  timer,
  onModalOpen,
  onTimerToggle,
  resetGame,
  colorBlindMode,
  setColorBlindMode,
}) {
  const [showMenuModal, setShowMenuModal] = useState(false)
  const [flashGuessCount, setFlashGuessCount] = useState(false)

  useEffect(() => {
    // Trigger flash animation whenever guessesRemaining changes
    setFlashGuessCount(true)
    const timeout = setTimeout(() => setFlashGuessCount(false), 600)
    return () => clearTimeout(timeout)
  }, [guessesRemaining])

  return (
    <div className="flex flex-col md:flex-row justify-between items-center mb-8 pb-5 border-b-2 border-white/10 relative">
      {/* Menu Trigger */}
      <div className="z-10">
        <button
          onClick={() => setShowMenuModal(true)}
          className="cursor-pointer p-3 text-2xl hover:bg-white/10 rounded-full transition"
          aria-label="Open Menu"
        >
          <i className="fa-solid fa-bars-staggered text-white"></i>
        </button>
      </div>

      {/* Title */}
      <div className="text-center flex-1">
        <div className="text-4xl font-bold text-white drop-shadow">K-VILLE</div>
        <div>
          <a
            href="https://www.instagram.com/kvillegame/"
            className="text-blue-200 text-lg block hover:text-[#C13584] hover:underline transition duration-200"
            target="_blank"
            rel="noopener noreferrer"
          >
            {gameTitle}
          </a>
        </div>
        <div className="text-sm font-medium text-blue-100">{gameSubtitle}</div>
        <div className={`text-white font-medium mt-1 transition-all ${flashGuessCount ? 'animate-flash' : ''}`}>
          {guessesRemaining} out of 6 Guesses
        </div>
      </div>

      {/* Timer */}
      <div
        className="flex items-center text-white text-lg p-3 rounded hover:bg-white/10 cursor-pointer transition"
        onClick={onTimerToggle}
      >
        <i className="fa-regular fa-clock mr-2"></i> {timer}
      </div>

      {/* Modal Menu */}
      {showMenuModal && (
        <HeaderModal
          onClose={() => setShowMenuModal(false)}
          onModalOpen={onModalOpen}
          difficulty={difficulty}
          setDifficulty={setDifficulty}
          resetGame={resetGame}
          colorBlindMode={colorBlindMode}
          setColorBlindMode={setColorBlindMode}
        />
      )}
    </div>
  )
}

export default Header
