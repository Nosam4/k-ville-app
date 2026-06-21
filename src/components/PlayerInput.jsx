import { useState, useEffect, useRef, useCallback, useMemo } from 'react'

function PlayerInput({ onPlayerGuess, playerData, difficulty, guesses, disabled }) {
  const [inputValue, setInputValue] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef(null)

  const guessedNames = useMemo(() => new Set(guesses.map(g => g.player.value)), [guesses])

  const getFilteredPlayers = useCallback(() => {
    const availablePlayers = playerData.filter(p => {
      if (guessedNames.has(p.name)) return false
      if (difficulty === 'easy') return p.popularity >= 8
      if (difficulty === 'normal') return p.popularity >= 5
      return true
    })

    return availablePlayers.length > 0
      ? availablePlayers
      : playerData.filter(p => !guessedNames.has(p.name))
  }, [difficulty, guessedNames, playerData])

  useEffect(() => {
    if (inputValue.trim() === '') {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    const filtered = getFilteredPlayers()
      .filter(player => player.name.toLowerCase().includes(inputValue.toLowerCase()))
      .slice(0, 100)

    setSuggestions(filtered)
    setShowSuggestions(filtered.length > 0)
    setSelectedIndex(-1)
  }, [inputValue, getFilteredPlayers])

  const sanitizeInput = (value) => {
    return value.replace(/[^\p{L}\s.'-]/gu, '').slice(0, 40)
  }

  const handleInputChange = (e) => {
    const sanitized = sanitizeInput(e.target.value)
    setInputValue(sanitized)
  }

  const handleInputClick = () => {
    if (disabled) return
    const filtered = getFilteredPlayers().slice(0, 100)
    setSuggestions(filtered)
    setShowSuggestions(true)
  }

  const handleSuggestionClick = (player) => {
    setInputValue(player.name)
    setShowSuggestions(false)
    onPlayerGuess(player.name)
    setInputValue('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault() // Prevent form submit
    }

    if (!showSuggestions) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1))
        break
      case 'Enter':
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          handleSuggestionClick(suggestions[selectedIndex])
        } else if (suggestions.length === 1) {
          handleSuggestionClick(suggestions[0])
        }
        break
      case 'Escape':
        setShowSuggestions(false)
        setSelectedIndex(-1)
        break
    }
  }

  const toggleDropdown = () => {
    if (showSuggestions) {
      setShowSuggestions(false)
    } else {
      const filtered = getFilteredPlayers().slice(0, 100)
      setSuggestions(filtered)
      setShowSuggestions(true)
      inputRef.current?.focus()
    }
  }

  return (
    <div className="mb-8 relative">
      <div className="flex gap-3 mb-3">
        <form onSubmit={(e) => e.preventDefault()} className="flex-1">
          <input
            ref={inputRef}
            type="text"
            placeholder="Select Player"
            value={inputValue}
            onChange={handleInputChange}
            onClick={handleInputClick}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            className="w-full px-5 py-3 text-base rounded-xl bg-white/10 border-2 border-white/30 text-white placeholder-white/60 focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-200 transition"
          />
        </form>
        <button
          type="button"
          onClick={toggleDropdown}
          disabled={disabled}
          aria-label={showSuggestions ? 'Hide player list' : 'Show player list'}
          className="px-5 py-3 text-xl rounded-xl bg-white/10 border-2 border-white/30 text-white hover:bg-white/20 hover:border-white/50 transition"
        >
          {showSuggestions ? '↑' : '↓'}
        </button>
      </div>

      {showSuggestions && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-72 overflow-y-auto bg-white/5 p-3 rounded-xl border border-white/10 shadow-inner">
          {suggestions.map((player, index) => (
            <button
              key={player.name}
              className={`truncate px-4 py-2 text-white rounded-lg border-2 text-sm sm:text-base transition ${
                index === selectedIndex
                  ? 'bg-white/20 border-green-400 font-bold'
                  : 'bg-white/10 border-transparent hover:bg-white/20'
              }`}
              onClick={() => handleSuggestionClick(player)}
            >
              {player.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default PlayerInput
