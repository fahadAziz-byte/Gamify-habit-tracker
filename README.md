# Gamify Habit Tracker

A gamified habit-tracking web application built on a fully serverless, cloud-native infrastructure. Users build daily habits, compete in challenges with friends, earn coins, level up on the leaderboard, and customize their profile through an in-game shop — all running on AWS Lambda with zero server management overhead.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Data Models](#data-models)
- [API Reference](#api-reference)
- [CI/CD Pipeline](#cicd-pipeline)
- [Infrastructure Design Decisions](#infrastructure-design-decisions)
- [Environment Variables](#environment-variables)
- [Local Development](#local-development)
- [Project Structure](#project-structure)

---

## Overview

Gamify Habit Tracker transforms the mundane task of building habits into an engaging game loop. The core loop works as follows:

1. Users create and check in habits daily, earning coins and leaderboard points.
2. Streak multipliers reward consistency — longer streaks yield exponentially more coins.
3. Players challenge friends to time-boxed competitions with a points prize pool.
4. Coins are spent in the in-game shop on avatars and temporary power-up potions.
5. A global leaderboard with level thresholds ranks all users in real time.

The application is designed to scale horizontally at zero cost during idle periods, thanks to its fully serverless deployment on AWS Lambda backed by API Gateway.

---

## Architecture

```
GitHub (push to main)
        |
        v
GitHub Actions (CI/CD)
        |
        v
Serverless Framework  ----  deploys to  ---->  AWS API Gateway
                                                      |
                                              AWS Lambda (Node 20.x)
                                             /         |          \
                                      Express.js    Mongoose     serverless-http
                                             \         |          /
                                              MongoDB Atlas (Cloud DB)
                                                      |
                                           connect-mongo (Session Store)

File Uploads (avatars, potions)
        |
        v
   Multer (buffer)  --->  Cloudinary (CDN + Storage)
        |
        v
   Cloudinary URL stored in MongoDB
   (served directly from Cloudinary's global CDN)

Scheduled Tasks
        |
AWS EventBridge (cron: 0 0 * * ? *)
        |
AWS Lambda (dailyHandler)
        |
  - Reset habit completion flags
  - Break streaks for missed check-ins
  - Expire potions from user inventories
```

### Key Architectural Decisions

**Serverless-first**: The entire Express application is wrapped with `serverless-http`, which translates AWS API Gateway events into standard Node.js HTTP request/response objects. This means the same codebase runs locally with `node main.js` and on Lambda without any code changes.

**Connection caching for Lambda warm starts**: MongoDB connections are expensive to establish. A module-level `cachedConnection` variable in `db.js` persists the Mongoose connection across invocations within the same Lambda execution environment. This eliminates cold-start database overhead on warm containers.

**Dual Lambda function design**: Web traffic and daily maintenance are handled by two completely separate Lambda functions (`handler` and `dailyHandler`). This ensures that the nightly cron job — which resets all habits, breaks broken streaks, and purges expired potions — never competes with or delays user-facing requests.

**Cloudinary as a CDN**: All user-uploaded assets (avatar images, potion artwork) bypass Lambda entirely. Files are streamed directly from the client to Cloudinary via `multer-storage-cloudinary`. The returned Cloudinary URL is persisted in MongoDB, and assets are served from Cloudinary's global CDN on subsequent requests — zero Lambda bandwidth, zero S3 cost.

**API Gateway stage-aware redirects**: A custom middleware layer intercepts `res.redirect()` calls and prepends the API Gateway stage prefix to relative URLs. This prevents broken redirects that are a common pitfall when running Express behind API Gateway.

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Runtime | Node.js 20.x | Application runtime |
| Web Framework | Express.js 4 | Routing and middleware |
| Templating | EJS | Server-side HTML rendering |
| Database | MongoDB Atlas | Persistent data store |
| ODM | Mongoose 8 | Schema definition and query building |
| Sessions | express-session + connect-mongo | Persistent session storage in MongoDB |
| File Uploads | Multer + multer-storage-cloudinary | In-memory file handling and CDN upload |
| Media CDN | Cloudinary | Asset storage and global delivery |
| AI Integration | Google Gemini API (@google/generative-ai) | Conversational AI features |
| Serverless Adapter | serverless-http | Translates Lambda events to Express |
| IaC | Serverless Framework v3 | Lambda and API Gateway provisioning |
| Cloud Provider | AWS (Lambda, API Gateway, EventBridge) | Compute and scheduling |
| CI/CD | GitHub Actions | Automated deployment pipeline |
| Auth | Cookie-based sessions (httpOnly, Secure, SameSite) | User authentication |

---

## Features

### Habit Management
- Create daily habits with title and description (validated server-side with regex and length constraints).
- Check in habits once per day to increment the streak counter.
- Automatic streak reset at midnight for any habit missed the previous day (via EventBridge cron).
- Visual separation of due habits and completed habits on the dashboard.

### Gamification Engine
- **Coins**: Earned through streak milestones. The `calculateCoinsForStreak` function applies progressive rewards — longer streaks yield higher coin bonuses.
- **Points and Leveling**: Every habit check-in and challenge completion awards leaderboard points via `calculatePoints`, which applies an active-potion multiplier if the user has a booster equipped. Users level up when their cumulative points cross `level * 100` threshold.
- **Potions**: Temporary power-ups purchased with coins. Each potion has an `effectType`, `duration` (days), `activatedAt`, and `expirationDate`. Active potions amplify point calculations until they expire. Expired potions are swept from inventories by the nightly Lambda job.
- **Avatars**: Profile images purchasable with coins. Stored in Cloudinary, referenced in MongoDB by `avatarId` and `imageURL`.

### Social Features
- Send, accept, and decline friend requests.
- Mutual friend confirmation adds both users to each other's `friends` array atomically.
- Smart friend suggestions exclude existing friends, pending senders, and already-requested users.

### Challenges
- Create time-boxed challenges (start date, end date, difficulty, category, points prize).
- Invite friends as participants; each participant has an independent `status` field (`pending`, `accepted`, `declined`, `completed`).
- Completing a challenge awards bonus leaderboard points scaled by the `calculatePoints` function.

### Leaderboard
- Global top-10 ranked by cumulative points, sorted descending.
- Level field displayed alongside each entry.
- Upsert logic ensures a leaderboard document is created on first point award.

### Shop and Inventory
- Browse avatars and potions in the in-game shop.
- Purchased potions are added to `user.inventory` as embedded subdocuments with full metadata.
- Inventory view filters and removes expired potions on load before rendering.
- Potion activation sets `activatedAt` and calculates `expirationDate` based on duration.

### Admin Panel
- Protected by the `isAdmin` middleware (checks `user.isAdmin` boolean in MongoDB).
- Admins can create, edit, and delete avatars and potions.
- Image uploads are handled via Cloudinary integration — no file system dependency.
- All admin routes return HTTP 403 to non-admin users.

---

## Data Models

### User
| Field | Type | Notes |
|---|---|---|
| username | String | Unique identifier |
| email | String | Validated server-side |
| password | String | Stored as plain text (upgrade recommended) |
| phonenumber | String | Pakistani format validated (03xxxxxxxxx) |
| age | Number | |
| friends | [String] | Array of friend usernames |
| coins | Number | Default: 15 |
| isAdmin | Boolean | Default: false |
| inventory | [Potion subdoc] | Embedded with activatedAt, expirationDate |
| avatar | Object | avatarId (ObjectId ref) + imageURL (Cloudinary) |

### Habit
| Field | Type | Notes |
|---|---|---|
| title | String | 3-50 chars, alphanumeric |
| description | String | 5-200 chars |
| username | String | Owner reference |
| streak | Number | Days of consecutive completion |
| isCompletedToday | Boolean | Reset nightly by EventBridge cron |
| lastCheckIn | Date | Used for streak break detection |

### Challenge
| Field | Type | Notes |
|---|---|---|
| title | String | Required |
| description | String | Required |
| startDate / endDate | Date | Required |
| duration | Number | Auto-calculated from date diff |
| difficulty | String | Enum: Easy, Medium, Hard |
| category | String | |
| points | Number | Prize awarded on completion |
| participants | Array | Each has username + status field |
| creator | String | Username of challenge creator |

### Leaderboard
| Field | Type | Notes |
|---|---|---|
| username | String | |
| points | Number | Cumulative, upserted on each award |
| level | Number | Incremented when points cross level * 100 |

### Potion (Shop Item)
| Field | Type | Notes |
|---|---|---|
| name | String | |
| effectType | String | Applied in calculatePoints |
| duration | Number | Days active after activation |
| cost | Number | Coin price |
| imageURL | String | Cloudinary URL |
| description | String | |

### Avatar (Shop Item)
| Field | Type | Notes |
|---|---|---|
| name | String | |
| cost | Number | Coin price |
| imageURL | String | Cloudinary URL |
| description | String | |

---

## API Reference

### Authentication
| Method | Route | Description |
|---|---|---|
| GET | `/` | Render login/signup page |
| POST | `/signup` | Register new user, set session cookie |
| POST | `/login` | Authenticate user, set session cookie |
| GET | `/logout` | Clear cookie and redirect to login |

### Habits
| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/habits` | Yes | List all habits (due and completed) |
| POST | `/createHabit` | Yes | Create a new habit |
| GET | `/checkInHabit/:_id` | Yes | Mark habit complete, award coins/points |
| GET | `/removeHabit/:_id` | Yes | Delete habit |

### Social
| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/friendRequests` | Yes | View friends, requests, and suggestions |
| GET | `/addFriend/:username/:currusername` | No | Send friend request |
| GET | `/confirmRequests/:senderUsername/:receiverUsername` | No | Accept request |
| GET | `/deleteRequest/:senderUsername/:receiverUsername` | No | Decline/cancel request |

### Challenges
| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/createChallenge` | Yes | Render challenge creation form |
| POST | `/createChallenge` | Yes | Save new challenge to DB |
| GET | `/Challenges` | Yes | Challenge hub page |
| GET | `/challengeRequests` | Yes | Pending challenge invitations |
| POST | `/acceptChallenge/:id` | Yes | Accept challenge |
| POST | `/declineChallenge/:id` | Yes | Decline challenge |
| GET | `/viewChallenges` | Yes | View all active challenges |
| POST | `/completeChallenge` | Yes | Mark complete and award points |

### Leaderboard and Shop
| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/leaderboard` | Yes | Top 10 global leaderboard |
| GET | `/shop` | Yes | Browse avatars and potions |
| POST | `/shop/buy-avatar/:id` | Yes | Purchase avatar with coins |
| POST | `/shop/buy-potion/:potionId` | Yes | Purchase potion with coins |
| GET | `/inventory` | Yes | View owned potions and avatar |
| POST | `/activatePotion/:id` | Yes | Activate potion, set expiry |

### Admin (isAdmin required)
| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/admin` | Admin | Admin dashboard |
| GET | `/createPotion` | Admin | Render potion form |
| POST | `/createPotion` | Admin | Upload to Cloudinary and save |
| GET | `/createAvatar` | Admin | Render avatar form |
| POST | `/createAvatar` | Admin | Upload to Cloudinary and save |
| GET | `/editAvatar/:id` | Admin | Render edit form |
| POST | `/editAvatar/:id` | Admin | Update avatar, re-upload if new image |
| GET | `/deleteAvatar/:id` | Admin | Remove avatar from DB |

---

## CI/CD Pipeline

Every push to the `main` branch triggers an automated deployment via GitHub Actions.

```
Push to main
     |
     v
actions/checkout@v3          -- Clone repository
     |
     v
actions/setup-node@v3        -- Install Node.js 20
     |
     v
npm install                  -- Install dependencies
     |
     v
npm install -g serverless@3  -- Install Serverless Framework CLI
     |
     v
serverless deploy            -- Package app, provision Lambda + API Gateway via CloudFormation
     |
     v
serverless logs -f api       -- Tail Lambda logs for immediate error detection
                                (continue-on-error: true — non-blocking)
```

All sensitive values (AWS credentials, MongoDB URI, Cloudinary keys, Gemini API key) are stored as GitHub Actions Secrets and injected at deploy time. No secrets are ever written to source code or the deployment artifact.

The Serverless Framework handles the full CloudFormation lifecycle — creating the Lambda function, the API Gateway REST API with greedy proxy routing (`/{proxy+}`), the IAM execution role, and the EventBridge scheduled rule for the daily cron — all from the single `serverless.yml` definition.

---

## Infrastructure Design Decisions

### Why AWS Lambda instead of a traditional server?

A traditional server (EC2, Render, Heroku) runs continuously, incurring costs even when no users are active. Lambda charges only for actual execution time (billed in milliseconds). For a habit tracker with variable, burst-heavy traffic patterns (morning and evening peaks), Lambda's auto-scaling model is a natural fit — it scales to zero overnight and handles spikes without capacity planning.

### Why serverless-http instead of a native Lambda handler?

Rewriting an Express application into native Lambda event handlers would mean losing the entire Express ecosystem (middleware chain, cookie-parser, session management, routing). The `serverless-http` adapter bridges the two worlds with a single line of code, preserving full Express compatibility while running inside Lambda.

### Why a dedicated dailyHandler function?

If the nightly reset logic ran inside the web handler (triggered on first request of the day), it would add several seconds of latency to one unlucky user's request. By offloading it to a separate Lambda function triggered by AWS EventBridge at midnight UTC (5:00 AM PKT), the reset is decoupled from web traffic entirely. Users never feel it.

### Why Cloudinary instead of S3 for file uploads?

S3 would require pre-signed URLs or an additional Lambda invocation to handle multipart uploads. Cloudinary's `multer-storage-cloudinary` storage engine integrates directly into the existing Multer middleware pipeline — files go from the HTTP request body directly to Cloudinary with no intermediate storage. Cloudinary also provides a global CDN out of the box, serving images from edge nodes close to end users.

### Why MongoDB Atlas with connection caching?

Lambda execution environments are ephemeral but can be reused across multiple invocations ("warm containers"). The `cachedConnection` pattern in `db.js` checks for an existing Mongoose connection before creating a new one. This reduces cold-start overhead from ~500ms to near-zero on warm invocations. `bufferCommands: false` ensures that any connection failure surfaces immediately rather than silently queuing operations.

---

## Environment Variables

The following variables must be configured — in `.env` for local development and as GitHub Actions Secrets for production deployment.

| Variable | Description |
|---|---|
| `MONGO_URI` | MongoDB Atlas connection string |
| `GEMINI_API_KEY` | Google Gemini API key for AI features |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary account cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |

---

## Local Development

**Prerequisites**: Node.js 20+, a MongoDB Atlas cluster, a Cloudinary account.

```bash
# Clone the repository
git clone https://github.com/fahadAziz-byte/Gamify-habit-tracker.git
cd Gamify-habit-tracker

# Install dependencies
npm install

# Create environment file
cp .env.example .env
# Fill in all required variables in .env

# Start local development server
node main.js
# Server starts at http://localhost:3000
```

The application detects whether it is running locally or inside Lambda by checking `process.argv[1]`. When running directly with `node main.js`, it boots a standard Express HTTP server on port 3000. When invoked by Lambda, the same file exports `handler` and `dailyHandler` without starting a listening server.

---

## Project Structure

```
Gamify-habit-tracker/
|
+-- main.js                   # Application entry point, all Express routes, Lambda exports
+-- db.js                     # Mongoose connection with Lambda warm-start caching
+-- serverless.yml            # Infrastructure as Code — Lambda, API Gateway, EventBridge
+-- updateAdmin.js            # One-off script to promote a user to admin in MongoDB
+-- package.json
|
+-- .github/
|   +-- workflows/
|       +-- deploy.yml        # GitHub Actions CI/CD pipeline
|
+-- config/
|   +-- cloudinary.js         # Cloudinary SDK init + multer-storage-cloudinary config
|
+-- middleware/
|   +-- auth.js               # Cookie-based authentication guard
|
+-- models/
|   +-- usersModel.js         # User schema (coins, inventory, avatar, friends, isAdmin)
|   +-- habits.js             # Habit schema (streak, isCompletedToday, lastCheckIn)
|   +-- challenges.js         # Challenge schema (participants array with status)
|   +-- Potion.js             # Shop item — power-up potions
|   +-- avatar.js             # Shop item — profile avatars
|   +-- leaderboard.js        # Points and level tracking per user
|   +-- friendRequest.js      # Pending friend request tracking
|   +-- dailyStreaks.js        # Idempotency guard for daily cron job
|
+-- public/
|   +-- javascript/
|       +-- calculateCoins.js # Streak-based coin reward formula
|       +-- calculatePoints.js# Points formula with active-potion multiplier
|
+-- views/                    # EJS server-side templates
    +-- Registration/
    +-- admin/
    +-- habits/
    +-- partials/
    +-- Homepage.ejs
    +-- shop.ejs
    +-- leaderboard.ejs
    +-- friendRequests.ejs
    +-- inventory.ejs
    +-- Challenges.ejs
    +-- createChallenge.ejs
    +-- challengeRequests.ejs
    +-- viewChallenges.ejs
    +-- progressBar.ejs
```

---

## Author

**Fahad Aziz**  
GitHub: [@fahadAziz-byte](https://github.com/fahadAziz-byte)
