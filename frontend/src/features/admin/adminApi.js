const base = (import.meta.env.VITE_ADMIN_BASE ?? '').replace(/\/$/, '');

function buildHeaders({ json = true } = {}) {
  const h = {};
  if (json) h['Content-Type'] = 'application/json';
  const token = sessionStorage.getItem('accessToken');
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

export async function get(path) {
  const res = await fetch(base + path, { method: 'GET', headers: buildHeaders({ json: false }) });
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

export async function getBlob(path) {
  const res = await fetch(base + path, { method: 'GET', headers: buildHeaders({ json: false }) });
  const blob = await res.blob().catch(() => null);
  return { status: res.status, blob };
}

export async function put(path, data) {
  const res = await fetch(base + path, {
    method: 'PUT',
    headers: buildHeaders({ json: true }),
    body: JSON.stringify(data || {})
  });
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

export default { get, getBlob, put };
