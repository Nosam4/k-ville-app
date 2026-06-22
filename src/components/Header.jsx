import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'

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
  const [showMenuPanel, setShowMenuPanel] = useState(false)
  const [flashGuessCount, setFlashGuessCount] = useState(false)
  const menuPanelRef = useRef(null)

  useEffect(() => {
    // Trigger flash animation whenever guessesRemaining changes
    setFlashGuessCount(true)
    const timeout = setTimeout(() => setFlashGuessCount(false), 600)
    return () => clearTimeout(timeout)
  }, [guessesRemaining])

  useLayoutEffect(() => {
    if (!showMenuPanel || !menuPanelRef.current) return undefined

    const panel = menuPanelRef.current
    const controls = panel.querySelectorAll('[data-menu-control]')

    const ctx = gsap.context(() => {
      gsap.fromTo(
        panel,
        { autoAlpha: 0, y: -8, scale: 0.98 },
        { autoAlpha: 1, y: 0, scale: 1, duration: 0.28, ease: 'power2.out' },
      )
      gsap.fromTo(
        controls,
        { autoAlpha: 0, y: 8 },
        { autoAlpha: 1, y: 0, duration: 0.24, stagger: 0.035, delay: 0.05, ease: 'power2.out' },
      )
    }, panel)

    return () => ctx.revert()
  }, [showMenuPanel])

  const openModalFromMenu = (modalName) => {
    onModalOpen(modalName)
    setShowMenuPanel(false)
  }

  const handleResetGame = () => {
    resetGame()
    setShowMenuPanel(false)
  }

  return (
    <div className="mb-6 rounded-[1.5rem] border border-white/10 bg-white/[0.06] p-4 shadow-xl shadow-black/10 sm:p-5" data-gsap="gameplay">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <button
          type="button"
          onClick={() => setShowMenuPanel(isOpen => !isOpen)}
          className="flex h-11 items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 text-sm font-extrabold text-white transition hover:bg-white/15"
          aria-label="Toggle game menu"
          aria-controls="game-command-panel"
          aria-expanded={showMenuPanel}
        >
          <i className="fa-solid fa-bars-staggered text-white"></i>
          <span className="hidden sm:inline">Menu</span>
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

      {showMenuPanel && (
        <div
          ref={menuPanelRef}
          id="game-command-panel"
          className="mt-5 overflow-hidden rounded-[1.25rem] border border-white/10 bg-[#061a33]/80 p-4 shadow-2xl shadow-black/20 backdrop-blur"
        >
          <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr_0.9fr]">
            <section data-menu-control className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-200/80">Discover</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
                <button
                  type="button"
                  onClick={() => openModalFromMenu('info')}
                  className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-left text-sm font-extrabold text-white transition hover:bg-white/15"
                >
                  <i className="fa-regular fa-circle-question mr-2 text-blue-200"></i>
                  How to play
                </button>
                <button
                  type="button"
                  onClick={() => openModalFromMenu('about')}
                  className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-left text-sm font-extrabold text-white transition hover:bg-white/15"
                >
                  <i className="fa-regular fa-lightbulb mr-2 text-yellow-200"></i>
                  Inspiration
                </button>
                <button
                  type="button"
                  onClick={() => openModalFromMenu('leaderboard')}
                  className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-left text-sm font-extrabold text-white transition hover:bg-white/15"
                >
                  <i className="fa-solid fa-trophy mr-2 text-amber-200"></i>
                  Leaderboard
                </button>
              </div>
            </section>

            <section data-menu-control className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-200/80">Difficulty</p>
              <div className="mt-3 grid grid-cols-3 gap-2 rounded-2xl bg-black/15 p-1">
                {['easy', 'normal', 'hard'].map(level => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setDifficulty(level)}
                    className={`rounded-xl px-3 py-2 text-sm font-extrabold capitalize transition ${
                      difficulty === level
                        ? 'bg-green-400 text-[#061a33] shadow-lg shadow-green-500/20'
                        : 'text-blue-100 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setColorBlindMode(!colorBlindMode)}
                className={`mt-3 w-full rounded-xl border px-4 py-3 text-left text-sm font-extrabold transition ${
                  colorBlindMode
                    ? 'border-green-300/50 bg-green-400 text-[#061a33]'
                    : 'border-white/10 bg-white/10 text-white hover:bg-white/15'
                }`}
              >
                <i className="fa-solid fa-palette mr-2"></i>
                Color blind mode: {colorBlindMode ? 'On' : 'Off'}
              </button>
            </section>

            <section data-menu-control className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-200/80">Game tools</p>
              <div className="mt-3 grid gap-2">
                <button
                  type="button"
                  onClick={handleResetGame}
                  className="rounded-xl border border-red-300/20 bg-red-400/15 px-4 py-3 text-left text-sm font-extrabold text-red-100 transition hover:bg-red-400/25"
                >
                  <i className="fa-solid fa-rotate-right mr-2"></i>
                  Reset current game
                </button>
                <button
                  type="button"
                  onClick={() => setShowMenuPanel(false)}
                  className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-left text-sm font-extrabold text-white transition hover:bg-white/15"
                >
                  <i className="fa-solid fa-chevron-up mr-2 text-blue-200"></i>
                  Close menu
                </button>
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  )
}

export default Header
