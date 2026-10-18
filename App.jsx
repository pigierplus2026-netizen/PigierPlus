import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import Auth from './Auth.jsx'
import { Accueil, Epreuves, Stages, Profil, Admin } from './pages.jsx'

export default function App() {
  const [session, setSession] = useState(null)
  const [prete, setPrete] = useState(false)
  const [p, setP] = useState(null)
  const [tab, setTab] = useState('accueil')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setPrete(true) })
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
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

  const onglets = [['accueil', 'Accueil'], ['epreuves', 'Épreuves']]
  if (p.role !== 'enseignant') onglets.push(['stages', 'Stages'])
  if (p.role === 'administration') onglets.push(['admin', 'Admin'])
  onglets.push(['profil', 'Profil'])

  return (
    <div className="shell">
      <header className="top"><img src="/logo.png" alt="Pigier Bénin" /><span>{p.prenom} {p.nom}</span></header>
      <nav className="nav" aria-label="Navigation principale">
        {onglets.map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}
      </nav>
      <main>
        {tab === 'accueil' && <Accueil p={p} />}
        {tab === 'epreuves' && <Epreuves p={p} />}
        {tab === 'stages' && <Stages p={p} />}
        {tab === 'admin' && <Admin p={p} />}
        {tab === 'profil' && <Profil p={p} recharger={charger} sortir={sortir} />}
        <p className="muted" style={{ textAlign: 'center', marginTop: 28 }}>À Pigier Bénin, nous sommes une famille</p>
      </main>
    </div>
  )
}
