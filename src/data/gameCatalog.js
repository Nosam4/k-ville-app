import { playerData as dukeBasketballPlayers } from './basketball/duke'
import { playerData as ncsuBasketballPlayers } from './basketball/ncsu'
import { playerData as uncBasketballPlayers } from './basketball/unc'
import { playerData as dukeWomensBasketballPlayers } from './womens_basketball/duke'
import { playerData as ncsuWomensBasketballPlayers } from './womens_basketball/ncsu'
import { playerData as uncWomensBasketballPlayers } from './womens_basketball/unc'
import { playerData as dukeFootballPlayers } from './football/duke'
import { playerData as ncsuFootballPlayers } from './football/ncsu'
import { playerData as uncFootballPlayers } from './football/unc'

const basketballColumns = [
  { key: 'player', label: 'Player', valueKey: 'name' },
  { key: 'decade', label: 'Decade', compare: 'number', closeWithin: 20 },
  { key: 'firstYear', label: 'First Year', shortLabel: 'Start', compare: 'number', closeWithin: 2 },
  { key: 'numYears', label: '# of Years', shortLabel: 'Yrs', compare: 'number', closeWithin: 2 },
  { key: 'position', label: 'Position', shortLabel: 'Pos', compare: 'exact' },
  { key: 'height', label: 'Height', shortLabel: 'Ht', compare: 'height', closeWithin: 2, format: 'height' },
  { key: 'number', label: 'Number', shortLabel: '#', compare: 'number', closeWithin: 2 },
]

const footballColumns = [
  { key: 'player', label: 'Player', valueKey: 'name' },
  { key: 'decade', label: 'Decade', compare: 'number', closeWithin: 20 },
  { key: 'firstYear', label: 'First Year', shortLabel: 'Start', compare: 'number', closeWithin: 2 },
  { key: 'numYears', label: '# of Years', shortLabel: 'Yrs', compare: 'number', closeWithin: 2 },
  { key: 'unit', label: 'Unit', compare: 'exact' },
  { key: 'position', label: 'Position', shortLabel: 'Pos', compare: 'exact' },
  { key: 'height', label: 'Height', shortLabel: 'Ht', compare: 'height', closeWithin: 2, format: 'height' },
  { key: 'number', label: 'Number', shortLabel: '#', compare: 'number', closeWithin: 2 },
]

const teams = {
  duke: {
    id: 'duke',
    slug: 'duke',
    name: 'Duke',
    nickname: 'Blue Devils',
    colors: 'from-[#001a57] to-[#003d82]',
  },
  ncsu: {
    id: 'ncsu',
    slug: 'north-carolina-state',
    name: 'NC State',
    nickname: 'Wolfpack',
    colors: 'from-[#CC0000] to-[#7A0000]',
  },
  unc: {
    id: 'unc',
    slug: 'north-carolina',
    name: 'UNC',
    nickname: 'Tar Heels',
    colors: 'from-[#4B9CD3] to-[#13294B]',
  },
}

const withPlayers = (teamId, players) => ({
  ...teams[teamId],
  players,
})

export const GAME_CATALOG = [
  {
    id: 'basketball',
    slug: 'mens-basketball',
    name: "Men's Basketball",
    shortName: 'Basketball',
    description: 'Guess players by era, position, height, and jersey number.',
    columns: basketballColumns,
    teams: [
      withPlayers('duke', dukeBasketballPlayers),
      withPlayers('ncsu', ncsuBasketballPlayers),
      withPlayers('unc', uncBasketballPlayers),
    ],
  },
  {
    id: 'womens_basketball',
    slug: 'womens-basketball',
    name: "Women's Basketball",
    shortName: "Women's Basketball",
    description: 'The same guessing format for college hoops legends.',
    columns: basketballColumns,
    teams: [
      withPlayers('duke', dukeWomensBasketballPlayers),
      withPlayers('ncsu', ncsuWomensBasketballPlayers),
      withPlayers('unc', uncWomensBasketballPlayers),
    ],
  },
  {
    id: 'football',
    slug: 'football',
    name: 'Football',
    shortName: 'Football',
    description: 'Guess players by era, unit, position, height, and jersey number.',
    columns: footballColumns,
    teams: [
      withPlayers('duke', dukeFootballPlayers),
      withPlayers('ncsu', ncsuFootballPlayers),
      withPlayers('unc', uncFootballPlayers),
    ],
  },
]
