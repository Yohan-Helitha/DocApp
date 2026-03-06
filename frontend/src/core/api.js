const Api = {
  base: import.meta.env.VITE_API_BASE || 'http://localhost:4000',
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
export default Api;
// core/api.js - simple API helper
const Api = {
  base: window.__API_BASE__ || 'http://localhost:4000',
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
window.Api = Api;
