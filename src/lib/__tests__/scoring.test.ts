import { computeGpScore, validateAuctionBid, validateTrade } from '../scoring'
import { DEFAULT_SCORING_RULES } from '../utils'
import type { GpResultsData, GpPredictions } from '../types'

const rules = DEFAULT_SCORING_RULES

const mockResults: GpResultsData = {
  qualifying_order: [
    { driver_id: 'VER', position: 1 },
    { driver_id: 'HAM', position: 2 },
    { driver_id: 'LEC', position: 3 },
    { driver_id: 'NOR', position: 4 },
  ],
  race_order: [
    { driver_id: 'HAM', position: 1, fastest_lap: true },
    { driver_id: 'LEC', position: 2 },
    { driver_id: 'VER', position: 3 },
    { driver_id: 'NOR', position: 4, dnf: true },
  ],
}

describe('computeGpScore', () => {
  it('calculates basic driver points correctly', () => {
    const roster = ['VER', 'HAM', 'LEC', 'NOR']
    const captain = 'HAM'
    const predictions: GpPredictions = {}

    const score = computeGpScore(roster, captain, mockResults, rules, predictions)

    const hamDriver = score.drivers.find(d => d.driver_id === 'HAM')!
    expect(hamDriver.qualifying_pts).toBe(9)
    expect(hamDriver.race_pts).toBe(25)
    expect(hamDriver.fastest_lap_pts).toBe(2)
    expect(hamDriver.subtotal).toBe((9 + 25 + 2) * 2)
  })

  it('applies DNF malus correctly', () => {
    const roster = ['NOR']
    const score = computeGpScore(roster, 'VER', mockResults, rules, {})
    const norDriver = score.drivers.find(d => d.driver_id === 'NOR')!
    expect(norDriver.race_pts).toBe(rules.dnf)
    expect(norDriver.race_pts).toBe(-5)
  })

  it('awards prediction points for correct pole', () => {
    const roster = ['VER', 'HAM', 'LEC', 'NOR']
    const predictions: GpPredictions = { pole_driver_id: 'VER' }
    const score = computeGpScore(roster, 'VER', mockResults, rules, predictions)
    expect(score.predictions_pts).toBeGreaterThanOrEqual(rules.predictions.pole)
  })

  it('awards prediction points for correct winner', () => {
    const roster = ['VER', 'HAM', 'LEC', 'NOR']
    const predictions: GpPredictions = { winner_driver_id: 'HAM' }
    const score = computeGpScore(roster, 'VER', mockResults, rules, predictions)
    expect(score.predictions_pts).toBe(rules.predictions.winner)
  })

  it('does not award predictions for wrong guesses', () => {
    const roster = ['VER', 'HAM', 'LEC', 'NOR']
    const predictions: GpPredictions = { pole_driver_id: 'NOR', winner_driver_id: 'LEC' }
    const score = computeGpScore(roster, 'VER', mockResults, rules, predictions)
    expect(score.predictions_pts).toBe(0)
  })
})

describe('validateAuctionBid', () => {
  it('rejects bid lower than current', () => {
    const result = validateAuctionBid(5, 10, 100, 2, 4, 200)
    expect(result.valid).toBe(false)
  })

  it('rejects bid exceeding credits', () => {
    const result = validateAuctionBid(50, 10, 30, 2, 4, 200)
    expect(result.valid).toBe(false)
  })

  it('rejects bid leaving insufficient reserve', () => {
    const result = validateAuctionBid(99, 10, 100, 1, 4, 200)
    expect(result.valid).toBe(false)
  })

  it('accepts valid bid', () => {
    const result = validateAuctionBid(20, 10, 100, 2, 4, 200)
    expect(result.valid).toBe(true)
  })
})

describe('validateTrade', () => {
  it('rejects trade when proposer lacks credits for adjustment', () => {
    const result = validateTrade(5, 100, 20)
    expect(result.valid).toBe(false)
  })

  it('accepts trade with valid credit adjustment', () => {
    const result = validateTrade(50, 50, 10)
    expect(result.valid).toBe(true)
  })

  it('accepts trade with no credit adjustment', () => {
    const result = validateTrade(50, 50, 0)
    expect(result.valid).toBe(true)
  })
})
