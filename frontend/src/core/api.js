const Api = {
  // Frontend talks to backend through API Gateway.
  // Prefer same-origin in production (nginx/Vite dev server can proxy /api).
  // Override with VITE_API_BASE if you need an absolute URL.
  base: (import.meta.env.VITE_API_BASE ?? "").replace(/\/$/, ""),
  headers() {
    return { "Content-Type": "application/json" };
  },
  async post(path, body, token) {
    const headers = this.headers();
    if (token) headers["Authorization"] = "Bearer " + token;
    const res = await fetch(this.base + path, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => null);
    return { status: res.status, body: json };
  },
  async get(path, token) {
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = "Bearer " + token;
    const res = await fetch(this.base + path, { method: "GET", headers });
    const json = await res.json().catch(() => null);
    return { status: res.status, body: json };
  },
  async put(path, body, token) {
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = "Bearer " + token;
    const res = await fetch(this.base + path, {
      method: "PUT",
      headers,
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => null);
    return { status: res.status, body: json };
  },
  async delete(path, token) {
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = "Bearer " + token;
    const res = await fetch(this.base + path, { method: "DELETE", headers });
    const json = await res.json().catch(() => null);
    return { status: res.status, body: json };
  },
};

// expose for legacy global use and default export
window.Api = Api;
export default Api;
