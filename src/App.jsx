import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import Auth from './Auth.jsx'
import Coque from './moodle.jsx'

export default function App() {
  const [session, setSession] = useState(null)
  const [prete, setPrete] = useState(false)
  const [p, setP] = useState(null)
  const [recup, setRecup] = useState(false)
  const [nouveau, setNouveau] = useState('')
  const [info, setInfo] = useState(null)

  // Écran d'ouverture : emblème P de Pigier, retiré après 1,5 s
  useEffect(() => {
    const t = setTimeout(() => {
      const s = document.getElementById('splash')
      if (s) { s.classList.add('fin'); setTimeout(() => s.remove(), 600) }
    }, 1500)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setPrete(true) })
    const { data } = supabase.auth.onAuthStateChange((e, s) => { setSession(s); if (e === 'PASSWORD_RECOVERY') setRecup(true) })
    return () => data.subscription.unsubscribe()
  }, [])

  const charger = async () => {
    if (!session) { setP(null); return }
    const { data } = await supabase.from('profils').select('*').eq('id', session.user.id).single()
    setP(data)
  }
  useEffect(() => { charger() }, [session])

  if (!prete) return <div className="center">Chargement…</div>
  if (!session) return <Auth />
  if (!p) return <div className="center">Chargement…</div>

  if (recup) return (
    <div className="center">
      <img src="/logo.png" alt="Pigier Bénin" />
      <h1>Choisissez un nouveau mot de passe</h1>
      <form onSubmit={async (e) => {
        e.preventDefault()
        const { error } = await supabase.auth.updateUser({ password: nouveau })
        if (error) setInfo({ t: error.message }); else { setRecup(false); setNouveau('') }
      }}>
        <label htmlFor="nmdp">Nouveau mot de passe (8 caractères minimum)</label>
        <input id="nmdp" type="password" required minLength={8} autoComplete="new-password" value={nouveau} onChange={(e) => setNouveau(e.target.value)} />
        {info && <div className="msg" role="alert">{info.t}</div>}
        <button className="btn jaune" style={{ width: '100%' }} type="submit">Enregistrer</button>
      </form>
    </div>
  )

  const sortir = () => supabase.auth.signOut()
  if (!p.valide) return (
    <div className="center">
      <img src="/logo.png" alt="Pigier Bénin" />
      <h1>Compte en attente de validation</h1>
      <p>L'administration doit valider votre compte avant que vous puissiez accéder à la plateforme.</p>
      <button className="btn ghost" onClick={charger}>Vérifier à nouveau</button>
      <button className="btn ghost" onClick={sortir}>Se déconnecter</button>
    </div>
  )

  return <Coque p={p} recharger={charger} sortir={sortir} />
}
