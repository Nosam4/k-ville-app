const defaultColumns = [
  { key: 'player', label: 'Player' },
  { key: 'decade', label: 'Decade' },
  { key: 'firstYear', label: 'First Year', shortLabel: 'Start' },
  { key: 'numYears', label: '# of Years', shortLabel: 'Yrs' },
  { key: 'position', label: 'Position', shortLabel: 'Pos' },
  { key: 'height', label: 'Height', shortLabel: 'Ht', format: 'height' },
  { key: 'number', label: 'Number', shortLabel: '#' },
]

function GuessTable({ guesses, colorBlindMode, columns = defaultColumns }) {
  const maxGuesses = 6

  const formatHeight = (height) => {
    const value = Number(height)
    if (!Number.isFinite(value) || value === 0) return 'N/A'

    const feet = Math.floor(value / 100)
    const inches = value % 100

    return `${feet}'${inches.toString().padStart(2, '0')}"`
  }

  const formatValue = (column, value) => {
    if (value === null || value === undefined || value === '') return 'N/A'
    if (column.format === 'height') return formatHeight(value)

    return value
  }

  const getCellClass = (value) => {
    if (!value) return ''
  
    if (colorBlindMode) {
      switch (value.status) {
        case 'correct': return 'bg-[#785EF0]/30 text-[#785EF0] font-extrabold text-shadow'
        case 'close': return 'bg-[#FFB000]/30 text-[#FFB000] font-extrabold text-shadow'
        case 'wrong': return 'bg-[#DC267F]/30 text-[#DC267F] font-extrabold text-shadow'
        default: return ''
      }
    } else {
      switch (value.status) {
        case 'correct': return 'bg-green-400/30 text-green-400 font-bold'
        case 'close': return 'bg-yellow-400/30 text-yellow-400 font-bold'
        case 'wrong': return 'bg-red-400/30 text-red-400'
        default: return ''
      }
    }
  }  

  const renderGuessRow = (guess, index) => {
    const cellBase =
      'px-1 py-1 text-center border-b border-white/10 text-xs sm:text-sm md:text-base lg:text-lg font-medium whitespace-nowrap'

    if (!guess) {
      return (
        <tr key={index}>
          {columns.map(column => (
            <td key={column.key} className={cellBase}></td>
          ))}
        </tr>
      )
    }

    return (
      <tr key={index}>
        {columns.map(column => (
          <td key={column.key} className={`${cellBase} ${getCellClass(guess[column.key])}`}>
            {formatValue(column, guess[column.key]?.value)}
          </td>
        ))}
      </tr>
    )
  }

  return (
    <div className="mb-8 overflow-x-auto rounded-xl shadow-xl">
      <table className="w-full min-w-[720px] table-fixed border-collapse bg-white/5 text-xs sm:text-sm md:text-base lg:text-lg">
        <thead>
          <tr className="bg-blue-900/80 text-white text-center">
            {columns.map(column => (
              <th key={column.key} className="px-1 py-2 border-b-2 border-white/20 whitespace-nowrap">
                <span className="block sm:hidden">{column.shortLabel ?? column.label}</span>
                <span className="hidden sm:block">{column.label}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: maxGuesses }, (_, index) =>
            renderGuessRow(guesses[index], index)
          )}
        </tbody>
      </table>
    </div>
  )
}

export default GuessTable
