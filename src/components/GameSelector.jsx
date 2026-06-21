import { useEffect, useMemo, useRef, useState } from 'react'
import { gsap } from 'gsap'

function GameSelector({
  sports,
  selectedSportId,
  selectedTeamId,
  onSelectSport,
  onSelectTeam,
  routePath,
}) {
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false)
  const switcherRef = useRef(null)
  const selectedSport = sports.find(sport => sport.id === selectedSportId) ?? sports[0]
  const selectedTeam = selectedSport.teams.find(team => team.id === selectedTeamId) ?? selectedSport.teams[0]
  const teamOptions = useMemo(() => selectedSport.teams, [selectedSport])

  useEffect(() => {
    if (!isSwitcherOpen || !switcherRef.current) return undefined

    const ctx = gsap.context(() => {
      gsap.fromTo(
        switcherRef.current,
        { autoAlpha: 0, y: -8, scale: 0.98 },
        { autoAlpha: 1, y: 0, scale: 1, duration: 0.28, ease: 'power2.out' },
      )
    }, switcherRef)

    return () => ctx.revert()
  }, [isSwitcherOpen])

  return (
    <section className="mb-6" data-gsap="hero">
      <div className="rounded-[1.75rem] border border-white/10 bg-[#071f4a]/70 p-5 shadow-2xl shadow-black/20 backdrop-blur sm:p-7">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-blue-200/90">
              K-Ville Classic
            </p>
            <h1 className="mt-2 text-4xl font-black tracking-tight text-white sm:text-5xl">
              {selectedTeam.name} {selectedSport.name}
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-blue-100/90">
              A focused roster puzzle for {selectedTeam.nickname} fans. Guess the secret player from clues, history, and a little K-Ville nerve.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col lg:items-end">
            <div className="flex gap-2 text-sm font-bold text-blue-100">
              <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1">
                {selectedTeam.players.length} players
              </span>
              <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1">
                {selectedSport.shortName}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsSwitcherOpen(isOpen => !isOpen)}
              className="rounded-full border border-white/15 bg-white px-5 py-2 text-sm font-extrabold text-[#001a57] shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:bg-blue-50"
              aria-expanded={isSwitcherOpen}
            >
              {isSwitcherOpen ? 'Close selector' : 'Change game'}
            </button>
          </div>
        </div>

        {isSwitcherOpen && (
          <div
            ref={switcherRef}
            className="mt-6 grid gap-4 rounded-2xl border border-white/10 bg-white/[0.08] p-4 sm:grid-cols-2"
          >
            <label className="flex flex-col gap-2 text-sm font-bold text-blue-100">
              School
              <select
                value={selectedTeamId}
                onChange={(event) => onSelectTeam(event.target.value)}
                className="rounded-xl border border-white/10 bg-[#09275a] px-4 py-3 text-base font-semibold text-white outline-none transition focus:border-green-300 focus:ring-2 focus:ring-green-300/30"
              >
                {teamOptions.map(team => (
                  <option key={team.id} value={team.id}>
                    {team.name} — {team.nickname}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm font-bold text-blue-100">
              Sport
              <select
                value={selectedSportId}
                onChange={(event) => onSelectSport(event.target.value)}
                className="rounded-xl border border-white/10 bg-[#09275a] px-4 py-3 text-base font-semibold text-white outline-none transition focus:border-green-300 focus:ring-2 focus:ring-green-300/30"
              >
                {sports.map(sport => (
                  <option key={sport.id} value={sport.id}>
                    {sport.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="sm:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-200/70">
                Shareable route
              </p>
              <p className="mt-1 break-all rounded-xl border border-white/10 bg-black/15 px-4 py-3 font-mono text-sm text-blue-100">
                {routePath}
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

export default GameSelector
