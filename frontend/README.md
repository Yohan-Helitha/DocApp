# Frontend - Minimal SPA

Files:
- `index.html` - main entry (loads React via CDN)
- `style.css` - basic styles
- `src/` - layered code: `core/`, `layouts/`, `features/`

Usage (development):

1. Install dependencies

```bash
cd frontend
npm install
```

2. Start dev server (Vite)

```bash
npm run dev
```

The dev server runs on `http://localhost:5173` by default. The app calls the auth API at `http://localhost:4000` by default; you can change this via the `VITE_API_BASE` environment variable.

Notes:
- This project uses Tailwind CSS. The color tokens are configured in `tailwind.config.cjs`:
	- `primary`: #0B9588
	- `dark`: #0F172A
	- `pagebg`: #F9FAFC

Docker / Production (simple)

Build and run a Docker image that serves the production build via nginx:

```bash
cd frontend
npm install
npm run build
docker build -t docapp-frontend:latest .
docker run -p 8080:80 docapp-frontend:latest
```

Development proxy

Vite dev server is configured to proxy `/api` to `http://localhost:4000`. This lets you call `/api/...` from the frontend without changing URLs, and the dev server will forward requests to the backend.

# Frontend (Monolithic Layered Architecture)

This frontend follows a **single application layered design** for easier handling in this assignment.

## Layers
- `core/` - global services, guards, interceptors, config
- `features/` - feature modules (auth, patient, doctor, appointment, telemedicine, admin, payment, notification, symptom-checker)
- `shared/` - reusable components, pipes, utilities
- `layouts/` - app shell layouts for role-based views

The frontend should be asynchronous (React/Angular/jQuery+AJAX) as required by the assignment.
