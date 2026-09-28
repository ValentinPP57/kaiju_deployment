import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import logoTCM from '../assets/logoTCM.png';  
import './Login.css';
 
function Login() {
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [erreur, setErreur] = useState("");
  const [loading, setLoading] = useState(false);
 
  const navigate = useNavigate();
 
  async function handleSubmit(e) {
    e.preventDefault();
 
    if (email === "" || motDePasse === "") {
      setErreur("Merci de remplir tous les champs");
      return;
    }
 
    setErreur("");
    setLoading(true);
 
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          password: motDePasse,
        }),
      });
 
      const data = await response.json();
 
      if (!response.ok) {
        throw new Error(data.error || "Identifiants invalides");
      }
 
      // Stockage du JWT et des infos utilisateur
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
 
      // Redirection vers le dashboard
      navigate('/index');
    } catch (err) {
      setErreur(err.message);
    } finally {
      setLoading(false);
    }
  }
 
  return (
    <div className="login-container">
      <h2>TCM</h2>
      <img src={logoTCM} alt="Logo TCM" className="logo-tcm" />
      <h3>Tokyork Crisis Management Foundation</h3>
 
      <form onSubmit={handleSubmit}>
        <h1>Login</h1>
 
        <div>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jarvis@email.com"
          />
        </div>
 
        <div>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
            placeholder="••••••••"
          />
        </div>
        
        <div className='checkbox-register'>
          <label className='checkbox-label'>
            <input type="checkbox" required />
            General condition of the TCM  
          </label>
     
          <a href="/register">Register here</a>
        </div>
 
        {erreur && <p style={{ color: 'red', marginTop: '10px' }}>{erreur}</p>}
 
        <button
          type="submit"
          disabled={loading}
          style={{ fontFamily: "'Bauhaus Bugler', sans-serif" }}
        >
          {loading ? "Connexion..." : "Login"}
        </button>
      </form>
    </div>
  );
}
 
export default Login;