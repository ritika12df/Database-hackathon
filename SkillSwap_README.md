# SkillSwap — Trade Skills, Not Money

**An Appwrite TablesDB Hackathon 2026 project**

SkillSwap is a time-credit skill exchange marketplace. Members can teach a one-hour lesson to earn one credit, and spend credits to learn from someone else. No payment provider, AI API, or vector database is required.

> **Demo:** [Add deployed URL]  
> **Demo video:** [Add YouTube URL]  
> **Database:** Appwrite TablesDB only (Appwrite Auth also handles accounts)

## The problem

People can have valuable knowledge to share yet lack the cash to pay for lessons. SkillSwap demonstrates a simple exchange network in which an hour of teaching unlocks an hour of learning.

## How it works

1. Register or sign in with email and password.
2. Browse the skill marketplace or publish a skill you can teach.
3. Request a lesson from another member.
4. The teacher accepts and marks the lesson delivered.
5. The learner confirms delivery. **One time credit transfers** from learner to teacher.
6. The completed exchange is recorded in the ledger.

Each new account starts with **two demonstration credits**. These are not money and have no real-world monetary value.

## Features

- Email/password sign-up and sign-in with Appwrite Auth
- Post skills and browse listings
- Request, accept, reject, or cancel lesson exchanges
- Teacher confirmation of delivery and learner confirmation of completion
- Balance updates and a ledger recording completed transfers
- Server-side session verification before each protected action
- Atomic TablesDB transaction for completion

## What makes the database central?

SkillSwap uses **four tables** in a single Appwrite TablesDB database:

| Table ID | Purpose |
| --- | --- |
| `profiles` | Member display names and credit balances |
| `skills` | Skills offered by members |
| `requests` | Lesson requests and their lifecycle status |
| `ledger` | Completed one-credit transfers |

On learner confirmation, one TablesDB transaction stages **four operations** and commits them together:

1. Decrement learner credits, with a minimum of zero.
2. Increment teacher credits.
3. Mark the request `completed`.
4. Create the ledger row.

If the transaction fails, those operations do not partially commit. This makes the core exchange workflow more robust than separate uncoordinated updates. The app also checks allowed request states, and transaction conflicts can cause an operation to be rejected.

## Tech stack

- Next.js 15 (App Router)
- React 19
- Appwrite Authentication
- **Appwrite TablesDB** (only database type)
- Node.js Appwrite SDK (`node-appwrite`)
- JavaScript and CSS
- Vercel for optional hosting

## Run locally

### Requirements

- Node.js 22 or another currently supported LTS version
- An Appwrite Cloud project with a TablesDB database and email/password sign-in enabled

```bash
npm install
```

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://YOUR_REGION.cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=YOUR_PROJECT_ID
APPWRITE_API_KEY=YOUR_PRIVATE_SERVER_API_KEY
APPWRITE_DATABASE_ID=YOUR_ACTUAL_DATABASE_ID
```

**Use the actual database ID shown in the Appwrite Console.** The database display name `skillswap` may differ from its ID. Never commit `.env.local` or expose `APPWRITE_API_KEY` to browser code.

The server key requires row read/write and transaction permissions for the app. Schema-creation permissions are needed only if using the optional setup script. Scope labels can vary by Appwrite version.

Create the four tables and required columns in your **existing** TablesDB database (don't run the database-creation script if you already created it).

| Table | Required columns (Appwrite types) |
| --- | --- |
| `profiles` | `name` varchar(80); `credits` integer; `joinedAt` varchar(40) |
| `skills` | `ownerId` varchar(36); `title` varchar(100); `description` varchar(500); `category` varchar(40); `active` boolean |
| `requests` | `skillId` varchar(36); `skillTitle` varchar(100); `providerId` varchar(36); `learnerId` varchar(36); `status` varchar(25); `message` varchar(240); `createdAt` varchar(40) |
| `ledger` | `fromId` varchar(36); `toId` varchar(36); `requestId` varchar(36); `amount` integer; `createdAt` varchar(40) |

Set all listed columns to required, and keep table access restricted. The backend performs reads and writes after verifying each user's session; do not give public write permissions to credit rows.

```bash
npm run dev
```

Open http://localhost:3000. Add `localhost` as an Appwrite **Web** platform.

## Deployment (Vercel)

1. Push the source code to a **public** GitHub repository. Check first that `.env.local`, API keys, and credentials are not tracked.
2. In [Vercel](https://vercel.com/new), import the GitHub repository.
3. Set the framework to **Next.js** and root directory to the folder containing `package.json`.
4. Add the four environment variables above in **Project Settings → Environment Variables**. Put the secret key only in `APPWRITE_API_KEY` (without `NEXT_PUBLIC_`).
5. Deploy; copy your `*.vercel.app` hostname.
6. In [Appwrite Console](https://cloud.appwrite.io), add a **Web platform** with your live hostname (no protocol), keeping `localhost` for local tests.
7. Test new-account login and a full two-user credit exchange at the live URL.
8. Changes to Vercel environment variables require a redeploy to take effect.

## Manual two-user test

- Open Alice in a regular browser and Bob in an incognito window.
- Both register and start with two demo credits.
- Alice publishes an Excel lesson.
- Bob requests it; Alice accepts it and marks it delivered.
- Bob confirms completion.
- Expected: Bob's credits `2 → 1`; Alice's credits `2 → 3`; request becomes `completed`; one new ledger row exists.
- Attempt to repeat the confirmation: a second transfer should not succeed.

## Known MVP limitations

- No real lesson scheduling, video calls, or verification of actual attendance
- Introductory credits can be abused through multiple accounts; no anti-sybil protection
- No built-in disputes, moderation, or recovery flow
- No email-verification enforcement or rate limiting in this starter
- Dashboard query uses a 100-row limit; production use requires pagination
- API-key-based server access requires rigorous authentication and input validation
- This is a hackathon prototype, **not a production money or payments system**

## Hackathon submission

- Public GitHub repository: [Add URL]
- Demo video (2–3 minutes maximum): [Add YouTube URL]
- Optional live app: [Add deployed URL]
- Submit at https://hackathon.appwrite.io/hacker by **October 31, 2026, 11:59 PM Pacific Time**.

## Credits and attribution

Developed as a solo hackathon project. Appwrite SDK, Next.js, React, and any other included dependencies retain their respective licenses. Describe any AI assistance accurately if relevant to your submission.
