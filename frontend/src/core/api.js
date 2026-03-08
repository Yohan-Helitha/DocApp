const Api = {
  // Frontend talks to backend through API Gateway.
  // Default gateway URL is localhost:4000 for local development.
  base: (import.meta.env.VITE_API_BASE || 'http://localhost:4000').replace(/\/$/, ''),
  headers() { return { 'Content-Type': 'application/json' }; },
  async post(path, body){
    const res = await fetch(this.base + path, { method: 'POST', headers: this.headers(), body: JSON.stringify(body) });
    const json = await res.json().catch(()=>null);
    return { status: res.status, body: json };
  },
  async get(path, token){
    const headers = { 'Content-Type':'application/json' };
    if(token) headers['Authorization'] = 'Bearer ' + token;
    const res = await fetch(this.base + path, { method: 'GET', headers });
    const json = await res.json().catch(()=>null);
    return { status: res.status, body: json };
  }
};

// expose for legacy global use and default export
window.Api = Api;
export default Api;
