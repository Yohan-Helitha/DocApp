const base = (import.meta.env.VITE_ADMIN_BASE ?? '').replace(/\/$/, '');

const headers = { 'Content-Type': 'application/json' };

export async function get(path) {
  const res = await fetch(base + path, { method: 'GET', headers });
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

export async function put(path, data) {
  const res = await fetch(base + path, {
    method: 'PUT',
    headers,
    body: JSON.stringify(data || {})
  });
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

export default { get, put };
