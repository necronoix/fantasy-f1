import type { GpResultsData, ScoringRulesData, GpPredictions, ScoreBreakdown, Driver } from './types'

/**
 * Compute team score based on the two drivers belonging to that team.
 * The score is the sum of both drivers' race points, qualifying points, fastest lap,
 * and penalties - exactly like a normal driver but without the captain multiplier.
 * DNF/DSQ/DNC malus apply normally.
 */
export function computeTeamScore(
  teamId: string,
  teamDriverIds: string[],
  results: GpResultsData,
  rules: ScoringRulesData
): number {
  let teamScore = 0

  for (const driverId of teamDriverIds) {
    // --- Qualifying points ---
    const qualPos = results.qualifying_order.find(q => q.driver_id === driverId)?.position
    const qualPts = qualPos ? (rules.qualifying[String(qualPos)] ?? 0) : 0

    // --- Race points ---
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

        // --- Positions gained (only for drivers who finished the race) ---
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

/**
 * Compute GP score for a player.
 *
 * Lineup system: 3 starters + 1 bench.
 * - `starterDriverIds` = the 3 active drivers (or all roster if no bench selected)
 * - `benchDriverId` = the reserve driver
 * - If a starter has DNC, the bench driver replaces them (and inherits captain if needed)
 * - DNC gives 0 points (no penalty) — the bench sub takes over
 *
 * Positions gained: compares qualifying position to race finish → +1 per position gained
 * Podium prediction: P1 excluded (already covered by winner prediction)
 */
export function computeGpScore(
  rosterDriverIds: string[],
  captainDriverId: string,
  results: GpResultsData,
  rules: ScoringRulesData,
  predictions: GpPredictions,
  benchDriverId?: string
): ScoreBreakdown {
  // --- Determine active lineup with DNC substitution ---
  let activeDriverIds: string[]
  let effectiveCaptainId = captainDriverId

  if (benchDriverId) {
    // 3 starters = roster minus bench
    const starters = rosterDriverIds.filter(id => id !== benchDriverId)

    // Check if any starter has DNC
    const dncStarterId = starters.find(id => {
      const rr = results.race_order.find(r => r.driver_id === id)
      return rr?.dnc === true
    })

    if (dncStarterId) {
      // Bench player replaces the DNC starter
      activeDriverIds = starters.map(id => id === dncStarterId ? benchDriverId : id)
      // If the DNC starter was captain, bench player becomes captain
      if (effectiveCaptainId === dncStarterId) {
        effectiveCaptainId = benchDriverId
      }
    } else {
      activeDriverIds = starters
    }
  } else {
    // No bench selected — all roster drivers are active
    activeDriverIds = rosterDriverIds
  }

  const posGainedBonus = rules.positions_gained_bonus ?? 0

  const driverBreakdowns = activeDriverIds.map((driverId) => {
    // --- Qualifying points ---
    const qualPos = results.qualifying_order.find(q => q.driver_id === driverId)?.position
    const qualPts = qualPos ? (rules.qualifying[String(qualPos)] ?? 0) : 0

    // --- Race points ---
    const raceResult = results.race_order.find(r => r.driver_id === driverId)
    let racePts = 0
    let penaltyPts = 0
    let fastestLapPts = 0
    let positionsGainedPts = 0

    if (raceResult) {
      if (raceResult.dsq) {
        racePts = rules.dsq
      } else if (raceResult.dnc) {
        // DNC gives 0 pts — this driver shouldn't even be in activeDriverIds
        // if bench sub worked, but as safety: 0
        racePts = 0
      } else if (raceResult.dnf) {
        racePts = rules.dnf
      } else {
        racePts = rules.race[String(raceResult.position)] ?? 0

        // --- Positions gained (only for drivers who finished the race) ---
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

    // --- Sprint points ---
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

  // --- Predictions points ---
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
      // P1 escluso dal bonus podio (già coperto dal pronostico vincitore)
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
  }
}

export function validateAuctionBid(
  bidAmount: number,
  currentBid: number,
  userCreditsLeft: number,
  userRosterSize: number,
  maxRosterSize: number,
  budget: number
): { valid: boolean; error?: string } {
  if (bidAmount <= currentBid) {
    return { valid: false, error: 'L\'offerta deve essere superiore a quella attuale' }
  }
  if (bidAmount > userCreditsLeft) {
    return { valid: false, error: 'Crediti insufficienti' }
  }
  const remainingSlots = maxRosterSize - userRosterSize - 1
  const minReserve = remainingSlots * 1
  if (userCreditsLeft - bidAmount < minReserve) {
    return {
      valid: false,
      error: `Devi tenere almeno ${minReserve} crediti per i piloti rimanenti`,
    }
  }
  return { valid: true }
}

export function validateTrade(
  proposerCreditsLeft: number,
  accepterCreditsLeft: number,
  creditAdjustment: number
): { valid: boolean; error?: string } {
  if (creditAdjustment > 0 && proposerCreditsLeft < creditAdjustment) {
    return { valid: false, error: 'Crediti insufficienti per il conguaglio' }
  }
  if (creditAdjustment < 0 && accepterCreditsLeft < Math.abs(creditAdjustment)) {
    return { valid: false, error: 'Crediti insufficienti per il conguaglio (controparte)' }
  }
  return { valid: true }
}
