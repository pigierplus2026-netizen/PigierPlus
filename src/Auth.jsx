import { useState } from 'react'
import { supabase } from './supabase'

export default function Auth() {
  const [mode, setMode] = useState('connexion')
  const [f, setF] = useState({ email: '', mdp: '', nom: '', prenom: '' })
  const [msg, setMsg] = useState(null)
  const [voir, setVoir] = useState(false)
  const maj = (k) => (e) => setF({ ...f, [k]: e.target.value })

  const envoyer = async (e) => {
    e.preventDefault(); setMsg(null)
    if (mode === 'connexion') {
      const { error } = await supabase.auth.signInWithPassword({ email: f.email, password: f.mdp })
      if (error) setMsg({ t: 'Email ou mot de passe incorrect.' })
    } else {
      const { data, error } = await supabase.auth.signUp({ email: f.email, password: f.mdp, options: { data: { nom: f.nom, prenom: f.prenom } } })
      if (error) setMsg({ t: error.message })
      else if (!data.session) setMsg({ t: 'Compte créé. Confirmez votre adresse email avec le lien reçu, puis connectez-vous.', ok: true })
      else setMsg({ t: 'Compte créé. Il sera actif après validation par l\'administration.', ok: true })
    }
  }
  const oubli = async () => {
    if (!f.email) return setMsg({ t: 'Saisissez d\'abord votre email.' })
    await supabase.auth.resetPasswordForEmail(f.email)
    setMsg({ t: 'Si ce compte existe, un email de réinitialisation vient d\'être envoyé.', ok: true })
  }

  return (
    <div className="center">
      <img src="/logo.png" alt="Pigier Bénin" />
      <h1>À Pigier Bénin, nous sommes une famille</h1>
      <form onSubmit={envoyer}>
        {mode === 'inscription' && <>
          <label htmlFor="prenom">Prénom</label><input id="prenom" required value={f.prenom} onChange={maj('prenom')} />
          <label htmlFor="nom">Nom</label><input id="nom" required value={f.nom} onChange={maj('nom')} />
        </>}
        <label htmlFor="email">Email</label>
        <input id="email" type="email" required autoComplete="email" value={f.email} onChange={maj('email')} />
        <label htmlFor="mdp">Mot de passe</label>
        <input id="mdp" type={voir ? 'text' : 'password'} required minLength={8} autoComplete={mode === 'connexion' ? 'current-password' : 'new-password'} value={f.mdp} onChange={maj('mdp')} />
        <label style={{ fontWeight: 400 }}><input type="checkbox" style={{ width: 'auto', minHeight: 0 }} checked={voir} onChange={() => setVoir(!voir)} /> Afficher le mot de passe</label>
        {msg && <div className={'msg' + (msg.ok ? ' ok' : '')} role="alert">{msg.t}</div>}
        <button className="btn jaune" style={{ width: '100%' }} type="submit">{mode === 'connexion' ? 'Se connecter' : 'Créer mon compte'}</button>
      </form>
      <button className="btn ghost" onClick={() => { setMsg(null); setMode(mode === 'connexion' ? 'inscription' : 'connexion') }}>
        {mode === 'connexion' ? 'Créer un compte' : 'J\'ai déjà un compte'}
      </button>
      {mode === 'connexion' && <button className="btn ghost" onClick={oubli}>Mot de passe oublié</button>}
    </div>
  )
}
