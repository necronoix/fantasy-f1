// Database types matching Supabase schema

export type UserRole = 'admin' | 'player'
export type AuctionType = 'initial' | 'mini'
export type AuctionStatus = 'pending' | 'active' | 'closed' | 'cancelled'
export type TradeStatus = 'pending' | 'accepted' | 'rejected' | 'expired'
export type AcquiredVia = 'initial_auction' | 'mini_auction' | 'trade'

export interface Profile {
  id: string
  email: string
  display_name: string
  avatar_url?: string
  created_at: string
}

export interface League {
  id: string
  name: string
  code: string
  owner_user_id: string
  season_id: number
  max_players: number
  roster_size: number
  budget: number
  settings_json: LeagueSettings
  created_at: string
}

export interface LeagueSettings {
  timezone: string
  qualifying_lock_hours: number
  race_lock_hours: number
  bid_timer_seconds: number
  trade_limit_per_month: number
}

export interface LeagueMember {
  id: string
  league_id: string
  user_id: string
  role: UserRole
  credits_total: number
  credits_spent: number
  credits_left: number
  trades_used_month: number
  trades_month_key: string
  joined_at: string
  profile?: Profile
  league?: League
}

export interface Team {
  id: string
  season_id: number
  name: string
  color: string
  short_name: string
}

export interface Driver {
  id: string
  season_id: number
  name: string
  short_name: string
  team_id: string
  number: number
  active: boolean
  team?: Team
}

export interface GrandPrix {
  id: string
  season_id: number
  round: number
  name: string
  circuit: string
  country: string
  date: string
  qualifying_date: string
  sprint_date?: string
  has_sprint: boolean
  status: 'upcoming' | 'qualifying' | 'race' | 'completed'
}

export interface AuctionState {
  id: string
  league_id: string
  type: AuctionType
  target_driver_id: string
  drop_driver_user_id?: string
  drop_driver_id?: string
  current_bid: number
  leader_user_id?: string
  ends_at: string
  status: AuctionStatus
  metadata_json?: Record<string, unknown>
  created_at: string
  target_driver?: Driver
  leader?: Profile
}

export interface Bid {
  id: string
  league_id: string
  auction_id: string
  user_id: string
  amount: number
  created_at: string
  profile?: Profile
}

export interface RosterEntry {
  id: string
  league_id: string
  user_id: string
  driver_id: string
  purchase_price: number
  acquired_via: AcquiredVia
  created_at: string
  driver?: Driver
}

export interface GpSelection {
  id: string
  league_id: string
  gp_id: string
  user_id: string
  captain_driver_id: string
  bench_driver_id?: string
  predictions_json: GpPredictions
  locked_at?: string
  captain_driver?: Driver
}

export interface GpPredictions {
  pole_driver_id?: string
  winner_driver_id?: string
  fastest_lap_driver_id?: string
  safety_car?: boolean
  podium_driver_ids?: string[]
}

export interface GpResults {
  id: string
  league_id: string
  gp_id: string
  results_json: GpResultsData
  submitted_by: string
  submitted_at: string
}

export interface GpResultsData {
  qualifying_order: Array<{ driver_id: string; position: number; time?: string }>
  race_order: Array<{
    driver_id: string
    position: number
    dnf?: boolean
    dsq?: boolean
    dnc?: boolean
    fastest_lap?: boolean
    penalty_positions?: number
  }>
  sprint_order?: Array<{ driver_id: string; position: number }>
  safety_car?: boolean
}

export interface ScoringRules {
  id: string
  league_id: string
  version: number
  rules_json: ScoringRulesData
  active: boolean
  created_at: string
}

export interface ScoringRulesData {
  qualifying: Record<string, number>
  race: Record<string, number>
  sprint?: Record<string, number>
  fastest_lap: number
  dnf: number
  dsq: number
  dnc: number
  penalty_per_position: number
  positions_gained_bonus: number
  captain_multiplier: number
  predictions: {
    pole: number
    winner: number
    fastest_lap: number
    safety_car: number
    podium_each: number
  }
}

export interface GpScore {
  id: string
  league_id: string
  gp_id: string
  user_id: string
  total_points: number
  breakdown_json: ScoreBreakdown
  created_at: string
  profile?: Profile
  grand_prix?: GrandPrix
}

export interface ScoreBreakdown {
  drivers: Array<{
    driver_id: string
    driver_name: string
    qualifying_pts: number
    race_pts: number
    sprint_pts: number
    fastest_lap_pts: number
    penalty_pts: number
    positions_gained_pts: number
    is_captain: boolean
    captain_multiplier_applied: boolean
    is_bench_sub: boolean
    subtotal: number
  }>
  team_pts: number  // Points from the user's owned F1 team's two drivers
  team_name?: string  // Name of the user's owned team
  predictions_pts: number
  total: number
}

export interface Trade {
  id: string
  league_id: string
  proposer_user_id: string
  accepter_user_id: string
  offer_json: TradeOffer
  status: TradeStatus
  created_at: string
  accepted_at?: string
  proposer?: Profile
  accepter?: Profile
}

export interface TradeOffer {
  proposer_driver_id: string
  accepter_driver_id: string
  credit_adjustment: number
}

// UI helper types
export interface StandingsEntry {
  rank: number
  user_id: string
  display_name: string
  total_points: number
  gp_scores: Array<{ gp_id: string; points: number }>
}

export interface AuctionBidEvent {
  type: 'bid' | 'close' | 'timer_update'
  auction_id: string
  current_bid: number
  leader_user_id?: string
  ends_at: string
  status?: AuctionStatus
}
