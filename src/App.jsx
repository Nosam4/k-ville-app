import { useState, useEffect, useCallback, useMemo } from 'react'
import Header from './components/Header'
import PlayerInput from './components/PlayerInput'
import GuessTable from './components/GuessTable'
import Footer from './components/Footer'
import Modal from './components/Modal'
import ConfettiComponent from './components/ConfettiComponent'
import GameSelector from './components/GameSelector'
import { gameLogic } from './utils/gameLogic'
import { GAME_CATALOG } from './data/gameCatalog'

const defaultScores = { easy: 0, normal: 0, hard: 0 }

function App() {
  const [currentModal, setCurrentModal] = useState(() => {
    const hasSeenModal = localStorage.getItem('hasSeenInfoModal')
    return hasSeenModal ? null : 'info'
  })
  const [selectedSportId, setSelectedSportId] = useState('basketball')
  const [selectedTeamId, setSelectedTeamId] = useState('duke')
  const [difficulty, setDifficulty] = useState('easy')
  const [guesses, setGuesses] = useState([])
  const [guessesRemaining, setGuessesRemaining] = useState(6)
  const [secretPlayer, setSecretPlayer] = useState(null)
  const [gameWon, setGameWon] = useState(false)
  const [gameLost, setGameLost] = useState(false)
  const [scores, setScores] = useState({})
  const [timer, setTimer] = useState(0)
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const [colorBlindMode, setColorBlindMode] = useState(false)

  const selectedSport = useMemo(
    () => GAME_CATALOG.find(sport => sport.id === selectedSportId) ?? GAME_CATALOG[0],
    [selectedSportId],
  )

  const selectedTeam = useMemo(
    () => selectedSport.teams.find(team => team.id === selectedTeamId) ?? selectedSport.teams[0],
    [selectedSport, selectedTeamId],
  )

  const playerData = selectedTeam.players
  const gameColumns = selectedSport.columns
  const hasPlayers = playerData.length > 0
  const gameKey = `${selectedSport.id}:${selectedTeam.id}`
  const gameTitle = `${selectedTeam.name} ${selectedSport.shortName}`
  const gameSubtitle = `${selectedTeam.nickname} ${selectedSport.name} Guessing Game`
  const teamScores = scores[gameKey] ?? defaultScores

  const initializeGame = useCallback(() => {
    if (!hasPlayers) {
      setSecretPlayer(null)
      setGuesses([])
      setGuessesRemaining(6)
      setGameWon(false)
      setGameLost(false)
      setTimer(0)
      setIsTimerRunning(false)
      return
    }

    const newSecretPlayer = gameLogic.selectRandomPlayer(playerData, difficulty)
    setSecretPlayer(newSecretPlayer)
    setGuesses([])
    setGuessesRemaining(6)
    setGameWon(false)
    setGameLost(false)
    setTimer(0)
    setIsTimerRunning(Boolean(newSecretPlayer))
  }, [difficulty, hasPlayers, playerData])

  useEffect(() => {
    initializeGame()
  }, [initializeGame])

  useEffect(() => {
    if (!isTimerRunning) return undefined

    const interval = setInterval(() => setTimer(time => time + 1), 1000)
    return () => clearInterval(interval)
  }, [isTimerRunning])

  const handleSportSelect = (sportId) => {
    const nextSport = GAME_CATALOG.find(sport => sport.id === sportId)
    if (!nextSport) return

    const nextTeam = nextSport.teams.find(team => team.id === selectedTeamId) ?? nextSport.teams[0]
    setSelectedSportId(nextSport.id)
    setSelectedTeamId(nextTeam.id)
    setCurrentModal(null)
  }

  const handleTeamSelect = (teamId) => {
    if (!selectedSport.teams.some(team => team.id === teamId)) return

    setSelectedTeamId(teamId)
    setCurrentModal(null)
  }

  const handlePlayerGuess = (playerName) => {
    if (guessesRemaining <= 0 || gameWon || gameLost || !secretPlayer) return

    const player = playerData.find(p => p.name === playerName)
    if (!player) return

    const guessResult = gameLogic.processGuess(player, secretPlayer, gameColumns)
    if (!guessResult) return

    setGuesses(previousGuesses => [...previousGuesses, guessResult])
    setGuessesRemaining(previousRemaining => previousRemaining - 1)

    if (guessResult.isCorrect) {
      setGameWon(true)
      setIsTimerRunning(false)
      setScores(previousScores => {
        const previousGameScores = previousScores[gameKey] ?? defaultScores

        return {
          ...previousScores,
          [gameKey]: {
            ...previousGameScores,
            [difficulty]: (previousGameScores[difficulty] ?? 0) + 1,
          },
        }
      })
      setCurrentModal('score')
    } else if (guessesRemaining <= 1) {
      setGameLost(true)
      setIsTimerRunning(false)
      setCurrentModal('score')
    }
  }

  const resetGame = useCallback(() => {
    initializeGame()
    setCurrentModal(null)
  }, [initializeGame])

  const closeInfoModal = () => {
    localStorage.setItem('hasSeenInfoModal', 'true')
    setCurrentModal(null)
  }

  const formatTime = (seconds) => (
    `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`
  )

  const modalContent = {
    info: {
      title: 'How to Play',
      content: (
        <div className="flex flex-col gap-3 text-blue-100 text-sm sm:text-base leading-relaxed">
          <p><strong>Your goal:</strong> Find the secret player in 6 guesses or less.</p>
          <div>
            <p className="font-semibold">How to Make a Guess:</p>
            <ol className="pl-5 list-decimal mt-1">
              <li>Click the dropdown arrow or type in the player name</li>
              <li>Click on a name from the grid to select</li>
              <li>Your guess is submitted as soon as you select a player</li>
            </ol>
          </div>
          <div>
            <p className="font-semibold">Color Codes:</p>
            <ul className="pl-5 list-disc mt-1">
              <li className="text-green-400"><strong>Green</strong> = Correct</li>
              <li className="text-yellow-400"><strong>Yellow</strong> = Close</li>
              <li className="text-red-400"><strong>Red</strong> = Incorrect</li>
            </ul>
          </div>
          <button
            type="button"
            onClick={closeInfoModal}
            className="bg-gradient-to-r from-green-400 to-green-600 text-white font-bold py-3 px-6 rounded-lg mb-6 mx-auto block transition duration-200 hover:ring-4 hover:ring-green-300 hover:ring-opacity-80"
          >
            Start playing
          </button>
        </div>
      ),
    },
    about: {
      title: 'Inspiration',
      content: (
        <div className="text-blue-100 leading-relaxed space-y-4 text-center text-sm sm:text-base">
          <p>K-Ville started as a Duke basketball guessing game and is now set up to grow across schools and sports.</p>
          <p>The goal is a daily-style fan challenge where each roster feels specific to its team and history.</p>
        </div>
      ),
    },
    leaderboard: {
      title: 'Leaderboard',
      content: (
        <div className="text-blue-100 leading-relaxed space-y-4 text-center text-sm sm:text-base">
          <p>Coming soon: Global rankings and daily top scorers.</p>
          <p>This is ready for Supabase-backed accounts and team-specific leaderboards later.</p>
        </div>
      ),
    },
    signIn: {
      title: 'Sign In',
      content: (
        <div className="text-blue-100 leading-relaxed space-y-4 text-center text-sm sm:text-base">
          <p>Accounts are coming soon.</p>
          <p>Once Supabase is connected, this can save scores, streaks, and leaderboard entries.</p>
        </div>
      ),
    },
    score: {
      title: gameWon ? 'You got it' : 'Game over',
      content: (
        <div className="text-center text-white">
          <button
            type="button"
            onClick={resetGame}
            className="bg-gradient-to-r from-green-400 to-green-600 text-white font-bold py-3 px-6 rounded-lg mb-6 mx-auto block transition duration-200 hover:ring-4 hover:ring-green-300 hover:ring-opacity-80"
          >
            Reset Game
          </button>

          {secretPlayer && (
            <div className="bg-white/10 p-5 rounded-xl mb-5">
              <div className="text-xl font-bold mb-2">{secretPlayer.name}</div>
              {secretPlayer.instagram && (
                <div className="mb-1">
                  <a href={secretPlayer.instagram} target="_blank" rel="noreferrer" className="text-blue-300 hover:text-[#C13584] hover:underline transition duration-200">
                    {secretPlayer.InstaUsername || secretPlayer.name}
                  </a>
                </div>
              )}
              {secretPlayer.fact && (
                <div className="italic text-blue-100">{secretPlayer.fact}</div>
              )}
            </div>
          )}

          <table className="w-full border-collapse bg-white/10 text-white rounded-xl overflow-hidden text-center">
            <thead>
              <tr className="bg-blue-900/80">
                <th className="py-2 px-4 font-bold">Difficulty</th>
                <th className="py-2 px-4 font-bold">Score</th>
              </tr>
            </thead>
            <tbody>
              <tr><td className="py-2">Easy</td><td>{teamScores.easy}</td></tr>
              <tr><td className="py-2">Normal</td><td>{teamScores.normal}</td></tr>
              <tr><td className="py-2">Hard</td><td>{teamScores.hard}</td></tr>
            </tbody>
          </table>
        </div>
      ),
    },
  }

  return (
    <div className="min-h-screen flex justify-center items-start p-4 sm:p-5 bg-gradient-to-br from-[#001a57] via-[#003d82] to-[#111827] text-white">
      <div className="w-full max-w-6xl bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-8 shadow-2xl">
        <GameSelector
          sports={GAME_CATALOG}
          selectedSportId={selectedSport.id}
          selectedTeamId={selectedTeam.id}
          onSelectSport={handleSportSelect}
          onSelectTeam={handleTeamSelect}
        />

        {hasPlayers ? (
          <>
            <Header
              gameTitle={gameTitle}
              gameSubtitle={gameSubtitle}
              difficulty={difficulty}
              setDifficulty={setDifficulty}
              guessesRemaining={guessesRemaining}
              timer={formatTime(timer)}
              onModalOpen={setCurrentModal}
              onTimerToggle={() => setIsTimerRunning(isRunning => !isRunning)}
              resetGame={resetGame}
              colorBlindMode={colorBlindMode}
              setColorBlindMode={setColorBlindMode}
            />
            <PlayerInput
              key={`${gameKey}:${guesses.length === 0 ? 'new-game' : 'playing'}`}
              onPlayerGuess={handlePlayerGuess}
              playerData={playerData}
              difficulty={difficulty}
              guesses={guesses}
              disabled={gameWon || gameLost || guessesRemaining <= 0}
            />
            <GuessTable
              guesses={guesses}
              colorBlindMode={colorBlindMode}
              columns={gameColumns}
            />
            <ConfettiComponent active={gameWon} />
          </>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center shadow-xl">
            <div className="text-2xl font-extrabold text-white">{gameTitle}</div>
            <p className="mx-auto mt-3 max-w-2xl text-blue-100">
              This game slot is ready, but it needs roster data before guesses can begin.
            </p>
            <p className="mt-3 text-sm font-semibold text-blue-200">
              Add players to src/data/{selectedSport.id}/{selectedTeam.id}.js using the same shape as Duke men's basketball.
            </p>
          </div>
        )}

        <Footer onModalOpen={setCurrentModal} />
        {currentModal && modalContent[currentModal] && (
          <Modal
            isOpen={true}
            onClose={() => setCurrentModal(null)}
            title={modalContent[currentModal].title}
          >
            {modalContent[currentModal].content}
          </Modal>
        )}
      </div>
    </div>
  )
}

export default App
