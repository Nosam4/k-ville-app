import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')
const cacheDir = path.join(projectRoot, '.cache', 'sports-reference', 'cbb')

const targets = [
  {
    id: 'unc-men',
    schoolName: 'North Carolina',
    sourceSlug: 'north-carolina',
    genderPath: 'men',
    outputPath: 'src/data/basketball/unc.js',
  },
  {
    id: 'ncsu-men',
    schoolName: 'NC State',
    sourceSlug: 'north-carolina-state',
    genderPath: 'men',
    outputPath: 'src/data/basketball/ncsu.js',
  },
  {
    id: 'duke-women',
    schoolName: 'Duke',
    sourceSlug: 'duke',
    genderPath: 'women',
    outputPath: 'src/data/womens_basketball/duke.js',
  },
  {
    id: 'unc-women',
    schoolName: 'North Carolina',
    sourceSlug: 'north-carolina',
    genderPath: 'women',
    outputPath: 'src/data/womens_basketball/unc.js',
  },
  {
    id: 'ncsu-women',
    schoolName: 'NC State',
    sourceSlug: 'north-carolina-state',
    genderPath: 'women',
    outputPath: 'src/data/womens_basketball/ncsu.js',
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
    startYear: 2026,
    endYear: 1980,
    targets: null,
  }

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]

    if (arg === '--dry-run') {
      parsed.dryRun = true
    } else if (arg === '--delay-ms') {
      parsed.delayMs = Number(args[index + 1])
      index += 1
    } else if (arg === '--start-year') {
      parsed.startYear = Number(args[index + 1])
      index += 1
    } else if (arg === '--end-year') {
      parsed.endYear = Number(args[index + 1])
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

  return parsed
}

async function collectPlayers(target, options) {
  const byPlayer = new Map()
  const step = options.startYear >= options.endYear ? -1 : 1

  for (
    let pageYear = options.startYear;
    step === -1 ? pageYear >= options.endYear : pageYear <= options.endYear;
    pageYear += step
  ) {
    const seasonStart = pageYear - 1
    const url = getSportsReferenceUrl(target, pageYear)
    const page = await getCachedPage(target, pageYear, url, options.delayMs)

    if (page.status === 404) {
      console.log(`${target.id} ${pageYear}: missing`)
      continue
    }

    if (page.status === 403 || page.status === 429) {
      throw new Error(`${target.id} ${pageYear}: Sports Reference returned ${page.status}; stopping to avoid hammering the site.`)
    }

    if (page.status < 200 || page.status >= 300) {
      console.log(`${target.id} ${pageYear}: skipped status ${page.status}`)
      continue
    }

    const rosterRows = parseRosterRows(page.body)
    console.log(`${target.id} ${pageYear}: ${rosterRows.length} roster rows`)

    for (const row of rosterRows) {
      mergePlayerSeason(byPlayer, row, seasonStart)
    }
  }

  return Array.from(byPlayer.values())
    .map(player => toPlayerData(player, Math.max(options.startYear, options.endYear) - 1))
    .filter(player => player.name && player.firstYear)
    .sort((left, right) => left.name.localeCompare(right.name))
}

function getSportsReferenceUrl(target, pageYear) {
  return `https://www.sports-reference.com/cbb/schools/${target.sourceSlug}/${target.genderPath}/${pageYear}.html`
}

async function getCachedPage(target, pageYear, url, delayMs) {
  const cachePath = path.join(cacheDir, `${target.sourceSlug}-${target.genderPath}-${pageYear}.json`)

  try {
    return JSON.parse(await readFile(cachePath, 'utf8'))
  } catch {
    console.log(`Fetching ${url}`)
  }

  const response = await fetch(url, {
    headers: {
      'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'user-agent': 'K-Ville local roster import (personal project; contact via site owner)',
    },
  })
  const body = await response.text()
  const page = {
    fetchedAt: new Date().toISOString(),
    status: response.status,
    url,
    body,
  }

  await writeFile(cachePath, JSON.stringify(page))

  if (delayMs > 0) {
    await wait(delayMs)
  }

  return page
}

function parseRosterRows(html) {
  const table = extractTable(html, 'roster')
  if (!table) return []

  const rows = []
  for (const rowHtml of table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const row = parseCells(rowHtml[1])
    const name = row.player || row.player_name || row.name

    if (!name || name === 'Player') continue

    rows.push({
      hasProLink: /\bsr_(nba|wnba)\b/i.test(rowHtml[0]),
      name,
      number: row.number || row.uniform_number || row.jersey_number || row.no || '',
      position: row.pos || row.position || '',
      height: row.height || row.ht || '',
      rsci: row.rsci || '',
      summary: row.summary || '',
    })
  }

  return rows
}

function extractTable(html, tableId) {
  const tablePattern = new RegExp(`<table[^>]*id=["']${tableId}["'][^>]*>[\\s\\S]*?<\\/table>`, 'i')
  const tableMatch = html.match(tablePattern)
  if (tableMatch) return tableMatch[0]

  const uncommentedHtml = html.replace(/<!--([\s\S]*?)-->/g, '$1')
  return uncommentedHtml.match(tablePattern)?.[0] ?? ''
}

function parseCells(rowHtml) {
  const cells = {}

  for (const cell of rowHtml.matchAll(/<(td|th)\b([^>]*)>([\s\S]*?)<\/\1>/gi)) {
    const attrs = cell[2]
    const rawValue = cleanHtml(cell[3])
    const dataStat = attrs.match(/\bdata-stat=["']([^"']+)["']/i)?.[1]
    const fallbackKey = attrs.match(/\baria-label=["']([^"']+)["']/i)?.[1]
    const key = normalizeKey(dataStat || fallbackKey || '')

    if (key) {
      cells[key] = rawValue
    }
  }

  return cells
}

function mergePlayerSeason(byPlayer, row, seasonStart) {
  const normalizedName = normalizeName(row.name)
  if (!normalizedName) return

  const key = normalizedName.toLowerCase()
  const existing = byPlayer.get(key) ?? {
    name: normalizedName,
    seasons: new Set(),
    positions: [],
    heights: [],
    hasProLink: false,
    numbers: [],
    recruitRanks: [],
    summaries: [],
  }

  existing.seasons.add(seasonStart)
  existing.hasProLink = existing.hasProLink || row.hasProLink

  const position = normalizePosition(row.position)
  if (position) existing.positions.push({ seasonStart, value: position })

  const height = normalizeHeight(row.height)
  if (height) existing.heights.push({ seasonStart, value: height })

  const number = normalizeNumber(row.number)
  if (number !== null) existing.numbers.push({ seasonStart, value: number })

  const recruitRank = normalizeRecruitRank(row.rsci)
  if (recruitRank !== null) existing.recruitRanks.push({ seasonStart, value: recruitRank })

  const summary = normalizeSummary(row.summary)
  if (summary) existing.summaries.push({ seasonStart, ...summary })

  byPlayer.set(key, existing)
}

function toPlayerData(player, currentSeasonStart) {
  const seasons = Array.from(player.seasons).sort((left, right) => left - right)
  const firstYear = seasons[0] ?? 0
  const numYears = seasons.length
  const popularity = calculatePopularity(player, seasons, currentSeasonStart)

  return {
    name: player.name,
    decade: Math.floor(firstYear / 10) * 10,
    firstYear,
    numYears,
    position: mostRecent(player.positions, 'G'),
    height: mostRecent(player.heights, 0),
    number: mostRecent(player.numbers, 0),
    popularity: String(popularity),
    fact: buildFact(player, seasons, currentSeasonStart),
    InstaUsername: '',
    instagram: '',
  }
}

function formatPlayerFile(target, players, options) {
  const sourceYears = `${Math.min(options.startYear, options.endYear)}-${Math.max(options.startYear, options.endYear)}`
  const rows = players.map(player => `  ${JSON.stringify(player)}`).join(',\n')

  return [
    `// Generated from Sports Reference ${target.schoolName} ${target.genderPath} roster pages (${sourceYears}).`,
    '// Popularity and facts are heuristic; Instagram fields require manual verification.',
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

function normalizeKey(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
}

function normalizeName(value) {
  return value
    .replace(/\*/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizePosition(value) {
  const position = value.toUpperCase().replace(/\s+/g, '')

  if (!position) return ''
  if (position.includes('G')) return 'G'
  if (position.includes('F')) return 'F'
  if (position.includes('C')) return 'C'

  if (position.includes('GUARD')) return 'G'
  if (position.includes('FORWARD')) return 'F'
  if (position.includes('CENTER')) return 'C'

  return position[0]
}

function normalizeHeight(value) {
  const match = value.match(/(\d)\s*[-']\s*(\d{1,2})/)
  if (!match) return 0

  const feet = Number(match[1])
  const inches = Number(match[2])
  if (!Number.isFinite(feet) || !Number.isFinite(inches)) return 0

  return feet * 100 + inches
}

function normalizeNumber(value) {
  const number = Number.parseInt(value, 10)
  return Number.isFinite(number) ? number : null
}

function normalizeRecruitRank(value) {
  const match = value.match(/\d+/)
  if (!match) return null

  const rank = Number(match[0])
  return Number.isFinite(rank) ? rank : null
}

function normalizeSummary(value) {
  const cleanValue = value.trim()
  if (!cleanValue) return null

  return {
    assists: readMetric(cleanValue, 'Ast'),
    points: readMetric(cleanValue, 'Pts'),
    rebounds: readMetric(cleanValue, 'Reb'),
    value: cleanValue,
  }
}

function readMetric(summary, label) {
  const match = summary.match(new RegExp(`([0-9]+(?:\\.[0-9]+)?)\\s+${label}\\b`, 'i'))
  return match ? Number(match[1]) : 0
}

function calculatePopularity(player, seasons, currentSeasonStart) {
  const latestSeason = seasons.at(-1) ?? 0
  const isCurrentPlayer = latestSeason === currentSeasonStart
  const bestRank = bestRecruitRank(player)
  const peakSummary = bestSummary(player)
  const peakPoints = peakSummary?.points ?? 0
  const peakRebounds = peakSummary?.rebounds ?? 0
  const peakAssists = peakSummary?.assists ?? 0
  let popularity = 1

  if (seasons.length >= 2) popularity = Math.max(popularity, 3)
  if (seasons.length >= 3) popularity = Math.max(popularity, 4)
  if (seasons.length >= 4) popularity = Math.max(popularity, 5)
  if (peakPoints >= 7) popularity = Math.max(popularity, 4)
  if (peakPoints >= 10) popularity = Math.max(popularity, 5)
  if (peakPoints >= 15) popularity = Math.max(popularity, 7)
  if (peakPoints >= 20) popularity = Math.max(popularity, 8)
  if (bestRank <= 100) popularity = Math.max(popularity, 6)
  if (bestRank <= 50) popularity = Math.max(popularity, 7)
  if (bestRank <= 25) popularity = Math.max(popularity, 8)
  if (player.hasProLink) popularity = Math.max(popularity, 8)
  if (isCurrentPlayer) popularity = Math.max(popularity, 8)

  if (seasons.length >= 4 && peakPoints >= 15) popularity = Math.max(popularity, 8)
  if (seasons.length >= 4 && peakPoints >= 12 && (peakRebounds >= 7 || peakAssists >= 4)) popularity = Math.max(popularity, 8)
  if (player.hasProLink && (peakPoints >= 15 || bestRank <= 50)) popularity = Math.max(popularity, 9)
  if (isCurrentPlayer && (peakPoints >= 10 || bestRank <= 50)) popularity = Math.max(popularity, 9)
  if ((player.hasProLink || isCurrentPlayer) && (peakPoints >= 20 || bestRank <= 25)) popularity = Math.max(popularity, 10)

  return Math.min(popularity, 10)
}

function buildFact(player, seasons, currentSeasonStart) {
  const latestSeason = seasons.at(-1) ?? 0
  const isCurrentPlayer = latestSeason === currentSeasonStart
  const bestRank = bestRecruitRank(player)
  const peakSummary = bestSummary(player)

  if (player.hasProLink && peakSummary) {
    return `Pro-linked player; peak line ${peakSummary.value} (${formatSeason(peakSummary.seasonStart)}).`
  }

  if (player.hasProLink) {
    return 'Pro-linked player on Sports Reference.'
  }

  if (isCurrentPlayer && peakSummary) {
    return `Current roster player; latest line ${peakSummary.value} (${formatSeason(peakSummary.seasonStart)}).`
  }

  if (isCurrentPlayer) {
    return `Current roster player for ${formatSeason(currentSeasonStart)}.`
  }

  if (bestRank < Infinity && peakSummary) {
    return `RSCI Top 100 recruit (#${bestRank}); peak line ${peakSummary.value} (${formatSeason(peakSummary.seasonStart)}).`
  }

  if (bestRank < Infinity) {
    return `RSCI Top 100 recruit (#${bestRank}).`
  }

  if (peakSummary) {
    return `Peak line ${peakSummary.value} (${formatSeason(peakSummary.seasonStart)}).`
  }

  if (seasons.length >= 3) {
    return `Rostered for ${seasons.length} seasons.`
  }

  return 'N/A'
}

function bestRecruitRank(player) {
  if (player.recruitRanks.length === 0) return Infinity

  return Math.min(...player.recruitRanks.map(rank => rank.value))
}

function bestSummary(player) {
  if (player.summaries.length === 0) return null

  return [...player.summaries].sort((left, right) => {
    const leftScore = left.points * 3 + left.rebounds + left.assists
    const rightScore = right.points * 3 + right.rebounds + right.assists

    return rightScore - leftScore
  })[0]
}

function formatSeason(seasonStart) {
  return `${seasonStart}-${String(seasonStart + 1).slice(-2)}`
}

function mostRecent(values, fallback) {
  if (values.length === 0) return fallback

  return [...values].sort((left, right) => right.seasonStart - left.seasonStart)[0].value
}

function wait(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}
