# API Gateway

Entry point for routing frontend requests to backend microservices.

Expected responsibilities:
- Route and aggregate API calls.
- Validate JWT tokens via Auth Service.
- Enforce role-based access policies.
- Apply rate limiting and request logging.

> Note: At this stage of the project only the Auth Service is fully implemented. The initial API Gateway implementation should therefore focus on routing frontend requests to the auth-service (e.g. `/api/v1/auth/...`), handling JWT validation, and exposing a single entrypoint for the frontend. Additional routes to other microservices can be added as those services are developed.
