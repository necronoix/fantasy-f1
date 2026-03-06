import type { GpResultsData, ScoringRulesData, GpPredictions, ScoreBreakdown } from './types'

export function computeGpScore(
  rosterDriverIds: string[],
  captainDriverId: string,
  results: GpResultsData,
  rules: ScoringRulesData,
  predictions: GpPredictions
): ScoreBreakdown {
  const driverBreakdowns = rosterDriverIds.map((driverId) => {
    // --- Qualifying points ---
    const qualPos = results.qualifying_order.find(q => q.driver_id === driverId)?.position
    const qualPts = qualPos ? (rules.qualifying[String(qualPos)] ?? 0) : 0

    // --- Race points ---
    const raceResult = results.race_order.find(r => r.driver_id === driverId)
    let racePts = 0
    let penaltyPts = 0
    let fastestLapPts = 0

    if (raceResult) {
      if (raceResult.dsq) {
        racePts = rules.dsq
      } else if (raceResult.dnc) {
        racePts = rules.dnc
      } else if (raceResult.dnf) {
        racePts = rules.dnf
      } else {
        racePts = rules.race[String(raceResult.position)] ?? 0
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

    const isCaptain = driverId === captainDriverId
    const rawSubtotal = qualPts + racePts + sprintPts + fastestLapPts + penaltyPts
    const subtotal = isCaptain ? rawSubtotal * rules.captain_multiplier : rawSubtotal

    return {
      driver_id: driverId,
      driver_name: '',
      qualifying_pts: qualPts,
      race_pts: racePts,
      sprint_pts: sprintPts,
      fastest_lap_pts: fastestLapPts,
      penalty_pts: penaltyPts,
      is_captain: isCaptain,
      captain_multiplier_applied: isCaptain,
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
    predictions.podium_driver_ids.forEach(dId => {
      if (actualPodium.includes(dId)) predictionsPts += pRules.podium_each
    })
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
