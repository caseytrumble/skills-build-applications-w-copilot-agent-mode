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
| Teams | `GET /api/teams`, `POST /api/teams` | List and create teams with members. Created and listed teams keep the submitted `name` and `mascot`. Reject a team without a name with `400`. |
| Leaderboard | `GET /api/leaderboard` | Return teams ordered by the sum of their activity points, highest first. Each entry has `teamName`, `totalPoints`, and a 1-based `rank`. |
| Workout suggestions | `GET /api/workouts/suggestions/:userEmail` | Recommend workouts from recent activity patterns for the matching seeded user's email address. The first suggestion's `focus` matches that user's goal or recent activity, with a `reason` explaining why. An email with no matching user returns a deliberate 4xx (for example, `404`). |

## Implementation decisions

- Presentation tier decision: Build the React app as route-driven pages that fetch from the shared API client and render data from `/api/*` rather than embedding logic in components. Keep each page focused on list/detail views for activities, teams, leaderboard, and workout suggestions, with accessible headings and status messaging if no data is available.
- Logic tier decision: Implement the Express API as thin route handlers that validate request data, call service logic, and return consistent JSON plus deliberate 4xx errors for invalid input. Keep business rules (leaderboard aggregation, workout matching, input validation) in backend services instead of ad hoc route code.
- Data tier decision: Use Mongoose schemas with required fields, typed refs, and seeded representative data for users, teams, activities, and workouts. The schema should enforce that required identity and relationship fields exist so validation failures are caught before the API responds.
- Activity tracking approach: Store activity docs with user/team refs, type, minutes, computed points, and occurredAt. Validate that `userId` and `teamId` correspond to existing records; reject invalid IDs with a 400 instead of letting Mongoose cast errors bubble into a 500.
- Team management approach: Keep `name` and `mascot` required at the schema and API layers, and maintain a `members` array of user ObjectIds. Team creation/list endpoints should expose the member references in the response payload as expected by the frontend contract.
- Leaderboard approach: Aggregate points by team by summing each team’s activity points, sort descending by total, and assign a 1-based rank. This should be computed from the persisted activity records so the UI can render a consistent leaderboard without client-side calculations.
- Workout suggestions approach: Match a request by the seeded user email, then choose workout suggestions based on the user’s goal or the most recent activity pattern (for example, running/endurance vs strength). The first suggestion should reflect the user’s pattern and include a human-readable reason.

## Test plan

- Data-tier command: `npm run test:data --prefix octofit-tracker/backend`
  - Current failures indicate the Mongoose validation contracts are incomplete: `User`, `Team`, `Activity`, and `Workout` do not yet require the fields the API contract expects, even though the seed test passes.
- API command: `npm run test:api --prefix octofit-tracker/backend`
  - Current failures indicate route handlers are not yet validating requests and returning the correct 4xx status codes, and the leaderboard/workout logic is not implemented or is returning the wrong payload shape.
- Frontend command: `npm test --prefix octofit-tracker/frontend`
  - Current failures show the app is still rendering placeholder content (“Implementation pending”) instead of the real activity/team/leaderboard/workout screens expected by the presentation contract.
- Backend build command: `npm run build --prefix octofit-tracker/backend`
  - Use after the data and API contracts are fixed to catch TypeScript or Express compile problems before verifying runtime behavior again.
- Frontend build command: `npm run build --prefix octofit-tracker/frontend`
  - Use after the UI is implemented to confirm the Vite/React app still builds cleanly with the real API-driven components.
