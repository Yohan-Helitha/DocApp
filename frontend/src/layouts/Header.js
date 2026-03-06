function Header({ onNavigate }){
  return (
    <header className="site-header">
      <div className="logo">DocApp</div>
      <nav>
        <button className="btn" onClick={()=>onNavigate('/register/patient')}>Register</button>
        <button className="btn btn-primary" onClick={()=>onNavigate('/login')}>Login</button>
      </nav>
    </header>
  );
}
window.Header = Header;
