export const gameLogic = {
  getPlayerPool: (playerData, difficulty) => {
    const players = Array.isArray(playerData) ? playerData : []
    let filteredPlayers = players

    switch (difficulty) {
      case 'easy':
        filteredPlayers = players.filter(player => Number(player.popularity) >= 8)
        break
      case 'normal':
        filteredPlayers = players.filter(player => Number(player.popularity) >= 5)
        break
      default:
        filteredPlayers = players
    }

    return filteredPlayers.length > 0 ? filteredPlayers : players
  },

  selectRandomPlayer: (playerData, difficulty) => {
    const playerPool = gameLogic.getPlayerPool(playerData, difficulty)
    if (playerPool.length === 0) return null

    const randomIndex = Math.floor(Math.random() * playerPool.length)
    return playerPool[randomIndex]
  },

  processGuess: (guessedPlayer, secretPlayer, columns = defaultColumns) => {
    if (!guessedPlayer || !secretPlayer) return null

    const result = columns.reduce((guessResult, column) => ({
      ...guessResult,
      [column.key]: {
        value: getColumnValue(guessedPlayer, column),
        status: 'wrong',
      },
    }), { isCorrect: false })

    if (guessedPlayer.name === secretPlayer.name) {
      Object.keys(result).forEach(key => {
        if (key !== 'isCorrect') {
          result[key].status = 'correct'
        }
      })
      result.isCorrect = true
      return result
    }

    columns
      .filter(column => column.key !== 'player')
      .forEach(column => {
        result[column.key].status = compareColumn(guessedPlayer, secretPlayer, column)
      })

    return result
  }
}

const defaultColumns = [
  { key: 'player', valueKey: 'name' },
  { key: 'decade', compare: 'number', closeWithin: 20 },
  { key: 'firstYear', compare: 'number', closeWithin: 2 },
  { key: 'numYears', compare: 'number', closeWithin: 2 },
  { key: 'position', compare: 'exact' },
  { key: 'height', compare: 'height', closeWithin: 2 },
  { key: 'number', compare: 'number', closeWithin: 2 },
]

const getColumnValue = (player, column) => player[column.valueKey ?? column.key]

const compareColumn = (guessedPlayer, secretPlayer, column) => {
  const guessedValue = getColumnValue(guessedPlayer, column)
  const secretValue = getColumnValue(secretPlayer, column)

  if (isMissingValue(guessedValue, column) || isMissingValue(secretValue, column)) {
    return 'unknown'
  }

  if (guessedValue === secretValue) return 'correct'

  if (column.compare === 'height') {
    const guessedHeight = heightToInches(guessedValue)
    const secretHeight = heightToInches(secretValue)
    const closeWithin = column.closeWithin ?? 2

    return Math.abs(guessedHeight - secretHeight) <= closeWithin ? 'close' : 'wrong'
  }

  if (column.compare === 'number') {
    const guessedNumber = Number(guessedValue)
    const secretNumber = Number(secretValue)
    const closeWithin = column.closeWithin ?? 0

    if (!Number.isFinite(guessedNumber) || !Number.isFinite(secretNumber)) return 'unknown'

    return Math.abs(guessedNumber - secretNumber) <= closeWithin ? 'close' : 'wrong'
  }

  if (column.compare === 'order') {
    const guessedIndex = column.order?.indexOf(guessedValue) ?? -1
    const secretIndex = column.order?.indexOf(secretValue) ?? -1
    const closeWithin = column.closeWithin ?? 0

    if (guessedIndex === -1 || secretIndex === -1) return 'wrong'

    return Math.abs(guessedIndex - secretIndex) <= closeWithin ? 'close' : 'wrong'
  }

  return 'wrong'
}

const isMissingValue = (value, column) => {
  if (value === null || value === undefined || value === '' || value === 'N/A') return true
  return column.compare === 'height' && Number(value) === 0
}

const heightToInches = (height) => {
  const value = Number(height)
  if (!Number.isFinite(value)) return 0

  const feet = Math.floor(value / 100)
  const inches = value % 100

  return feet * 12 + inches
}
