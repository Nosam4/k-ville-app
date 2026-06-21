import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')
const cacheDir = path.join(projectRoot, '.cache', 'official-football')
let globalDraftPicksCache = null
let activeNflPlayersCache = null

const activePlayerLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
const draftRounds = [1, 2, 3, 4, 5, 6, 7]
const nflTeamNames = new Set([
  'Arizona Cardinals',
  'Atlanta Falcons',
  'Baltimore Ravens',
  'Buffalo Bills',
  'Carolina Panthers',
  'Chicago Bears',
  'Cincinnati Bengals',
  'Cleveland Browns',
  'Dallas Cowboys',
  'Denver Broncos',
  'Detroit Lions',
  'Green Bay Packers',
  'Houston Texans',
  'Indianapolis Colts',
  'Jacksonville Jaguars',
  'Kansas City Chiefs',
  'Las Vegas Raiders',
  'Los Angeles Chargers',
  'Los Angeles Rams',
  'Miami Dolphins',
  'Minnesota Vikings',
  'New England Patriots',
  'New Orleans Saints',
  'New York Giants',
  'New York Jets',
  'Philadelphia Eagles',
  'Pittsburgh Steelers',
  'San Francisco 49ers',
  'Seattle Seahawks',
  'Tampa Bay Buccaneers',
  'Tennessee Titans',
  'Washington Commanders',
])

const lookupAliases = {
  mitchtrubisky: ['mitchelltrubisky'],
  mitchelltrubisky: ['mitchtrubisky'],
}

const targets = [
  {
    id: 'duke-football',
    schoolName: 'Duke',
    teamId: 'duke',
    nflCollegeNames: ['Duke'],
    draftUrl: 'https://www.footballdb.com/draft/college.html?c=Duke',
    sourceBaseUrl: 'https://goduke.com/sports/football/roster',
    fallbackBaseUrl: 'https://www.footballdb.com/college-football/teams/fbs/duke/roster',
    statMusePath: 'duke-blue-devils-272',
    outputPath: 'src/data/football/duke.js',
  },
  {
    id: 'unc-football',
    schoolName: 'North Carolina',
    teamId: 'unc',
    nflCollegeNames: ['North Carolina'],
    draftUrl: 'https://www.footballdb.com/draft/college.html?c=North+Carolina',
    sourceBaseUrl: 'https://goheels.com/sports/football/roster',
    fallbackBaseUrl: 'https://www.footballdb.com/college-football/teams/fbs/north-carolina/roster',
    statMusePath: 'north-carolina-tar-heels-665',
    outputPath: 'src/data/football/unc.js',
  },
  {
    id: 'ncsu-football',
    schoolName: 'NC State',
    teamId: 'ncsu',
    nflCollegeNames: ['NC State', 'North Carolina State'],
    draftUrl: 'https://www.footballdb.com/draft/college.html?c=North+Carolina+State',
    sourceBaseUrl: 'https://gopack.com/sports/football/roster',
    fallbackBaseUrl: 'https://www.footballdb.com/college-football/teams/fbs/north-carolina-state/roster',
    statMusePath: 'nc-state-wolfpack-662',
    outputPath: 'src/data/football/ncsu.js',
  },
]

const options = parseArgs(process.argv.slice(2))
const selectedTargets = options.targets
  ? targets.filter(target => options.targets.includes(target.id))
  : targets

if (selectedTargets.length === 0) {
  throw new Error(`No matching targets. Valid targets: ${targets.map(target => target.id).join(', ')}`)
}

await mkdir(cacheDir, { recursive: true })

for (const target of selectedTargets) {
  const players = await collectPlayers(target, options)
  const output = formatPlayerFile(target, players, options)
  const outputPath = path.join(projectRoot, target.outputPath)

  if (options.dryRun) {
    console.log(`[dry-run] ${target.outputPath}: ${players.length} players`)
  } else {
    await writeFile(outputPath, output)
    console.log(`Wrote ${target.outputPath}: ${players.length} players`)
  }
}

function parseArgs(args) {
  const parsed = {
    delayMs: 4000,
    dryRun: false,
    endYear: 2025,
    jitterMs: 1500,
    startYear: 2000,
    targets: null,
  }

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]

    if (arg === '--dry-run') {
      parsed.dryRun = true
    } else if (arg === '--delay-ms') {
      parsed.delayMs = Number(args[index + 1])
      index += 1
    } else if (arg === '--end-year') {
      parsed.endYear = Number(args[index + 1])
      index += 1
    } else if (arg === '--jitter-ms') {
      parsed.jitterMs = Number(args[index + 1])
      index += 1
    } else if (arg === '--start-year') {
      parsed.startYear = Number(args[index + 1])
      index += 1
    } else if (arg === '--targets') {
      parsed.targets = args[index + 1].split(',').map(value => value.trim()).filter(Boolean)
      index += 1
    }
  }

  if (!Number.isInteger(parsed.startYear) || !Number.isInteger(parsed.endYear)) {
    throw new Error('Use integer years for --start-year and --end-year')
  }

  if (!Number.isFinite(parsed.delayMs) || parsed.delayMs < 0) {
    throw new Error('Use a non-negative number for --delay-ms')
  }

  if (!Number.isFinite(parsed.jitterMs) || parsed.jitterMs < 0) {
    throw new Error('Use a non-negative number for --jitter-ms')
  }

  return parsed
}

async function collectPlayers(target, options) {
  const byPlayer = new Map()
  const nflData = await collectNflData(target, options)
  const currentRosterYear = Math.max(options.startYear, options.endYear)
  const step = options.startYear <= options.endYear ? 1 : -1

  for (
    let rosterYear = options.startYear;
    step === 1 ? rosterYear <= options.endYear : rosterYear >= options.endYear;
    rosterYear += step
  ) {
    const page = await getCachedPage(target, rosterYear, options)

    if (!page) {
      console.log(`${target.id} ${rosterYear}: missing`)
      continue
    }

    let rosterRows = parseRosterCards(page)

    if (rosterRows.length < 50 && target.statMusePath) {
      const fallbackPage = await getCachedStatMusePage(target, rosterYear, options)
      const fallbackRows = fallbackPage ? parseStatMuseRows(fallbackPage) : []

      if (fallbackRows.length > rosterRows.length) {
        console.log(`${target.id} ${rosterYear}: using StatMuse fallback ${fallbackRows.length} roster rows`)
        rosterRows = fallbackRows
      }
    }

    if (rosterRows.length < 50 && target.fallbackBaseUrl) {
      const fallbackPage = await getCachedFallbackPage(target, rosterYear, options)
      const fallbackRows = fallbackPage ? parseFootballDbRows(fallbackPage) : []

      if (fallbackRows.length > rosterRows.length) {
        console.log(`${target.id} ${rosterYear}: using fallback ${fallbackRows.length} roster rows`)
        rosterRows = fallbackRows
      }
    }

    console.log(`${target.id} ${rosterYear}: ${rosterRows.length} roster rows`)

    for (const row of rosterRows) {
      mergePlayerSeason(byPlayer, row, rosterYear)
    }
  }

  return Array.from(byPlayer.values())
    .map(player => toPlayerData(player, currentRosterYear, target, nflData))
    .filter(player => player.name && player.firstYear)
    .sort((left, right) => left.name.localeCompare(right.name))
}

async function collectNflData(target, options) {
  const page = await getCachedDraftPage(target, options)
  const schoolDraftPicks = page ? parseDraftPicks(page) : new Map()
  const globalDraftPicks = await collectGlobalDraftPicks(options)
  const activeNflPlayers = await collectActiveNflPlayers(options)

  return {
    active: activeNflPlayers,
    global: globalDraftPicks,
    school: schoolDraftPicks,
  }
}

async function collectGlobalDraftPicks(options) {
  if (globalDraftPicksCache) return globalDraftPicksCache

  const draftPicks = new Map()
  const draftStartYear = Math.max(2000, Math.min(options.startYear, options.endYear))
  const draftEndYear = Math.max(options.startYear, options.endYear) + 1

  for (let draftYear = draftStartYear; draftYear <= draftEndYear; draftYear += 1) {
    for (const draftRound of draftRounds) {
      const page = await getCachedGlobalDraftPage(draftYear, draftRound, options)
      if (!page) continue

      for (const [key, draftPick] of parseGlobalDraftPicks(page, draftYear)) {
        const existing = draftPicks.get(key) ?? []
        draftPicks.set(key, [...existing, draftPick])
      }
    }
  }

  globalDraftPicksCache = draftPicks
  return draftPicks
}

async function collectActiveNflPlayers(options) {
  if (activeNflPlayersCache) return activeNflPlayersCache

  const players = new Map()

  for (const letter of activePlayerLetters) {
    const firstPage = await getCachedActiveNflPlayersPage(letter, 1, options)
    if (!firstPage) continue

    mergeActiveNflPlayers(players, parseActiveNflPlayers(firstPage))

    const pageCount = getActiveNflPageCount(firstPage)
    for (let page = 2; page <= pageCount; page += 1) {
      const nextPage = await getCachedActiveNflPlayersPage(letter, page, options)
      if (!nextPage) continue
      mergeActiveNflPlayers(players, parseActiveNflPlayers(nextPage))
    }
  }

  activeNflPlayersCache = players
  return players
}

function mergeActiveNflPlayers(players, nextPlayers) {
  for (const [key, nextPlayerList] of nextPlayers) {
    const existingPlayerList = players.get(key) ?? []
    players.set(key, [...existingPlayerList, ...nextPlayerList])
  }
}

async function getCachedDraftPage(target, options) {
  const cachePath = path.join(cacheDir, `${target.teamId}-nfl-draft.html`)

  try {
    return await readFile(cachePath, 'utf8')
  } catch {
    console.log(`Fetching ${target.draftUrl}`)
  }

  const response = await fetch(target.draftUrl, {
    headers: {
      'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'user-agent': 'K-Ville local roster import (personal project; contact via site owner)',
    },
  })

  if (response.status === 404) return null

  if (response.status === 403 || response.status === 429) {
    throw new Error(`${target.id}: NFL draft page returned ${response.status}; stopping to avoid hammering the site.`)
  }

  if (response.status < 200 || response.status >= 300) {
    console.log(`${target.id}: skipped NFL draft status ${response.status}`)
    return null
  }

  const body = await response.text()
  await writeFile(cachePath, body)
  await wait(getDelayMs(options))

  return body
}

async function getCachedGlobalDraftPage(draftYear, draftRound, options) {
  const cachePath = path.join(cacheDir, `nfl-draft-${draftYear}-round-${draftRound}.html`)
  const legacyRoundOneCachePath = draftRound === 1 ? path.join(cacheDir, `nfl-draft-${draftYear}.html`) : null

  try {
    return await readFile(cachePath, 'utf8')
  } catch {
    if (legacyRoundOneCachePath) {
      try {
        return await readFile(legacyRoundOneCachePath, 'utf8')
      } catch {
        // Fetch below.
      }
    }

    console.log(`Fetching ${getGlobalDraftUrl(draftYear, draftRound)}`)
  }

  const response = await fetch(getGlobalDraftUrl(draftYear, draftRound), {
    headers: {
      'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'user-agent': 'K-Ville local roster import (personal project; contact via site owner)',
    },
  })

  if (response.status === 404) return null

  if (response.status === 403 || response.status === 429) {
    throw new Error(`NFL draft ${draftYear}: draft page returned ${response.status}; stopping to avoid hammering the site.`)
  }

  if (response.status < 200 || response.status >= 300) {
    console.log(`NFL draft ${draftYear}: skipped status ${response.status}`)
    return null
  }

  const body = await response.text()
  await writeFile(cachePath, body)
  await wait(getDelayMs(options))

  return body
}

async function getCachedActiveNflPlayersPage(letter, page, options) {
  const cachePath = path.join(cacheDir, `nfl-active-${letter.toLowerCase()}-${page}.html`)

  try {
    return await readFile(cachePath, 'utf8')
  } catch {
    console.log(`Fetching ${getActiveNflPlayersUrl(letter, page)}`)
  }

  const response = await fetch(getActiveNflPlayersUrl(letter, page), {
    headers: {
      'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'user-agent': 'K-Ville local roster import (personal project; contact via site owner)',
    },
  })

  if (response.status === 404) return null

  if (response.status === 403 || response.status === 429) {
    throw new Error(`Active NFL players ${letter} page ${page}: returned ${response.status}; stopping to avoid hammering the site.`)
  }

  if (response.status < 200 || response.status >= 300) {
    console.log(`Active NFL players ${letter} page ${page}: skipped status ${response.status}`)
    return null
  }

  const body = await response.text()
  await writeFile(cachePath, body)
  await wait(getDelayMs(options))

  return body
}

async function getCachedPage(target, rosterYear, options) {
  const cachePath = path.join(cacheDir, `${target.teamId}-${rosterYear}.html`)

  try {
    return await readFile(cachePath, 'utf8')
  } catch {
    console.log(`Fetching ${getOfficialRosterUrl(target, rosterYear)}`)
  }

  const response = await fetch(getOfficialRosterUrl(target, rosterYear), {
    headers: {
      'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'user-agent': 'K-Ville local roster import (personal project; contact via site owner)',
    },
  })

  if (response.status === 404) return null

  if (response.status === 403 || response.status === 429) {
    throw new Error(`${target.id} ${rosterYear}: official roster page returned ${response.status}; stopping to avoid hammering the site.`)
  }

  if (response.status < 200 || response.status >= 300) {
    console.log(`${target.id} ${rosterYear}: skipped status ${response.status}`)
    return null
  }

  const body = await response.text()
  await writeFile(cachePath, body)
  await wait(getDelayMs(options))

  return body
}

async function getCachedStatMusePage(target, rosterYear, options) {
  const cachePath = path.join(cacheDir, `${target.teamId}-${rosterYear}-statmuse.html`)

  try {
    return await readFile(cachePath, 'utf8')
  } catch {
    console.log(`Fetching ${getStatMuseRosterUrl(target, rosterYear)}`)
  }

  const response = await fetch(getStatMuseRosterUrl(target, rosterYear), {
    headers: {
      'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'user-agent': 'K-Ville local roster import (personal project; contact via site owner)',
    },
  })

  if (response.status === 404) return null

  if (response.status === 403 || response.status === 429) {
    throw new Error(`${target.id} ${rosterYear}: StatMuse roster page returned ${response.status}; stopping to avoid hammering the site.`)
  }

  if (response.status < 200 || response.status >= 300) {
    console.log(`${target.id} ${rosterYear}: skipped StatMuse status ${response.status}`)
    return null
  }

  const body = await response.text()
  await writeFile(cachePath, body)
  await wait(getDelayMs(options))

  return body
}

async function getCachedFallbackPage(target, rosterYear, options) {
  const cachePath = path.join(cacheDir, `${target.teamId}-${rosterYear}-footballdb.html`)

  try {
    return await readFile(cachePath, 'utf8')
  } catch {
    console.log(`Fetching ${getFootballDbRosterUrl(target, rosterYear)}`)
  }

  const response = await fetch(getFootballDbRosterUrl(target, rosterYear), {
    headers: {
      'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'user-agent': 'K-Ville local roster import (personal project; contact via site owner)',
    },
  })

  if (response.status === 404) return null

  if (response.status === 403 || response.status === 429) {
    throw new Error(`${target.id} ${rosterYear}: fallback roster page returned ${response.status}; stopping to avoid hammering the site.`)
  }

  if (response.status < 200 || response.status >= 300) {
    console.log(`${target.id} ${rosterYear}: skipped fallback status ${response.status}`)
    return null
  }

  const body = await response.text()
  await writeFile(cachePath, body)
  await wait(getDelayMs(options))

  return body
}

function getOfficialRosterUrl(target, rosterYear) {
  return `${target.sourceBaseUrl}/${rosterYear}`
}

function getFootballDbRosterUrl(target, rosterYear) {
  return `${target.fallbackBaseUrl}/${rosterYear}`
}

function getStatMuseRosterUrl(target, rosterYear) {
  return `https://www.statmuse.com/cfb/team/${target.statMusePath}/roster/${rosterYear}`
}

function getGlobalDraftUrl(draftYear, draftRound = 1) {
  return `https://www.footballdb.com/draft/draft.html?lg=NFL&yr=${draftYear}&rnd=${draftRound}`
}

function getActiveNflPlayersUrl(letter, page) {
  const params = new URLSearchParams({ letter })
  if (page > 1) params.set('page', String(page))

  return `https://www.footballdb.com/players/index.html?${params.toString()}`
}

function getDelayMs(options) {
  if (options.delayMs === 0 && options.jitterMs === 0) return 0
  return options.delayMs + Math.floor(Math.random() * (options.jitterMs + 1))
}

function parseRosterCards(html) {
  return html
    .split('<div data-test-id="s-person-card-list__root"')
    .slice(1)
    .map(cardHtml => cleanHtml(`<div data-test-id="s-person-card-list__root"${cardHtml}`))
    .map(parseRosterCardText)
    .filter(Boolean)
}

function parseRosterCardText(text) {
  if (!text.includes('Jersey Number') || !text.includes('Full Bio for')) return null

  const heading = text.match(/^Jersey Number\s+(\d+)\s+(?!Position\b)(.+?)\s+Position\s+/)
  if (!heading) return null

  const number = heading[1]
  const name = heading[2]
  const position = text.match(/\sPosition\s+(.+?)\s+Academic Year\s+/)?.[1] ?? ''
  const classYear = text.match(/\sAcademic Year\s+(.+?)\s+(?:Height|Weight)\s+/)?.[1] ?? ''
  const height = text.match(/\sHeight\s+(.+?)\s+Weight\s+/)?.[1] ?? text.match(/\sCustom Field 1\s+(.+?)\s+Hometown\s+/)?.[1] ?? ''
  const hometown = text.match(/\sHometown\s+(.+?)\s+Last School\s+/)?.[1] ?? ''
  const highSchool = text.match(/\sLast School\s+(.+?)\s+Full Bio for\s+/)?.[1] ?? ''

  if (!name || !position) return null

  return {
    classYear,
    height,
    highSchool,
    hometown,
    name,
    number,
    position,
  }
}

function parseFootballDbRows(html) {
  const table = html.match(/<table\b[^>]*class=["'][^"']*statistics[^"']*["'][^>]*>[\s\S]*?<\/table>/i)?.[0]
  if (!table) return []

  const rows = []
  for (const rowMatch of table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = Array.from(rowMatch[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi), cell => cleanHtml(cell[1]))
    if (cells.length < 6) continue

    const rawHometown = cells[6] ?? ''
    const hometown = rawHometown.replace(/\s*\([^)]*\)\s*$/, '').trim()
    const highSchool = rawHometown.match(/\(([^)]*)\)\s*$/)?.[1] ?? ''

    rows.push({
      classYear: cells[3] ?? '',
      height: cells[4] ?? '',
      highSchool,
      hometown,
      name: normalizeFootballDbName(cells[1] ?? ''),
      number: cells[0] ?? '',
      position: cells[2] ?? '',
    })
  }

  return rows
}

function parseDraftPicks(html) {
  const table = html.match(/<table\b[^>]*class=["'][^"']*statistics[^"']*["'][^>]*>[\s\S]*?<\/table>/i)?.[0]
  const draftPicks = new Map()
  if (!table) return draftPicks

  for (const rowMatch of table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = Array.from(rowMatch[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi), cell => cleanHtml(cell[1]))
    if (cells.length < 6) continue

    const year = cells[0].match(/\d{4}/)?.[0] ?? ''
    const round = cells[1]
    const pick = cells[2]
    const team = cells[3]
    const name = normalizeName(cells[4])
    const position = cells[5]
    const key = normalizeLookupName(name)

    if (!year || !name || !key) continue

    const draftPick = { name, pick, position, round, team, year }
    const existing = draftPicks.get(key)

    if (!existing || isBetterDraftPick(draftPick, existing)) {
      draftPicks.set(key, draftPick)
    }
  }

  return draftPicks
}

function parseGlobalDraftPicks(html, draftYear) {
  const table = html.match(/<table\b[^>]*class=["'][^"']*statistics[^"']*["'][^>]*>[\s\S]*?<\/table>/i)?.[0]
  const draftPicks = new Map()
  if (!table) return draftPicks

  for (const rowMatch of table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = Array.from(rowMatch[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi), cell => cleanHtml(cell[1]))
    if (cells.length < 6) continue

    const round = cells[0].match(/\d+/)?.[0] ?? ''
    const pick = cells[1]
    const team = cells[2]
    const name = normalizeName(cells[3])
    const position = cells[4]
    const college = cells[5]
    const key = normalizeLookupName(name)

    if (!round || !pick || !name || !key) continue

    const draftPick = { college, name, pick, position, round, team, year: String(draftYear) }
    const existing = draftPicks.get(key)

    if (!existing || isBetterDraftPick(draftPick, existing)) {
      draftPicks.set(key, draftPick)
    }
  }

  return draftPicks
}

function parseActiveNflPlayers(html) {
  const table = html.match(/<table\b[^>]*class=["'][^"']*statistics[^"']*["'][^>]*>[\s\S]*?<\/table>/i)?.[0]
  const players = new Map()
  if (!table) return players

  for (const rowMatch of table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = Array.from(rowMatch[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi), cell => cleanHtml(cell[1]))
    if (cells.length < 4) continue

    const name = normalizeFootballDbName(cells[0] ?? '')
    const position = cells[1] ?? ''
    const team = cells[2] ?? ''
    const college = cells[3] ?? ''
    const key = getCollegePlayerLookupKey(college, name)

    if (!name || !key || !nflTeamNames.has(team)) continue

    const activePlayer = { college, name, position, team }
    const existingPlayers = players.get(key) ?? []
    players.set(key, [...existingPlayers, activePlayer])
  }

  return players
}

function getActiveNflPageCount(html) {
  const pageCount = cleanHtml(html).match(/\b\d+\s+of\s+(\d+)\b/)?.[1]

  return Number.parseInt(pageCount ?? '1', 10)
}

function isBetterDraftPick(next, current) {
  const nextPick = Number(next.pick)
  const currentPick = Number(current.pick)

  if (Number.isFinite(nextPick) && Number.isFinite(currentPick)) return nextPick < currentPick
  if (Number.isFinite(nextPick)) return true

  return false
}

function parseStatMuseRows(html) {
  const decodedHtml = decodeHtml(html)
  const rowPattern = /"NO\.":\[0,([\s\S]*?)\],"NAME":\[0,([\s\S]*?)\],"POS":\[0,([\s\S]*?)\],"HEIGHT":\[0,([\s\S]*?)\],"WEIGHT":\[0,([\s\S]*?)\],"CLASS":\[0,([\s\S]*?)\],"BIRTHPLACE":\[0,([\s\S]*?)\]\}/g
  const rows = []

  for (const match of decodedHtml.matchAll(rowPattern)) {
    rows.push({
      classYear: readSerializedDisplay(match[6]),
      height: readSerializedDisplay(match[4]),
      highSchool: '',
      hometown: readSerializedDisplay(match[7]),
      name: readSerializedDisplay(match[2]),
      number: readSerializedDisplay(match[1]),
      position: readSerializedDisplay(match[3]),
    })
  }

  return rows.filter(row => row.name && row.position)
}

function readSerializedDisplay(value) {
  const match = value.match(/"display":\[0,"((?:\\.|[^"])*)"\]/)
  if (!match) return ''

  try {
    return JSON.parse(`"${match[1]}"`)
  } catch {
    return match[1]
  }
}

function normalizeFootballDbName(value) {
  const name = normalizeName(value)
  if (!name.includes(',')) return name

  const [lastName, ...rest] = name.split(',').map(part => part.trim()).filter(Boolean)
  return [...rest, lastName].join(' ')
}

function mergePlayerSeason(byPlayer, row, rosterYear) {
  const name = normalizeName(row.name)
  if (!name) return

  const position = normalizePosition(row.position)
  if (position === 'N/A') return

  const key = name.toLowerCase()
  const existing = byPlayer.get(key) ?? {
    name,
    seasons: new Set(),
    classYears: [],
    heights: [],
    highSchools: [],
    hometowns: [],
    numbers: [],
    positions: [],
    units: [],
  }

  existing.seasons.add(rosterYear)
  existing.positions.push({ rosterYear, value: position })
  existing.units.push({ rosterYear, value: normalizeUnit(position) })

  const classYear = normalizeClassYear(row.classYear)
  if (classYear !== 'N/A') existing.classYears.push({ rosterYear, value: classYear })

  const height = normalizeHeight(row.height)
  if (height !== null) existing.heights.push({ rosterYear, value: height })

  const number = normalizeNumber(row.number)
  if (number !== null) existing.numbers.push({ rosterYear, value: number })

  const hometown = normalizePlace(row.hometown)
  if (hometown) existing.hometowns.push({ rosterYear, value: hometown })

  const highSchool = normalizePlace(row.highSchool)
  if (highSchool) existing.highSchools.push({ rosterYear, value: highSchool })

  byPlayer.set(key, existing)
}

function toPlayerData(player, currentYear, target, nflData) {
  const seasons = Array.from(player.seasons).sort((left, right) => left - right)
  const firstYear = seasons[0] ?? 0
  const latestYear = seasons.at(-1) ?? 0
  const numYears = seasons.length
  const classYear = mostRecent(player.classYears, 'N/A')
  const unit = mostRecent(player.units, 'N/A')
  const position = mostRecent(player.positions, 'N/A')
  const height = mostRecent(player.heights, null)
  const number = mostRecent(player.numbers, null)
  const hometown = mostRecent(player.hometowns, '')
  const highSchool = mostRecent(player.highSchools, '')
  const nflDraft = findNflDraftPick(nflData, player.name, firstYear, latestYear, position)
  const activeNflPlayer = findActiveNflPlayer(nflData, target, player.name, latestYear, currentYear, position)

  return {
    name: player.name,
    decade: Math.floor(firstYear / 10) * 10,
    firstYear,
    numYears,
    unit,
    position,
    height,
    number,
    popularity: String(calculatePopularity({ activeNflPlayer, latestYear, nflDraft, numYears }, currentYear)),
    fact: buildFact({
      activeNflPlayer,
      classYear,
      currentYear,
      firstYear,
      highSchool,
      hometown,
      latestYear,
      nflDraft,
      numYears,
      position,
      schoolName: target.schoolName,
      unit,
    }),
    InstaUsername: '',
    instagram: '',
  }
}

function findNflDraftPick(nflData, playerName, firstYear, latestYear, position) {
  const lookupKeys = getLookupKeys(playerName)
  const schoolPick = findBestDraftPick(findDraftPicksByKeys(nflData.school, lookupKeys))

  if (schoolPick) return schoolPick

  return findBestDraftPick(
    findDraftPicksByKeys(nflData.global, lookupKeys)
      .filter(draftPick => isPlausibleDraftYear(draftPick.year, firstYear, latestYear))
      .filter(draftPick => isCompatibleDraftPosition(draftPick.position, position))
  )
}

function findActiveNflPlayer(nflData, target, playerName, latestYear, currentYear, position) {
  if (latestYear < currentYear - 15) return null

  const lookupKeys = getLookupKeys(playerName)
  const collegeKeys = (target.nflCollegeNames ?? [target.schoolName]).map(normalizeCollegeKey)

  for (const collegeKey of collegeKeys) {
    for (const lookupKey of lookupKeys) {
      const activePlayers = nflData.active.get(`${collegeKey}:${lookupKey}`) ?? []
      const activePlayer = activePlayers.find(player => isCompatibleDraftPosition(player.position, position))

      if (activePlayer) return activePlayer
    }
  }

  return null
}

function findDraftPicksByKeys(draftPicks, lookupKeys) {
  const matches = []

  for (const lookupKey of lookupKeys) {
    const draftPick = draftPicks.get(lookupKey)
    if (Array.isArray(draftPick)) {
      matches.push(...draftPick)
    } else if (draftPick) {
      matches.push(draftPick)
    }
  }

  return matches
}

function findBestDraftPick(draftPicks) {
  return draftPicks.reduce((bestPick, draftPick) => {
    if (!bestPick || isBetterDraftPick(draftPick, bestPick)) return draftPick
    return bestPick
  }, null)
}

function getLookupKeys(playerName) {
  const lookupKey = normalizeLookupName(playerName)
  const aliasKeys = lookupAliases[lookupKey] ?? []

  return [...new Set([lookupKey, ...aliasKeys].filter(Boolean))]
}

function getCollegePlayerLookupKey(college, playerName) {
  const collegeKey = normalizeCollegeKey(college)
  const playerKey = normalizeLookupName(playerName)

  if (!collegeKey || !playerKey) return ''

  return `${collegeKey}:${playerKey}`
}

function normalizeCollegeKey(value) {
  return normalizeName(value)
    .toLowerCase()
    .replace(/\bst\b\.?/g, 'state')
    .replace(/[^a-z0-9]+/g, '')
}

function isPlausibleDraftYear(draftYear, firstYear, latestYear) {
  const year = Number(draftYear)
  if (!Number.isFinite(year)) return false

  return year >= firstYear && year <= latestYear + 3
}

function isCompatibleDraftPosition(draftPosition, rosterPosition) {
  const normalizedDraftPosition = normalizePosition(draftPosition)

  if (normalizedDraftPosition === 'N/A' || rosterPosition === 'N/A') return true

  return normalizedDraftPosition === rosterPosition
}

function calculatePopularity(player, currentYear) {
  let popularity = 1

  if (player.numYears >= 2) popularity = Math.max(popularity, 3)
  if (player.numYears >= 3) popularity = Math.max(popularity, 4)
  if (player.numYears >= 4) popularity = Math.max(popularity, 5)
  if (player.latestYear === currentYear) popularity = Math.max(popularity, 8)
  if (player.activeNflPlayer) popularity = Math.max(popularity, 9)

  if (player.nflDraft) {
    const round = Number(player.nflDraft.round)
    const pick = Number(player.nflDraft.pick)

    popularity = Math.max(popularity, 8)
    if (round <= 3 || pick <= 100) popularity = Math.max(popularity, 9)
    if (round === 1 || pick <= 32) popularity = Math.max(popularity, 10)
  }

  return popularity
}

function buildFact(player) {
  const rosterSpan = player.numYears === 1
    ? `Rostered in ${player.firstYear}`
    : `Rostered ${player.firstYear}-${player.latestYear}`
  const details = [
    player.nflDraft ? formatDraftFact(player.nflDraft) : '',
    player.activeNflPlayer ? formatActiveNflFact(player.activeNflPlayer) : '',
    player.latestYear === player.currentYear && !player.nflDraft && !player.activeNflPlayer ? 'Current roster player' : '',
    player.latestYear === player.currentYear && player.classYear !== 'N/A' ? player.classYear : '',
    player.unit !== 'N/A' && player.position !== 'N/A' ? `${player.unit} ${player.position}` : player.position,
    player.hometown,
  ].filter(Boolean)
  const fact = [rosterSpan, ...details].join(' • ')

  if (fact) return /[.!?]$/.test(fact) ? fact : `${fact}.`

  return `Football roster player for ${player.schoolName}.`
}

function formatDraftFact(draftPick) {
  const pick = Number.isFinite(Number(draftPick.pick)) ? `, Pick ${draftPick.pick}` : ''
  return `NFL Draft pick (${draftPick.year}, Round ${draftPick.round}${pick})`
}

function formatActiveNflFact(activeNflPlayer) {
  return `Current NFL player (${activeNflPlayer.team})`
}

function mostRecent(values, fallback) {
  if (values.length === 0) return fallback

  return [...values].sort((left, right) => right.rosterYear - left.rosterYear)[0].value
}

function formatPlayerFile(target, players, options) {
  const sourceYears = `${Math.min(options.startYear, options.endYear)}-${Math.max(options.startYear, options.endYear)}`
  const rows = players.map(player => `  ${JSON.stringify(player)}`).join(',\n')

  return [
    `// Generated from ${target.schoolName}'s official football roster pages (${sourceYears}) and FootballDB NFL Draft/current player data.`,
    '// Position means football position group; Instagram fields require manual verification.',
    'export const playerData = [',
    rows,
    ']',
    '',
  ].join('\n')
}

function cleanHtml(value) {
  return decodeHtml(value)
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function decodeHtml(value) {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
}

function normalizeName(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\*/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeLookupName(value) {
  return normalizeName(value)
    .toLowerCase()
    .replace(/\b(jr|sr|ii|iii|iv|v)\b\.?/g, '')
    .replace(/[^a-z0-9]+/g, '')
}

function normalizeClassYear(value) {
  const classYear = value.toUpperCase().replace(/\./g, '').replace(/[^A-Z0-9]+/g, ' ').trim()
  if (!classYear) return 'N/A'
  if (/\b(POST BACC|GR|GS|5TH)\b/.test(classYear)) return 'GR'
  if (/\b(R SR|SR)\b/.test(classYear) || /SENIOR/.test(classYear)) return 'SR'
  if (/\b(R JR|JR)\b/.test(classYear) || /JUNIOR/.test(classYear)) return 'JR'
  if (/\b(R SO|SO)\b/.test(classYear) || /SOPHOMORE/.test(classYear)) return 'SO'
  if (/\b(R FR|FR)\b/.test(classYear) || /FRESHMAN/.test(classYear)) return 'FR'

  return classYear
}

function normalizePosition(value) {
  const position = value.toUpperCase().replace(/\./g, '').replace(/\s+/g, ' ').trim()
  const compactPosition = position.replace(/[^A-Z/]+/g, '')
  const tokens = compactPosition.split('/').filter(Boolean)
  const tokenGroups = {
    B: 'RB',
    C: 'OL',
    CB: 'DB',
    DB: 'DB',
    DE: 'DL',
    DS: 'LS',
    DT: 'DL',
    FB: 'RB',
    FS: 'DB',
    G: 'OL',
    H: 'K/P',
    HB: 'RB',
    ILB: 'LB',
    K: 'K',
    LB: 'LB',
    LG: 'OL',
    LS: 'LS',
    LT: 'OL',
    MLB: 'LB',
    N: 'DL',
    NB: 'DB',
    NG: 'DL',
    NIC: 'DB',
    NT: 'DL',
    OG: 'OL',
    OL: 'OL',
    OLB: 'LB',
    OT: 'OL',
    P: 'P',
    PK: 'K',
    QB: 'QB',
    RB: 'RB',
    RG: 'OL',
    RT: 'OL',
    S: 'DB',
    SAF: 'DB',
    SS: 'DB',
    T: 'OL',
    TB: 'RB',
    TE: 'TE',
    WR: 'WR',
  }

  for (const token of tokens) {
    if (tokenGroups[token]) return tokenGroups[token]
  }

  if (position.includes('QUARTERBACK')) return 'QB'
  if (compactPosition.includes('CAPTAIN')) return 'OL'
  if (['ATH', 'ATHLETE'].includes(compactPosition)) return 'N/A'
  if (position.includes('TAILBACK') || position.includes('RUNNING BACK') || position.includes('FULLBACK')) return 'RB'
  if (position.includes('WIDE RECEIVER') || compactPosition.includes('WIDERECEIVER') || compactPosition.includes('WIDERECIEVER')) return 'WR'
  if (position.includes('TIGHT END') || compactPosition === 'HBACK') return 'TE'
  if (
    position.includes('OFFENSIVE LINE') ||
    position.includes('OFFENSIVE TACKLE') ||
    position.includes('OFFENSIVE GUARD') ||
    position.includes('CENTER')
  ) return 'OL'
  if (
    position.includes('LINEBACKER') ||
    ['BANDIT', 'JACK', 'RUSH'].includes(compactPosition)
  ) return 'LB'
  if (
    position.includes('DEFENSIVE BACK') ||
    position.includes('CORNER') ||
    position.includes('SAFETY') ||
    compactPosition === 'RAM'
  ) return 'DB'
  if (
    position.includes('DEFENSIVE LINE') ||
    position.includes('DEFENSIVE END') ||
    position.includes('DEFENSIVE TACKLE') ||
    position.includes('NOSE') ||
    ['EDGE', 'RUE'].includes(compactPosition)
  ) return 'DL'
  if (position.includes('DEEP SNAPPER') || position.includes('LONG SNAPPER') || compactPosition === 'DEEPSNAPPER') return 'LS'
  if (compactPosition === 'K/P') return 'K/P'
  if (position.includes('PUNTER') || compactPosition === 'P') return 'P'
  if (position.includes('KICKER') || ['K', 'PK'].includes(compactPosition)) return 'K'

  return compactPosition || 'N/A'
}

function normalizeUnit(position) {
  if (['QB', 'RB', 'WR', 'TE', 'OL'].includes(position)) return 'Offense'
  if (['DL', 'LB', 'DB'].includes(position)) return 'Defense'
  if (['K', 'P', 'LS', 'K/P'].includes(position)) return 'Special Teams'

  return 'N/A'
}

function normalizeHeight(value) {
  const match = value.match(/(\d)\s*[-']\s*(\d{1,2})/)
  if (!match) return null

  const feet = Number(match[1])
  const inches = Number(match[2])
  if (!Number.isFinite(feet) || !Number.isFinite(inches)) return null

  return feet * 100 + inches
}

function normalizeNumber(value) {
  const number = Number.parseInt(value, 10)
  return Number.isFinite(number) ? number : null
}

function normalizePlace(value) {
  return value.replace(/\s+/g, ' ').trim()
}

function wait(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}
