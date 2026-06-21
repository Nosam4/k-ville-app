function HeaderModal({ onClose, onModalOpen, difficulty, setDifficulty, resetGame, colorBlindMode, setColorBlindMode }) {
  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-[#001a57] to-[#003d82] bg-opacity-95 flex flex-col items-center justify-center px-6 py-10 text-white backdrop-blur-sm">
      {/* Title */}
      <div className="text-4xl font-extrabold mb-10 drop-shadow tracking-wide text-center">
        Game Menu
      </div>

      {/* Content Wrapper */}
      <div className="w-full max-w-md flex flex-col gap-10">
        {/* Discover Section */}
        <div>
          <div className="text-xl font-semibold mb-3 underline text-blue-200">Discover</div>
          <div className="flex flex-col gap-4">
            <button
              onClick={() => { onModalOpen('info'); onClose(); }}
              className="bg-white/10 text-white font-semibold py-3 px-4 rounded-xl text-center shadow hover:bg-green-500/70 active:bg-green-500 transition"
            >
              📖 How to Play
            </button>

            <button
              onClick={() => { onModalOpen('about'); onClose(); }}
              className="bg-white/10 text-white font-semibold py-3 px-4 rounded-xl text-center shadow hover:bg-blue-500/70 active:bg-blue-500 transition"
            >
              💡 Inspiration
            </button>

            <button
              onClick={() => { onModalOpen('leaderboard'); onClose(); }}
              className="bg-white/10 text-white font-semibold py-3 px-4 rounded-xl text-center shadow hover:bg-yellow-500/70 active:bg-yellow-500 transition"
            >
              🏆 Leaderboard
            </button>
          </div>
        </div>

        {/* Game Tools Section */}
        <div>
          <div className="text-xl font-semibold mb-3 underline text-blue-200">Game Tools</div>
          <div className="flex flex-col gap-4">
            <button
              onClick={() => { resetGame(); onClose(); }}
              className="bg-white/10 text-white font-semibold py-3 px-4 rounded-xl text-center shadow hover:bg-red-500/70 active:bg-red-500 transition"
            >
              🔄 Reset Game
            </button>
          </div>
          <div className="flex flex-col gap-4 mt-4">
            <button
              onClick={() => setColorBlindMode(!colorBlindMode)}
              className={`w-full font-semibold py-3 px-4 rounded-xl text-center shadow transition ${
                colorBlindMode
                  ? 'bg-green-500 text-black hover:bg-green-400 active:bg-green-600'
                  : 'bg-white/10 text-white hover:bg-white/20 active:bg-white/30'
              }`}
            >
              🎨 Color Blind Mode: {colorBlindMode ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        {/* Difficulty Section */}
        <div>
          <div className="text-xl font-semibold mb-3 underline text-blue-200">Difficulty</div>
          <div className="grid grid-cols-3 gap-4">
            {['easy', 'normal', 'hard'].map(level => (
              <button
                key={level}
                onClick={() => { setDifficulty(level); onClose(); }}
                className={`py-2 rounded-full font-semibold transition duration-200 ${
                  difficulty === level
                    ? 'bg-green-400 text-black shadow-lg'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Close Button */}
      <button
        onClick={onClose}
        className="mt-12 px-6 py-3 bg-white text-black rounded-full text-lg font-semibold hover:bg-gray-200 shadow transition duration-150"
      >
        Close
      </button>
    </div>
  )
}

export default HeaderModal
