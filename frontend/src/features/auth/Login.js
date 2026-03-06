function Login({ onNavigate }){
  const [email,setEmail] = React.useState('');
  const [password,setPassword] = React.useState('');
  const [msg,setMsg] = React.useState('');
  async function submit(e){
    e.preventDefault();
    const r = await Api.post('/api/v1/auth/login', { email, password });
    if(r.status===200 && r.body && r.body.accessToken){
      sessionStorage.setItem('accessToken', r.body.accessToken);
      try{ const payload = JSON.parse(atob(r.body.accessToken.split('.')[1]));
        const role = payload.role;
        if(role === 'doctor') onNavigate('/success/doctor'); else onNavigate('/success/patient');
        return;
      }catch(e){ onNavigate('/'); return; }
    }
    setMsg(r.body && r.body.error ? r.body.error : 'Login failed');
  }
  return (
    <div className="container"><div className="card">
      <h3>Login</h3>
      <form onSubmit={submit}>
        <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" />
        <input value={password} onChange={e=>setPassword(e.target.value)} type="password" placeholder="Password" />
        <button className="btn btn-primary" type="submit">Login</button>
      </form>
      <div>{msg}</div>
    </div></div>
  );
}
window.Login = Login;
