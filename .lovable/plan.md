

# Live Cricket Scoring App - Integration Plan

## Overview

Yeh plan ek **dedicated Live Scoring interface** create karega jo current Stellar Slayers website ke saath fully integrated hoga. Jab match live score ho raha hoga, toh real-time updates database mein jayenge aur match end hone par saari stats automatically update ho jayengi.

---

## Key Features

### 1. Live Scoring Interface (Scorer View)
- **Ball-by-Ball Scoring**: Har delivery ke baad score update
- **Batsman Selector**: Current striker aur non-striker select karna
- **Bowler Selector**: Current bowler select karna  
- **Quick Action Buttons**: 0, 1, 2, 3, 4, 6, Wide, No Ball, Wicket
- **Wicket Details**: Caught, Bowled, LBW, Run Out, Stumped options
- **Over Summary**: Current over ka visual display
- **Score Display**: Live total score, wickets, overs

### 2. Real-time Sync with Website
- **Supabase Realtime**: Database changes instantly sync
- **Live Match View**: Spectators can see live score on website
- **Auto Stats Update**: Match end hone par player stats automatically calculate

### 3. Database Changes

New tables:
```text
+---------------------------+
|     live_match_state      |
+---------------------------+
| match_id (FK)             |
| current_innings           |
| batting_team_score        |
| wickets                   |
| overs                     |
| balls                     |
| current_striker_id (FK)   |
| current_non_striker_id    |
| current_bowler_id (FK)    |
| is_live                   |
| last_updated              |
+---------------------------+

+---------------------------+
|      ball_by_ball         |
+---------------------------+
| id                        |
| match_id (FK)             |
| over_number               |
| ball_number               |
| batsman_id (FK)           |
| bowler_id (FK)            |
| runs_scored               |
| extras_type               |
| extras_runs               |
| is_wicket                 |
| wicket_type               |
| fielder_id                |
| timestamp                 |
+---------------------------+
```

---

## User Flow

```text
Admin Dashboard                    Live Scoring App
      |                                   |
      v                                   |
 Create Match  ----------------------->  Select Match
      |                                   |
      |                                   v
      |                            Select Playing XI
      |                                   |
      |                                   v
      |                            Start Live Scoring
      |                                   |
      |                                   v
      |                            Score Ball-by-Ball
      |                                   |
      |                                   |
      |    <---- Realtime Sync ---->      |
      |                                   |
      |                                   v
      |                            End Match
      |                                   |
      v                                   |
Stats Auto-Updated <---------------------|
```

---

## Technical Implementation

### Phase 1: Database Setup
1. Create `live_match_state` table - match ki current state store karega
2. Create `ball_by_ball` table - har delivery ka record
3. Enable Realtime on both tables
4. RLS policies for admin-only write, public read

### Phase 2: Live Scoring UI
New pages/components:
- `/scorer/:matchId` - Main scoring interface
- `LiveScoringPanel.tsx` - Ball-by-ball input controls
- `BatsmanCard.tsx` - Current batsmen display
- `BowlerCard.tsx` - Current bowler display
- `ScoreBoard.tsx` - Live score display
- `OverSummary.tsx` - Current over visualization

### Phase 3: Real-time Viewers
- `/live/:matchId` - Public live match view (spectators ke liye)
- Realtime subscription to `live_match_state`
- Commentary feed from `ball_by_ball`

### Phase 4: Stats Aggregation
- Edge function: `finalize-match` 
  - Triggered when match ends
  - `ball_by_ball` se batting/bowling/fielding inputs calculate
  - Existing tables mein data insert/update
  - Player stats automatically refresh

### Phase 5: Mobile Optimization
- Touch-friendly scoring buttons
- Landscape mode support
- PWA offline capability for poor network

---

## Technical Details

### New Files to Create

| File | Purpose |
|------|---------|
| `src/pages/Scorer.tsx` | Live scoring page |
| `src/pages/LiveMatch.tsx` | Public live view page |
| `src/components/scoring/LiveScoringPanel.tsx` | Main scoring controls |
| `src/components/scoring/ScoreBoard.tsx` | Score display |
| `src/components/scoring/BatsmanCard.tsx` | Batsman info |
| `src/components/scoring/BowlerCard.tsx` | Bowler info |
| `src/components/scoring/OverSummary.tsx` | Over visualization |
| `src/components/scoring/WicketDialog.tsx` | Wicket type selection |
| `src/components/scoring/PlayerSelector.tsx` | Select batsman/bowler |
| `src/hooks/useLiveMatch.ts` | Realtime match state hook |
| `src/hooks/useBallByBall.ts` | Ball history hook |
| `supabase/functions/finalize-match/index.ts` | Stats calculation |

### Database Migrations

```sql
-- live_match_state table
CREATE TABLE live_match_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id INTEGER REFERENCES matches(id) ON DELETE CASCADE,
  is_live BOOLEAN DEFAULT false,
  current_innings INTEGER DEFAULT 1,
  total_runs INTEGER DEFAULT 0,
  wickets INTEGER DEFAULT 0,
  overs INTEGER DEFAULT 0,
  balls INTEGER DEFAULT 0,
  current_striker_id INTEGER REFERENCES players(id),
  current_non_striker_id INTEGER REFERENCES players(id),
  current_bowler_id INTEGER REFERENCES players(id),
  target INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(match_id)
);

-- ball_by_ball table
CREATE TABLE ball_by_ball (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id INTEGER REFERENCES matches(id) ON DELETE CASCADE,
  innings INTEGER DEFAULT 1,
  over_number INTEGER NOT NULL,
  ball_number INTEGER NOT NULL,
  batsman_id INTEGER REFERENCES players(id),
  bowler_id INTEGER REFERENCES players(id),
  runs_scored INTEGER DEFAULT 0,
  extras_type TEXT, -- 'wide', 'noball', 'bye', 'legbye'
  extras_runs INTEGER DEFAULT 0,
  is_wicket BOOLEAN DEFAULT false,
  wicket_type TEXT, -- 'caught', 'bowled', 'lbw', 'runout', 'stumped'
  fielder_id INTEGER REFERENCES players(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE live_match_state;
ALTER PUBLICATION supabase_realtime ADD TABLE ball_by_ball;
```

### Scoring UI Design

```text
+--------------------------------------------------+
|              STELLAR SLAYERS vs OPPONENT         |
|                   Live Match                     |
+--------------------------------------------------+
|   SCORE: 156/4        OVERS: 15.3        RR: 10.2|
+--------------------------------------------------+
|                                                  |
|  STRIKER          |    NON-STRIKER              |
|  Ahmad Muavia     |    Player B                 |
|  45* (32)         |    23* (18)                 |
|  SR: 140.6        |    SR: 127.8                |
|                                                  |
+--------------------------------------------------+
|  BOWLER: Player C                                |
|  2-0-18-1  |  This Over: . 1 4 W . 2            |
+--------------------------------------------------+
|                                                  |
|  [0] [1] [2] [3] [4] [6]                        |
|                                                  |
|  [Wide] [No Ball] [Bye] [Leg Bye]               |
|                                                  |
|  [WICKET]                                        |
|                                                  |
+--------------------------------------------------+
|  [Undo Last Ball]          [End Over]           |
+--------------------------------------------------+
```

---

## Integration Points

### With Existing Admin Panel
- Match list mein "Start Live Scoring" button
- Active live match indicator
- Quick access to scorer page

### With Existing Stats System
- Finalize-match function `batting_inputs`, `bowling_inputs`, `fielding_inputs` mein data insert karega
- Existing views aur rankings automatically update

### With Website Homepage
- "Live Now" banner agar koi match chal raha ho
- Click karke live score page pe redirect

---

## Estimated Scope

| Component | Effort |
|-----------|--------|
| Database tables + RLS | Small |
| Live Scoring UI | Medium |
| Realtime sync | Medium |
| Stats aggregation edge function | Medium |
| Public live view | Small |
| Mobile optimization | Small |

---

## Next Steps

Approve karne par, main:
1. Database tables create karunga
2. Live scoring page banaunga
3. Realtime sync implement karunga
4. Stats finalization edge function likhonga
5. Testing karunga end-to-end

