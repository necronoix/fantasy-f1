# Fantasy F1 - API Specification

## Base URL

```
Development: http://localhost:3000/api
Production: https://fantasy-f1.example.com/api
```

## Authentication

All endpoints (except auth) require:
- **Cookie**: Supabase session cookie (set by auth endpoints)
- OR **Header**: `Authorization: Bearer {access_token}`

## Response Format

### Success (2xx)
```json
{
  "data": { /* response data */ },
  "message": "Optional success message"
}
```

### Error (4xx, 5xx)
```json
{
  "error": "Error code",
  "message": "Human-readable error message",
  "status": 400
}
```

---

## Authentication Endpoints

### POST /auth/signup
Register new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123",
  "display_name": "John Doe"
}
```

**Response (201):**
```json
{
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "email_confirmed_at": "2026-03-05T10:00:00Z"
    },
    "session": {
      "access_token": "jwt_token",
      "refresh_token": "refresh_token"
    }
  }
}
```

### POST /auth/login
Authenticate user with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123"
}
```

**Response (200):**
```json
{
  "data": {
    "user": { "id": "uuid", "email": "user@example.com" },
    "session": { "access_token": "jwt_token", "refresh_token": "refresh_token" }
  }
}
```

### POST /auth/logout
Logout current user.

**Response (200):**
```json
{
  "data": {},
  "message": "Logged out successfully"
}
```

### POST /auth/refresh
Refresh access token using refresh token.

**Request Body:**
```json
{
  "refresh_token": "refresh_token"
}
```

**Response (200):**
```json
{
  "data": {
    "session": { "access_token": "new_jwt_token" }
  }
}
```

### GET /auth/profile
Get current user profile.

**Response (200):**
```json
{
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "display_name": "John Doe",
    "avatar_url": "https://...",
    "created_at": "2026-01-15T10:00:00Z"
  }
}
```

---

## League Endpoints

### POST /leagues
Create new league.

**Request Body:**
```json
{
  "name": "My Awesome League",
  "season_id": 2026,
  "max_players": 8,
  "roster_size": 4,
  "budget": 200,
  "settings": {
    "timezone": "Europe/Rome",
    "qualifying_lock_hours": 1,
    "race_lock_hours": 0,
    "bid_timer_seconds": 30,
    "trade_limit_per_month": 1
  }
}
```

**Response (201):**
```json
{
  "data": {
    "id": "league-uuid",
    "name": "My Awesome League",
    "code": "ABCD12",
    "owner_user_id": "user-uuid",
    "season_id": 2026,
    "max_players": 8,
    "roster_size": 4,
    "budget": 200,
    "settings_json": { /* settings object */ },
    "created_at": "2026-03-05T10:00:00Z"
  }
}
```

### GET /leagues
List user's leagues.

**Query Parameters:**
- `season_id` (optional): Filter by season

**Response (200):**
```json
{
  "data": [
    {
      "id": "league-uuid",
      "name": "My League",
      "code": "ABCD12",
      "season_id": 2026,
      "member_count": 5,
      "status": "active"
    }
  ]
}
```

### GET /leagues/:id
Get league details.

**Response (200):**
```json
{
  "data": {
    "id": "league-uuid",
    "name": "My League",
    "code": "ABCD12",
    "owner_user_id": "owner-uuid",
    "season_id": 2026,
    "max_players": 8,
    "roster_size": 4,
    "budget": 200,
    "settings_json": { /* settings */ },
    "created_at": "2026-03-05T10:00:00Z",
    "owner": {
      "id": "owner-uuid",
      "display_name": "Owner Name"
    },
    "members_count": 5
  }
}
```

### POST /leagues/:id/join
Join league with code.

**Request Body:**
```json
{
  "code": "ABCD12"
}
```

**Response (201):**
```json
{
  "data": {
    "id": "member-uuid",
    "league_id": "league-uuid",
    "user_id": "user-uuid",
    "role": "player",
    "credits_total": 200,
    "credits_spent": 0,
    "credits_left": 200,
    "joined_at": "2026-03-05T10:00:00Z"
  }
}
```

### GET /leagues/:id/members
Get all league members.

**Response (200):**
```json
{
  "data": [
    {
      "id": "member-uuid",
      "user_id": "user-uuid",
      "role": "player",
      "credits_total": 200,
      "credits_spent": 75,
      "credits_left": 125,
      "trades_used_month": 0,
      "profile": {
        "display_name": "Player Name",
        "avatar_url": "https://..."
      }
    }
  ]
}
```

---

## Auction Endpoints

### POST /leagues/:id/auctions
Create initial or mini auction.

**Request Body:**
```json
{
  "type": "initial",
  "target_driver_id": "driver-uuid",
  "duration_seconds": 60
}
```

**Response (201):**
```json
{
  "data": {
    "id": "auction-uuid",
    "league_id": "league-uuid",
    "type": "initial",
    "target_driver_id": "driver-uuid",
    "current_bid": 0,
    "leader_user_id": null,
    "ends_at": "2026-03-05T10:01:00Z",
    "status": "active",
    "created_at": "2026-03-05T10:00:00Z",
    "target_driver": {
      "id": "driver-uuid",
      "name": "Lewis Hamilton",
      "short_name": "HAM",
      "team_id": "team-uuid"
    }
  }
}
```

### GET /leagues/:id/auctions
List league auctions.

**Query Parameters:**
- `status`: `active`, `closed`, `cancelled`
- `type`: `initial`, `mini`
- `limit`: Default 20
- `offset`: Default 0

**Response (200):**
```json
{
  "data": [
    {
      "id": "auction-uuid",
      "target_driver": { "name": "Lewis Hamilton", "short_name": "HAM" },
      "current_bid": 45,
      "leader": { "display_name": "Player Name" },
      "ends_at": "2026-03-05T10:01:00Z",
      "status": "active",
      "time_left_seconds": 15
    }
  ],
  "pagination": {
    "total": 42,
    "limit": 20,
    "offset": 0
  }
}
```

### GET /leagues/:id/auctions/:auctionId
Get auction details.

**Response (200):**
```json
{
  "data": {
    "id": "auction-uuid",
    "league_id": "league-uuid",
    "type": "initial",
    "target_driver": { /* driver object */ },
    "current_bid": 45,
    "leader": { /* user profile */ },
    "status": "active",
    "ends_at": "2026-03-05T10:01:00Z",
    "bids": [
      {
        "amount": 45,
        "user": { "display_name": "Player 1" },
        "created_at": "2026-03-05T10:00:45Z"
      },
      {
        "amount": 35,
        "user": { "display_name": "Player 2" },
        "created_at": "2026-03-05T10:00:30Z"
      }
    ]
  }
}
```

### POST /auctions/:id/bid
Place bid on auction.

**Request Body:**
```json
{
  "amount": 50
}
```

**Response (201):**
```json
{
  "data": {
    "id": "bid-uuid",
    "auction_id": "auction-uuid",
    "user_id": "user-uuid",
    "amount": 50,
    "created_at": "2026-03-05T10:00:55Z"
  },
  "auction_update": {
    "current_bid": 50,
    "leader_user_id": "user-uuid",
    "ends_at": "2026-03-05T10:02:30Z"
  }
}
```

**Errors:**
- `400`: Bid validation failed
- `409`: Auction already closed

### WS /leagues/:id/auctions/live
WebSocket for real-time auction updates.

**Subscribe (after connection):**
```json
{
  "type": "subscribe",
  "auction_id": "auction-uuid"
}
```

**Messages Received:**
```json
{
  "type": "bid",
  "auction_id": "auction-uuid",
  "amount": 50,
  "leader_name": "Player Name",
  "ends_at": "2026-03-05T10:02:30Z"
}
```

```json
{
  "type": "close",
  "auction_id": "auction-uuid",
  "status": "closed",
  "winner_name": "Player Name",
  "final_bid": 50
}
```

---

## Roster Endpoints

### GET /leagues/:id/rosters
Get all rosters in league.

**Response (200):**
```json
{
  "data": [
    {
      "user_id": "user-uuid",
      "user_name": "Player Name",
      "drivers": [
        {
          "id": "driver-uuid",
          "name": "Lewis Hamilton",
          "short_name": "HAM",
          "purchase_price": 45,
          "acquired_via": "initial_auction"
        }
      ],
      "total_spent": 105,
      "credits_left": 95
    }
  ]
}
```

### GET /leagues/:id/rosters/me
Get current user's roster.

**Response (200):**
```json
{
  "data": {
    "user_id": "user-uuid",
    "drivers": [
      {
        "id": "driver-uuid",
        "name": "Lewis Hamilton",
        "short_name": "HAM",
        "number": 44,
        "team": "Mercedes",
        "purchase_price": 45,
        "acquired_via": "initial_auction"
      }
    ],
    "total_spent": 105,
    "credits_left": 95,
    "roster_slots_used": 1,
    "roster_slots_available": 3
  }
}
```

---

## Scoring Endpoints

### GET /leagues/:id/standings
Get league standings.

**Response (200):**
```json
{
  "data": [
    {
      "rank": 1,
      "user_id": "user-uuid",
      "display_name": "Player Name",
      "total_points": 875,
      "gp_count": 5,
      "gps": [
        {
          "round": 1,
          "name": "Bahrain",
          "points": 185
        }
      ]
    }
  ]
}
```

### GET /leagues/:id/standings/gp/:gpId
Get standings for specific GP.

**Response (200):**
```json
{
  "data": [
    {
      "rank": 1,
      "user_id": "user-uuid",
      "display_name": "Player Name",
      "gp_points": 125,
      "gp_info": {
        "round": 1,
        "name": "Bahrain",
        "date": "2026-03-20T15:00:00Z"
      }
    }
  ]
}
```

### GET /leagues/:id/scores/:userId/gp/:gpId
Get user's score breakdown for GP.

**Response (200):**
```json
{
  "data": {
    "user_id": "user-uuid",
    "gp_id": "gp-uuid",
    "total_points": 125,
    "breakdown": {
      "drivers": [
        {
          "driver_id": "driver-uuid",
          "driver_name": "Lewis Hamilton",
          "qualifying_pts": 9,
          "race_pts": 25,
          "sprint_pts": 0,
          "fastest_lap_pts": 2,
          "penalty_pts": 0,
          "is_captain": true,
          "captain_multiplier_applied": true,
          "subtotal": 72
        }
      ],
      "predictions_pts": 15,
      "total": 125
    }
  }
}
```

---

## Grand Prix Endpoints

### GET /gp
Get all GPs for season.

**Query Parameters:**
- `season_id`: Required
- `status`: `upcoming`, `completed`

**Response (200):**
```json
{
  "data": [
    {
      "id": "gp-uuid",
      "season_id": 2026,
      "round": 1,
      "name": "Bahrain Grand Prix",
      "circuit": "Sakhir",
      "country": "Bahrain",
      "date": "2026-03-20T15:00:00Z",
      "qualifying_date": "2026-03-19T14:00:00Z",
      "sprint_date": null,
      "has_sprint": false,
      "status": "upcoming"
    }
  ]
}
```

### GET /gp/:gpId
Get GP details.

**Response (200):**
```json
{
  "data": {
    "id": "gp-uuid",
    "name": "Bahrain Grand Prix",
    "circuit": "Sakhir",
    "country": "Bahrain",
    "date": "2026-03-20T15:00:00Z",
    "status": "upcoming",
    "locks_at": {
      "qualifying": "2026-03-19T13:00:00Z",
      "race": "2026-03-20T14:00:00Z"
    }
  }
}
```

---

## GP Selection Endpoints

### POST /leagues/:id/gp/:gpId/selections
Submit captain and predictions for GP.

**Request Body:**
```json
{
  "captain_driver_id": "driver-uuid",
  "predictions": {
    "pole_driver_id": "driver-uuid",
    "winner_driver_id": "driver-uuid",
    "fastest_lap_driver_id": "driver-uuid",
    "podium_driver_ids": ["driver-1", "driver-2", "driver-3"]
  }
}
```

**Response (201):**
```json
{
  "data": {
    "id": "selection-uuid",
    "league_id": "league-uuid",
    "gp_id": "gp-uuid",
    "user_id": "user-uuid",
    "captain_driver": { "name": "Lewis Hamilton" },
    "predictions": { /* predictions */ },
    "locked_at": null
  }
}
```

### GET /leagues/:id/gp/:gpId/selections/me
Get current user's selections for GP.

**Response (200):**
```json
{
  "data": {
    "id": "selection-uuid",
    "captain_driver": { "name": "Lewis Hamilton", "short_name": "HAM" },
    "predictions": { /* predictions */ },
    "locked_at": null,
    "can_edit": true
  }
}
```

---

## Trade Endpoints

### POST /leagues/:id/trades
Propose trade to another player.

**Request Body:**
```json
{
  "accepter_user_id": "other-user-uuid",
  "proposer_driver_id": "driver-1-uuid",
  "accepter_driver_id": "driver-2-uuid",
  "credit_adjustment": 0
}
```

**Response (201):**
```json
{
  "data": {
    "id": "trade-uuid",
    "league_id": "league-uuid",
    "proposer_user_id": "user-uuid",
    "accepter_user_id": "other-user-uuid",
    "offer": {
      "proposer_driver": { "name": "Lewis Hamilton" },
      "accepter_driver": { "name": "Max Verstappen" },
      "credit_adjustment": 0
    },
    "status": "pending",
    "created_at": "2026-03-05T10:00:00Z"
  }
}
```

### GET /leagues/:id/trades
List trades in league.

**Query Parameters:**
- `status`: `pending`, `accepted`, `rejected`
- `user_id` (optional): Filter trades for specific user

**Response (200):**
```json
{
  "data": [
    {
      "id": "trade-uuid",
      "proposer": { "display_name": "Player 1" },
      "accepter": { "display_name": "Player 2" },
      "offer": { /* trade offer */ },
      "status": "pending",
      "created_at": "2026-03-05T10:00:00Z"
    }
  ]
}
```

### POST /trades/:id/accept
Accept trade proposal.

**Response (200):**
```json
{
  "data": {
    "id": "trade-uuid",
    "status": "accepted",
    "accepted_at": "2026-03-05T10:05:00Z",
    "rosters_updated": true
  }
}
```

### POST /trades/:id/reject
Reject trade proposal.

**Response (200):**
```json
{
  "data": {
    "id": "trade-uuid",
    "status": "rejected"
  }
}
```

---

## Error Codes

| Code | Status | Message |
|------|--------|---------|
| `INVALID_CREDENTIALS` | 401 | Email or password incorrect |
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | User doesn't have permission |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `BID_TOO_LOW` | 400 | Bid must exceed current bid |
| `INSUFFICIENT_CREDITS` | 400 | User has insufficient credits |
| `AUCTION_CLOSED` | 409 | Auction is no longer active |
| `ROSTER_FULL` | 409 | Roster already at max size |
| `LEAGUE_FULL` | 409 | League is at max players |
| `INVALID_CODE` | 400 | League code is invalid |
| `ALREADY_MEMBER` | 409 | User is already in this league |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Rate Limiting

- **Auctions**: 1 bid per 2 seconds per user
- **Trades**: No limit (other than monthly cap)
- **General**: 100 requests per minute per user

---

## Pagination

For list endpoints:

**Query Parameters:**
```
?limit=20&offset=0
```

**Response:**
```json
{
  "data": [ /* items */ ],
  "pagination": {
    "total": 150,
    "limit": 20,
    "offset": 0,
    "pages": 8
  }
}
```

---

## Testing the API

### With cURL

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123"
  }'

# Create league
curl -X POST http://localhost:3000/api/leagues \
  -H "Authorization: Bearer {access_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My League",
    "season_id": 2026,
    "max_players": 8,
    "roster_size": 4,
    "budget": 200
  }'
```

### With Postman

- Set up authorization header with Bearer token
- Use environment variables for `{{base_url}}` and `{{token}}`
- Import Postman collection (to be created)

