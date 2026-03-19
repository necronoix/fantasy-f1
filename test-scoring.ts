/**
 * Scoring Algorithm Test Suite
 * Tests computeGpScore and computeTeamScore with realistic scenarios
 */

import type { GpResultsData, ScoringRulesData, GpPredictions, ScoreBreakdown } from './src/lib/types'

// Copy of scoring functions for testing (since we can't easily import from Next.js server code)
function computeTeamScore(
  teamId: string,
  teamDriverIds: string[],
  results: GpResultsData,
  rules: ScoringRulesData
): number {
  let teamScore = 0

  for (const driverId of teamDriverIds) {
    const qualPos = results.qualifying_order.find(q => q.driver_id === driverId)?.position
    const qualPts = qualPos ? (rules.qualifying[String(qualPos)] ?? 0) : 0

    const raceResult = results.race_order.find(r => r.driver_id === driverId)
    let racePts = 0
    let penaltyPts = 0
    let fastestLapPts = 0
    let positionsGainedPts = 0

    if (raceResult) {
      if (raceResult.dsq) {
        racePts = rules.dsq
      } else if (raceResult.dnc) {
        racePts = 0
      } else if (raceResult.dnf) {
        racePts = rules.dnf
      } else {
        racePts = rules.race[String(raceResult.position)] ?? 0

        const posGainedBonus = rules.positions_gained_bonus ?? 0
        if (qualPos && raceResult.position && posGainedBonus > 0) {
          const gained = qualPos - raceResult.position
          if (gained > 0) {
            positionsGainedPts = gained * posGainedBonus
          }
        }
      }

      if (raceResult.fastest_lap && !raceResult.dnf && !raceResult.dsq && !raceResult.dnc) {
        fastestLapPts = rules.fastest_lap
      }

      if (raceResult.penalty_positions && raceResult.penalty_positions > 0) {
        penaltyPts = raceResult.penalty_positions * rules.penalty_per_position
      }
    }

    const driverTotal = qualPts + racePts + fastestLapPts + penaltyPts + positionsGainedPts
    teamScore += driverTotal
  }

  return teamScore
}

function computeGpScore(
  rosterDriverIds: string[],
  captainDriverId: string,
  results: GpResultsData,
  rules: ScoringRulesData,
  predictions: GpPredictions,
  benchDriverId?: string
): ScoreBreakdown {
  let activeDriverIds: string[]
  let effectiveCaptainId = captainDriverId

  if (benchDriverId) {
    const starters = rosterDriverIds.filter(id => id !== benchDriverId)

    const dncStarterId = starters.find(id => {
      const rr = results.race_order.find(r => r.driver_id === id)
      return rr?.dnc === true
    })

    if (dncStarterId) {
      activeDriverIds = starters.map(id => id === dncStarterId ? benchDriverId : id)
      if (effectiveCaptainId === dncStarterId) {
        effectiveCaptainId = benchDriverId
      }
    } else {
      activeDriverIds = starters
    }
  } else {
    activeDriverIds = rosterDriverIds
  }

  const posGainedBonus = rules.positions_gained_bonus ?? 0

  const driverBreakdowns = activeDriverIds.map((driverId) => {
    const qualPos = results.qualifying_order.find(q => q.driver_id === driverId)?.position
    const qualPts = qualPos ? (rules.qualifying[String(qualPos)] ?? 0) : 0

    const raceResult = results.race_order.find(r => r.driver_id === driverId)
    let racePts = 0
    let penaltyPts = 0
    let fastestLapPts = 0
    let positionsGainedPts = 0

    if (raceResult) {
      if (raceResult.dsq) {
        racePts = rules.dsq
      } else if (raceResult.dnc) {
        racePts = 0
      } else if (raceResult.dnf) {
        racePts = rules.dnf
      } else {
        racePts = rules.race[String(raceResult.position)] ?? 0

        if (qualPos && raceResult.position && posGainedBonus > 0) {
          const gained = qualPos - raceResult.position
          if (gained > 0) {
            positionsGainedPts = gained * posGainedBonus
          }
        }
      }

      if (raceResult.fastest_lap && !raceResult.dnf && !raceResult.dsq && !raceResult.dnc) {
        fastestLapPts = rules.fastest_lap
      }

      if (raceResult.penalty_positions && raceResult.penalty_positions > 0) {
        penaltyPts = raceResult.penalty_positions * rules.penalty_per_position
      }
    }

    let sprintPts = 0
    if (results.sprint_order && rules.sprint) {
      const sprintPos = results.sprint_order.find(s => s.driver_id === driverId)?.position
      if (sprintPos) {
        sprintPts = rules.sprint[String(sprintPos)] ?? 0
      }
    }

    const isCaptain = driverId === effectiveCaptainId
    const rawSubtotal = qualPts + racePts + sprintPts + fastestLapPts + penaltyPts + positionsGainedPts
    const subtotal = isCaptain ? rawSubtotal * rules.captain_multiplier : rawSubtotal

    const isBenchSub = benchDriverId === driverId

    return {
      driver_id: driverId,
      driver_name: '',
      qualifying_pts: qualPts,
      race_pts: racePts,
      sprint_pts: sprintPts,
      fastest_lap_pts: fastestLapPts,
      penalty_pts: penaltyPts,
      positions_gained_pts: positionsGainedPts,
      is_captain: isCaptain,
      captain_multiplier_applied: isCaptain,
      is_bench_sub: isBenchSub,
      subtotal,
    }
  })

  let predictionsPts = 0
  const pRules = rules.predictions

  if (predictions.pole_driver_id) {
    const actualPole = results.qualifying_order.find(q => q.position === 1)?.driver_id
    if (actualPole === predictions.pole_driver_id) predictionsPts += pRules.pole
  }

  if (predictions.winner_driver_id) {
    const actualWinner = results.race_order.find(r => r.position === 1 && !r.dsq && !r.dnf)?.driver_id
    if (actualWinner === predictions.winner_driver_id) predictionsPts += pRules.winner
  }

  if (predictions.fastest_lap_driver_id) {
    const actualFL = results.race_order.find(r => r.fastest_lap)?.driver_id
    if (actualFL === predictions.fastest_lap_driver_id) predictionsPts += pRules.fastest_lap
  }

  if (predictions.podium_driver_ids) {
    const actualPodium = results.race_order
      .filter(r => r.position <= 3 && !r.dsq && !r.dnf)
      .map(r => r.driver_id)
    const actualWinnerId = results.race_order.find(r => r.position === 1 && !r.dsq && !r.dnf)?.driver_id
    predictions.podium_driver_ids.forEach(dId => {
      if (dId === actualWinnerId) return
      if (actualPodium.includes(dId)) predictionsPts += pRules.podium_each
    })
  }

  if (predictions.safety_car !== undefined && results.safety_car !== undefined) {
    if (predictions.safety_car === results.safety_car) {
      predictionsPts += pRules.safety_car
    }
  }

  const driversTotal = driverBreakdowns.reduce((sum, d) => sum + d.subtotal, 0)
  const total = driversTotal + predictionsPts

  return {
    drivers: driverBreakdowns,
    predictions_pts: predictionsPts,
    total,
    team_pts: 0,
  }
}

// ============== TEST SETUP ==============
const RULES: ScoringRulesData = {
  qualifying: { "1": 10, "2": 9, "3": 8, "4": 7, "5": 6, "6": 5, "7": 4, "8": 3, "9": 2, "10": 1 },
  race: { "1": 25, "2": 18, "3": 15, "4": 12, "5": 10, "6": 8, "7": 6, "8": 4, "9": 2, "10": 1 },
  fastest_lap: 5,
  dnf: -10,
  dsq: -15,
  dnc: 0,
  penalty_per_position: -1,
  positions_gained_bonus: 1,
  captain_multiplier: 2,
  predictions: {
    pole: 5,
    winner: 5,
    fastest_lap: 3,
    safety_car: 3,
    podium_each: 2,
  },
}

// ============== TEST CASES ==============
let passed = 0
let failed = 0

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    console.log(`  ✅ ${testName}`)
    passed++
  } else {
    console.log(`  ❌ ${testName}${details ? ` — ${details}` : ''}`)
    failed++
  }
}

// ---------- TEST 1: Basic scoring (no captain, no predictions, no bench) ----------
console.log('\n═══ TEST 1: Basic Driver Scoring ═══')
console.log('Scenario: 3 drivers in roster, no captain bonus, no predictions')

const results1: GpResultsData = {
  qualifying_order: [
    { driver_id: 'VER', position: 1 },
    { driver_id: 'NOR', position: 2 },
    { driver_id: 'LEC', position: 3 },
    { driver_id: 'HAM', position: 4 },
  ],
  race_order: [
    { driver_id: 'VER', position: 1, fastest_lap: true },
    { driver_id: 'NOR', position: 2 },
    { driver_id: 'HAM', position: 3 },
    { driver_id: 'LEC', position: 4 },
  ],
}

// Player has VER, NOR, LEC. Captain = VER (gets 2x), no bench
const score1 = computeGpScore(
  ['VER', 'NOR', 'LEC'],
  'VER',
  results1,
  RULES,
  {},
)

// VER: Qual P1=10, Race P1=25, FL=5 → 40 × 2 (captain) = 80
// NOR: Qual P2=9, Race P2=18 → 27
// LEC: Qual P3=8, Race P4=12 → 20. NO positions gained (P3→P4 is a LOSS)
console.log('VER (Captain): Qual=10, Race=25, FL=5 → raw=40, ×2 = 80')
console.log('NOR: Qual=9, Race=18 → 27')
console.log('LEC: Qual=8, Race=12 → 20 (lost 1 position, no bonus)')
console.log(`Expected total: 80 + 27 + 20 = 127, Got: ${score1.total}`)

assert(score1.drivers[0].subtotal === 80, 'VER captain 2x applied correctly', `Got ${score1.drivers[0].subtotal}`)
assert(score1.drivers[1].subtotal === 27, 'NOR normal scoring', `Got ${score1.drivers[1].subtotal}`)
assert(score1.drivers[2].subtotal === 20, 'LEC normal scoring (no positions gained for lost positions)', `Got ${score1.drivers[2].subtotal}`)
assert(score1.total === 127, 'Total = 127', `Got ${score1.total}`)

// ---------- TEST 2: Positions gained bonus ----------
console.log('\n═══ TEST 2: Positions Gained Bonus ═══')
console.log('Scenario: HAM qualifies P10, finishes P3 → gained 7 positions')

const results2: GpResultsData = {
  qualifying_order: [
    { driver_id: 'VER', position: 1 },
    { driver_id: 'NOR', position: 5 },
    { driver_id: 'HAM', position: 10 },
    { driver_id: 'LEC', position: 3 },
  ],
  race_order: [
    { driver_id: 'VER', position: 1 },
    { driver_id: 'NOR', position: 4 },
    { driver_id: 'HAM', position: 3 },
    { driver_id: 'LEC', position: 10 },
  ],
}

const score2 = computeGpScore(['VER', 'NOR', 'HAM'], 'VER', results2, RULES, {})

// HAM: Qual P10=1, Race P3=15, Positions Gained = 10-3=7 → +7, total=23
// NOR: Qual P5=6, Race P4=12, Positions Gained = 5-4=1 → +1, total=19
// VER: Qual P1=10, Race P1=25 → 35 × 2 = 70
const hamBreakdown = score2.drivers.find(d => d.driver_id === 'HAM')!
const norBreakdown = score2.drivers.find(d => d.driver_id === 'NOR')!

console.log(`HAM: Qual=1, Race=15, PosGained=7 → 23. Got: ${hamBreakdown.subtotal}`)
console.log(`NOR: Qual=6, Race=12, PosGained=1 → 19. Got: ${norBreakdown.subtotal}`)

assert(hamBreakdown.positions_gained_pts === 7, 'HAM gained 7 positions = +7pts', `Got ${hamBreakdown.positions_gained_pts}`)
assert(hamBreakdown.subtotal === 23, 'HAM total = 23', `Got ${hamBreakdown.subtotal}`)
assert(norBreakdown.positions_gained_pts === 1, 'NOR gained 1 position = +1pt', `Got ${norBreakdown.positions_gained_pts}`)

// ---------- TEST 3: DNF and penalty ----------
console.log('\n═══ TEST 3: DNF + Penalty ═══')
console.log('Scenario: LEC DNFs, NOR gets 3 grid penalty positions')

const results3: GpResultsData = {
  qualifying_order: [
    { driver_id: 'VER', position: 1 },
    { driver_id: 'NOR', position: 2 },
    { driver_id: 'LEC', position: 3 },
  ],
  race_order: [
    { driver_id: 'VER', position: 1 },
    { driver_id: 'NOR', position: 2, penalty_positions: 3 },
    { driver_id: 'LEC', position: 0, dnf: true },
  ],
}

const score3 = computeGpScore(['VER', 'NOR', 'LEC'], 'VER', results3, RULES, {})
const lecDnf = score3.drivers.find(d => d.driver_id === 'LEC')!
const norPenalty = score3.drivers.find(d => d.driver_id === 'NOR')!

// LEC: Qual P3=8, Race DNF=-10 → -2
// NOR: Qual P2=9, Race P2=18, Penalty 3×(-1)=-3 → 24
console.log(`LEC DNF: Qual=8, Race=-10 → -2. Got: ${lecDnf.subtotal}`)
console.log(`NOR Penalty: Qual=9, Race=18, Pen=-3 → 24. Got: ${norPenalty.subtotal}`)

assert(lecDnf.race_pts === -10, 'LEC DNF = -10 race pts', `Got ${lecDnf.race_pts}`)
assert(lecDnf.subtotal === -2, 'LEC total = -2', `Got ${lecDnf.subtotal}`)
assert(norPenalty.penalty_pts === -3, 'NOR penalty = -3', `Got ${norPenalty.penalty_pts}`)
assert(norPenalty.subtotal === 24, 'NOR total = 24', `Got ${norPenalty.subtotal}`)

// ---------- TEST 4: DNC + Bench Substitution ----------
console.log('\n═══ TEST 4: DNC + Bench Substitution ═══')
console.log('Scenario: LEC (starter) DNC, PIA (bench) replaces him')

const results4: GpResultsData = {
  qualifying_order: [
    { driver_id: 'VER', position: 1 },
    { driver_id: 'NOR', position: 2 },
    { driver_id: 'PIA', position: 6 },
    // LEC did not compete (DNC)
  ],
  race_order: [
    { driver_id: 'VER', position: 1 },
    { driver_id: 'NOR', position: 2 },
    { driver_id: 'PIA', position: 5, fastest_lap: true },
    { driver_id: 'LEC', position: 0, dnc: true },
  ],
}

// Roster: VER, NOR, LEC, PIA. Bench = PIA. Captain = LEC
// LEC is DNC → PIA replaces. Captain was LEC → PIA becomes captain
const score4 = computeGpScore(
  ['VER', 'NOR', 'LEC', 'PIA'],
  'LEC',
  results4,
  RULES,
  {},
  'PIA'
)

// Active should be: VER, NOR, PIA (replacing LEC)
// PIA is now captain because LEC was captain and got DNC
// PIA: Qual P6=5, Race P5=10, FL=5, PosGained=6-5=1 → raw=21, ×2=42
// VER: Qual P1=10, Race P1=25 → 35
// NOR: Qual P2=9, Race P2=18 → 27

const piaDriver = score4.drivers.find(d => d.driver_id === 'PIA')!
console.log(`PIA (bench sub, now captain): Qual=5, Race=10, FL=5, PG=1 → raw=21, ×2=42. Got: ${piaDriver.subtotal}`)

assert(piaDriver.is_captain === true, 'PIA is captain (inherited from DNC LEC)', `is_captain=${piaDriver.is_captain}`)
assert(piaDriver.is_bench_sub === true, 'PIA is bench sub', `is_bench_sub=${piaDriver.is_bench_sub}`)
assert(piaDriver.subtotal === 42, 'PIA captain 2x = 42', `Got ${piaDriver.subtotal}`)
assert(!score4.drivers.find(d => d.driver_id === 'LEC'), 'LEC not in active lineup')
assert(score4.total === 42 + 35 + 27, 'Total = 104', `Got ${score4.total}`)

// ---------- TEST 5: Predictions ----------
console.log('\n═══ TEST 5: Predictions Scoring ═══')
console.log('Scenario: Player predicts pole=VER (correct), winner=VER (correct), FL=NOR (wrong), SC=yes (correct), podium=[VER,NOR,HAM] (2 correct)')

const results5: GpResultsData = {
  qualifying_order: [
    { driver_id: 'VER', position: 1 },
    { driver_id: 'NOR', position: 2 },
    { driver_id: 'HAM', position: 3 },
  ],
  race_order: [
    { driver_id: 'VER', position: 1, fastest_lap: true },
    { driver_id: 'NOR', position: 2 },
    { driver_id: 'HAM', position: 3 },
  ],
  safety_car: true,
}

const preds5: GpPredictions = {
  pole_driver_id: 'VER',
  winner_driver_id: 'VER',
  fastest_lap_driver_id: 'NOR', // Wrong - VER had FL
  safety_car: true,
  podium_driver_ids: ['VER', 'NOR', 'HAM'],
}

const score5 = computeGpScore(['VER'], 'VER', results5, RULES, preds5)

// Predictions: pole=5, winner=5, FL=0 (wrong), SC=3, podium: VER excluded (is winner), NOR=2, HAM=2 → total=17
console.log(`Predictions: pole(5) + winner(5) + FL(0 wrong) + SC(3) + podium(NOR=2 + HAM=2, VER excluded as winner) = 17. Got: ${score5.predictions_pts}`)

assert(score5.predictions_pts === 17, 'Predictions total = 17', `Got ${score5.predictions_pts}`)

// ---------- TEST 6: DSQ ----------
console.log('\n═══ TEST 6: DSQ Penalty ═══')

const results6: GpResultsData = {
  qualifying_order: [
    { driver_id: 'VER', position: 1 },
  ],
  race_order: [
    { driver_id: 'VER', position: 0, dsq: true },
  ],
}

const score6 = computeGpScore(['VER'], 'VER', results6, RULES, {})
const verDsq = score6.drivers[0]

// VER: Qual P1=10, Race DSQ=-15 → -5, captain 2x → -10
console.log(`VER DSQ captain: Qual=10, Race=-15 → raw=-5, ×2=-10. Got: ${verDsq.subtotal}`)
assert(verDsq.race_pts === -15, 'DSQ = -15', `Got ${verDsq.race_pts}`)
assert(verDsq.subtotal === -10, 'Captain 2x on DSQ = -10', `Got ${verDsq.subtotal}`)

// ---------- TEST 7: Team Scoring ----------
console.log('\n═══ TEST 7: Team Scoring ═══')
console.log('Scenario: Team McLaren (NOR + PIA), sum of both drivers points')

const results7: GpResultsData = {
  qualifying_order: [
    { driver_id: 'NOR', position: 2 },
    { driver_id: 'PIA', position: 5 },
  ],
  race_order: [
    { driver_id: 'NOR', position: 1, fastest_lap: true },
    { driver_id: 'PIA', position: 4 },
  ],
}

const teamScore7 = computeTeamScore('mclaren', ['NOR', 'PIA'], results7, RULES)

// NOR: Qual P2=9, Race P1=25, FL=5, PosGained=2-1=1 → 40
// PIA: Qual P5=6, Race P4=12, PosGained=5-4=1 → 19
// Team total = 40 + 19 = 59
console.log(`NOR: Qual=9, Race=25, FL=5, PG=1 → 40`)
console.log(`PIA: Qual=6, Race=12, PG=1 → 19`)
console.log(`Team total: 59. Got: ${teamScore7}`)

assert(teamScore7 === 59, 'Team score = 59', `Got ${teamScore7}`)

// ---------- TEST 8: Team with DNF driver ----------
console.log('\n═══ TEST 8: Team Scoring with DNF ═══')

const results8: GpResultsData = {
  qualifying_order: [
    { driver_id: 'NOR', position: 2 },
    { driver_id: 'PIA', position: 5 },
  ],
  race_order: [
    { driver_id: 'NOR', position: 1 },
    { driver_id: 'PIA', position: 0, dnf: true },
  ],
}

const teamScore8 = computeTeamScore('mclaren', ['NOR', 'PIA'], results8, RULES)

// NOR: Qual P2=9, Race P1=25, PG=1 → 35
// PIA: Qual P5=6, Race DNF=-10 → -4
// Team total = 35 + (-4) = 31
console.log(`NOR: Qual=9, Race=25, PG=1 → 35`)
console.log(`PIA: Qual=6, Race DNF=-10 → -4`)
console.log(`Team total: 31. Got: ${teamScore8}`)

assert(teamScore8 === 31, 'Team score with DNF = 31', `Got ${teamScore8}`)

// ---------- TEST 9: Fastest lap only awarded to finisher ----------
console.log('\n═══ TEST 9: Fastest Lap Only for Finisher ═══')

const results9: GpResultsData = {
  qualifying_order: [
    { driver_id: 'VER', position: 1 },
  ],
  race_order: [
    { driver_id: 'VER', position: 0, dnf: true, fastest_lap: true },
  ],
}

const score9 = computeGpScore(['VER'], 'VER', results9, RULES, {})
const verFL = score9.drivers[0]

// VER: Qual P1=10, Race DNF=-10, FL=0 (DNF doesn't get FL bonus) → raw=0, ×2=0
console.log(`VER DNF+FL: FL should NOT be awarded. Qual=10, Race=-10, FL=0 → raw=0, ×2=0. Got: ${verFL.subtotal}`)
assert(verFL.fastest_lap_pts === 0, 'FL not awarded to DNF driver', `Got ${verFL.fastest_lap_pts}`)
assert(verFL.subtotal === 0, 'Captain 2x on 0 = 0', `Got ${verFL.subtotal}`)

// ---------- TEST 10: Full realistic scenario ----------
console.log('\n═══ TEST 10: Full Realistic GP Scenario ═══')
console.log('Roster: VER(Capt), NOR, HAM, LEC(bench). NOR gains 5 positions. VER FL. Predictions mostly correct.')

const results10: GpResultsData = {
  qualifying_order: [
    { driver_id: 'VER', position: 1 },
    { driver_id: 'LEC', position: 2 },
    { driver_id: 'HAM', position: 4 },
    { driver_id: 'NOR', position: 8 },
    { driver_id: 'PIA', position: 6 },
  ],
  race_order: [
    { driver_id: 'VER', position: 1, fastest_lap: true },
    { driver_id: 'HAM', position: 2 },
    { driver_id: 'NOR', position: 3 },
    { driver_id: 'LEC', position: 5 },
    { driver_id: 'PIA', position: 4 },
  ],
  safety_car: true,
}

const preds10: GpPredictions = {
  pole_driver_id: 'VER',       // Correct → +5
  winner_driver_id: 'VER',     // Correct → +5
  fastest_lap_driver_id: 'VER', // Correct → +3
  safety_car: true,             // Correct → +3
  podium_driver_ids: ['VER', 'HAM', 'NOR'], // VER excluded (winner). HAM=correct (+2), NOR=correct (+2)
}

const score10 = computeGpScore(
  ['VER', 'NOR', 'HAM', 'LEC'],
  'VER',
  results10,
  RULES,
  preds10,
  'LEC'  // bench
)

// Starters: VER, NOR, HAM (LEC on bench, no DNC so stays benched)
// VER (captain): Qual P1=10, Race P1=25, FL=5 → 40, ×2 = 80
// HAM: Qual P4=7, Race P2=18, PosGained=4-2=2 → 27
// NOR: Qual P8=3, Race P3=15, PosGained=8-3=5 → 23
// Predictions: 5+5+3+3+2+2 = 20
// Total: 80+27+23+20 = 150

const ver10 = score10.drivers.find(d => d.driver_id === 'VER')!
const ham10 = score10.drivers.find(d => d.driver_id === 'HAM')!
const nor10 = score10.drivers.find(d => d.driver_id === 'NOR')!

console.log(`VER(C): Q=10, R=25, FL=5 → raw=40, ×2=${ver10.subtotal}`)
console.log(`HAM: Q=7, R=18, PG=2 → ${ham10.subtotal}`)
console.log(`NOR: Q=3, R=15, PG=5 → ${nor10.subtotal}`)
console.log(`Predictions: ${score10.predictions_pts}`)
console.log(`Total: ${score10.total} (expected 150)`)

assert(ver10.subtotal === 80, 'VER captain = 80', `Got ${ver10.subtotal}`)
assert(ham10.subtotal === 27, 'HAM = 27', `Got ${ham10.subtotal}`)
assert(nor10.subtotal === 23, 'NOR = 23', `Got ${nor10.subtotal}`)
assert(score10.predictions_pts === 20, 'Predictions = 20', `Got ${score10.predictions_pts}`)
assert(score10.total === 150, 'Grand total = 150', `Got ${score10.total}`)
assert(score10.drivers.length === 3, 'Only 3 active drivers (bench not used)', `Got ${score10.drivers.length}`)

// ============== SUMMARY ==============
console.log('\n══════════════════════════════════')
console.log(`RESULTS: ${passed} passed, ${failed} failed out of ${passed + failed} tests`)
console.log('══════════════════════════════════\n')

if (failed > 0) {
  process.exit(1)
}
