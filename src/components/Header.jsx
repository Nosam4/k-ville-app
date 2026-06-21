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
    <div className="mb-6 rounded-[1.5rem] border border-white/10 bg-white/[0.06] p-4 shadow-xl shadow-black/10 sm:p-5" data-gsap="gameplay">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <button
          type="button"
          onClick={() => setShowMenuModal(true)}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/10 text-xl text-white transition hover:bg-white/15"
          aria-label="Open Menu"
        >
          <i className="fa-solid fa-bars-staggered text-white"></i>
        </button>

        <div className="min-w-0 flex-1 text-left md:text-center">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-blue-200/80">
            Current puzzle
          </p>
          <a
            href="https://www.instagram.com/kvillegame/"
            className="mt-1 block truncate text-2xl font-black text-white transition hover:text-blue-200 sm:text-3xl"
            target="_blank"
            rel="noopener noreferrer"
          >
            {gameTitle}
          </a>
          <p className="mt-1 text-sm font-medium text-blue-100/80">{gameSubtitle}</p>
        </div>

        <div className="flex items-center gap-3 md:justify-end">
          <div className={`rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-extrabold text-white transition-all ${flashGuessCount ? 'animate-flash' : ''}`}>
            {guessesRemaining}/6 guesses
          </div>
          <button
            type="button"
            className="flex items-center rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-extrabold text-white transition hover:bg-white/15"
            onClick={onTimerToggle}
          >
            <i className="fa-regular fa-clock mr-2"></i> {timer}
          </button>
        </div>
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
