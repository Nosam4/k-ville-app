function GameSelector({
  sports,
  selectedSportId,
  selectedTeamId,
  onSelectSport,
  onSelectTeam,
}) {
  const selectedSport = sports.find(sport => sport.id === selectedSportId) ?? sports[0]

  return (
    <section className="mb-8 rounded-2xl border border-white/10 bg-white/5 p-5 shadow-xl">
      <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-200">
            K-Ville Games
          </p>
          <h1 className="text-3xl font-extrabold text-white sm:text-4xl">
            Pick a sport and school
          </h1>
        </div>
        <p className="max-w-xl text-sm leading-relaxed text-blue-100 sm:text-base">
          Start with Duke men's basketball today, then drop roster data into each team file as the site grows.
        </p>
      </div>

      <div className="mb-5 grid gap-3 md:grid-cols-3">
        {sports.map(sport => {
          const isSelected = sport.id === selectedSportId

          return (
            <button
              key={sport.id}
              type="button"
              onClick={() => onSelectSport(sport.id)}
              className={`rounded-xl border p-4 text-left transition ${
                isSelected
                  ? 'border-green-400 bg-green-400/15 shadow-lg shadow-green-900/20'
                  : 'border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10'
              }`}
            >
              <div className="text-lg font-bold text-white">{sport.name}</div>
              <div className="mt-1 text-sm leading-snug text-blue-100">{sport.description}</div>
            </button>
          )
        })}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {selectedSport.teams.map(team => {
          const isSelected = team.id === selectedTeamId
          const isAvailable = team.players.length > 0

          return (
            <button
              key={team.id}
              type="button"
              onClick={() => onSelectTeam(team.id)}
              className={`overflow-hidden rounded-xl border text-left transition ${
                isSelected
                  ? 'border-green-400 bg-white/15'
                  : 'border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10'
              }`}
            >
              <div className={`h-2 bg-gradient-to-r ${team.colors}`} />
              <div className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xl font-extrabold text-white">{team.name}</div>
                    <div className="text-sm text-blue-100">{team.nickname}</div>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                      isAvailable
                        ? 'bg-green-400/20 text-green-200'
                        : 'bg-white/10 text-blue-100'
                    }`}
                  >
                    {isAvailable ? `${team.players.length} players` : 'Coming soon'}
                  </span>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}

export default GameSelector
