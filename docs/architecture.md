# OctoFit Tracker architecture

OctoFit Tracker is a three-tier application for a school fitness program. The starter code includes API contracts and intentionally incomplete implementation points so you can use GitHub Copilot agent mode in a test-driven loop.

![Three-tier OctoFit architecture](../.github/images/octofit-architecture.svg)

## Tier boundaries

- **Presentation tier**: React 19, Vite, React Router, Bootstrap, and a shared API client in `octofit-tracker/frontend/src`.
- **Logic tier**: Express and TypeScript routes/services in `octofit-tracker/backend/src` expose `/api/*` behavior on port `8000`.
- **Data tier**: Mongoose models and seed data in `octofit-tracker/backend/src/models` and `src/scripts/seed.ts` persist to MongoDB on port `27017`.

## Ports and environment rules

- MongoDB: `27017`
- Express API: `8000`
- Vite frontend: `5173`
- The browser calls relative `/api` paths. Vite proxies them to `http://localhost:8000`, so the unauthenticated API port stays private in Codespaces. `VITE_API_BASE_URL` can override the base URL.

## API contract

| Capability | Method and path | Expected behavior |
| --- | --- | --- |
| Activity tracking | `GET /api/activities`, `POST /api/activities` | List and create valid activity records. POST accepts `userId`, `teamId`, `type`, and `minutes`; `userId` and `teamId` must be well-formed IDs for an existing user and team; otherwise respond with a deliberate 4xx (never a 500 from a cast error). A created activity stores the submitted `user`, `team`, `type`, and `minutes` plus computed `points` and `occurredAt`. |
| Teams | `GET /api/teams`, `POST /api/teams` | List and create teams with members. Created and listed teams keep the submitted `name` and `mascot`. Reject a team without a name or with malformed/nonexistent member IDs with `400`. |
| Leaderboard | `GET /api/leaderboard` | Return every team ordered by the sum of its activity points, highest first; teams without activity have zero points. Each entry has `teamName`, `totalPoints`, and a 1-based `rank`. |
| Workout suggestions | `GET /api/workouts/suggestions/:userEmail` | Recommend workouts matching the user's goal or recent activity for the matching seeded user's email address, with a `reason` explaining why. Return an empty suggestions list if no matching workout exists rather than recommending a different focus. An email with no matching user returns a deliberate 4xx (for example, `404`). |

## Implementation decisions

- Presentation tier decision: Build the React app as route-driven pages that fetch from the shared API client and render data from `/api/*` rather than embedding logic in components. Keep each page focused on list/detail views for activities, teams, leaderboard, and workout suggestions, with accessible headings and status messaging if no data is available.
- Logic tier decision: Implement the Express API as thin route handlers that validate request data, call service logic, and return consistent JSON plus deliberate 4xx errors for invalid input. Keep business rules (leaderboard aggregation, workout matching, input validation) in backend services instead of ad hoc route code.
- Data tier decision: Use Mongoose schemas with required fields, typed refs, and seeded representative data for users, teams, activities, and workouts. The schema should enforce that required identity and relationship fields exist so validation failures are caught before the API responds.
- Activity tracking approach: Store activity docs with user/team refs, type, minutes, computed points, and occurredAt. Validate that `userId` and `teamId` correspond to existing records; reject invalid IDs with a 400 instead of letting Mongoose cast errors bubble into a 500.
- Team management approach: Keep `name` and `mascot` required at the schema and API layers, validate member IDs against existing users, and maintain a `members` array of user ObjectIds. Team creation/list endpoints expose the member references expected by the frontend contract.
- Leaderboard approach: Aggregate points by team by summing persisted activity points, include teams with no activities at zero points, sort descending by total, and assign a 1-based rank. The UI renders the resulting order without client-side calculations.
- Workout suggestions approach: Match a request by the seeded user email, then choose workouts based on the user’s goal or most recent activity pattern (for example, running/endurance vs strength). Suggestions match that focus and include a human-readable reason; do not return a different-focus workout as a fallback.

## Test plan

- Data-tier command: `npm run test:data --prefix octofit-tracker/backend`
  - Covers required Mongoose fields and idempotent seed behavior without deleting unrelated records.
- API command: `npm run test:api --prefix octofit-tracker/backend`
  - Covers activity validation and creation, team membership validation, complete leaderboard ordering, and focus-matched workout suggestions.
- Frontend command: `npm test --prefix octofit-tracker/frontend`
  - Covers API-driven activity, team, leaderboard, and workout views, including loading, empty, and error states.
- Backend build command: `npm run build --prefix octofit-tracker/backend`
  - Type-checks the Express and Mongoose implementation.
- Frontend build command: `npm run build --prefix octofit-tracker/frontend`
  - Type-checks and builds the Vite/React application.
