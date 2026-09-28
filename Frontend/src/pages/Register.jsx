// src/pages/Register.jsx
import { useState } from 'react';
import './Register.css';

function Register() {
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [confirmMotDePasse, setConfirmMotDePasse] = useState("");
  const [erreur, setErreur] = useState("");

  function handleSubmit(e) {
    e.preventDefault();

    if (email === "" || motDePasse === "" || confirmMotDePasse === "") {
      setErreur("Merci de remplir tous les champs");
      return;
    }

    if (motDePasse !== confirmMotDePasse) {
      setErreur("Les mots de passe ne correspondent pas");
      return;
    }

    // Appel API pour créer le compte
    console.log("Inscription avec :", email, motDePasse);
    setErreur("");
  }

  return (
    <div className="register-container">
      <h1>Register</h1>

      <form onSubmit={handleSubmit}>
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
    <div className='linklogin'>
      <p style={{ marginTop: '16px' }}>
     Already have an account? <a href="/login">Sign in</a>
      </p> </div>

        {erreur && <p style={{ color: 'red' }}>{erreur}</p>}

           <button 
          type="submit" 
          style={{ fontFamily: "'Bauhaus Bugler', sans-serif" }}
        >
          Send a request
        </button>
      </form>
    </div>
  );
}

export default Register;