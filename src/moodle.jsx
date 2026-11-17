import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { Epreuves, Stages, Profil, Admin } from './pages.jsx'
import { CampusPlus, ViePlus, ScolariteAdmin } from './plus.jsx'

const D = { menu: 'M3 6h18M3 12h18M3 18h18', home: 'M3 11l9-8 9 8M5 10v10h14V10', calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4', file: 'M6 3h8l4 4v14H6zM14 3v4h4M9 12h6M9 16h6', briefcase: 'M3 8h18v12H3zM9 8V5h6v3M3 13h18', people: 'M9 11a3 3 0 100-6 3 3 0 000 6zM3 20c0-4 3-6 6-6s6 2 6 6M16 5a3 3 0 010 6M18 14c2 1 3 3 3 6', mail: 'M3 6h18v12H3zM3 7l9 6 9-6', user: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21c0-5 4-7 8-7s8 2 8 7', gear: 'M12 15a3 3 0 100-6 3 3 0 000 6zM12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2', download: 'M12 4v11M7 11l5 5 5-5M4 20h16', logout: 'M9 4H4v16h5M16 8l4 4-4 4M20 12H9' }
const I = ({ n }) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: 'none', marginRight: 10 }}><path d={D[n]} /></svg>
const Msg = ({ m }) => (m ? <div className={'msg' + (m.ok ? ' ok' : '')} role="status">{m.t}</div> : null)
const jj = (d) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
const cle = (d) => { const x = new Date(d); return x.getFullYear() + '-' + (x.getMonth() + 1) + '-' + x.getDate() }

/* ---------- navigation par adresse (#/page) : changement de page sans rechargement ---------- */
const lire = () => (window.location.hash || '').replace(/^#\/?/, '') || 'accueil'
function useRoute() {
  const [r, setR] = useState(lire())
  useEffect(() => {
    const h = () => { setR(lire()); window.scrollTo(0, 0) }
    window.addEventListener('hashchange', h); return () => window.removeEventListener('hashchange', h)
  }, [])
  return [r, (x) => { window.location.hash = '/' + x }]
}
function useInstall() {
  const [ev, setEv] = useState(null)
  useEffect(() => {
    const h = (e) => { e.preventDefault(); setEv(e) }
    window.addEventListener('beforeinstallprompt', h); window.addEventListener('appinstalled', () => setEv(null))
    return () => window.removeEventListener('beforeinstallprompt', h)
  }, [])
  const dejaInstallee = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone
  return { possible: !!ev && !dejaInstallee, ios: /iphone|ipad|ipod/i.test(navigator.userAgent) && !dejaInstallee, installer: () => { if (ev) { ev.prompt(); setEv(null) } } }
}

const ROUTES = (p) => {
  const e = p.role === 'entreprise', ens = p.role === 'enseignant'
  const r = [['accueil', 'Tableau de bord', 'home']]
  if (!e) r.push(['campus', 'Campus', 'calendar'], ['epreuves', 'Épreuves', 'file'])
  if (!ens) r.push(['stages', 'Stages', 'briefcase'])
  if (!e) r.push(['vie', 'Vie à Pigier', 'people'])
  if (p.role === 'administration') r.push(['admin', 'Administration du site', 'gear'])
  return r
}

/* ---------- bannières paysage générées (comme les images de cours de Moodle) ---------- */
const Banniere = ({ s }) => {
  let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0
  const r = (i) => ((h >> (i * 3)) & 255) / 255
  const f = ['#0B2A6F', '#0000A0', '#1F4FB8']
  return (<svg viewBox="0 0 300 120" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <rect width="300" height="120" fill={f[h % 3]} />
    {[0, 1, 2, 3, 4].map((i) => <circle key={i} cx={r(i) * 300} cy={r(i + 2) * 120} r={20 + r(i + 3) * 50} fill={i === 3 ? '#FFC20E' : '#EAF0FB'} opacity={i === 3 ? 0.9 : 0.12 + r(i) * 0.15} />)}
    <path d={'M0 120 L' + (60 + r(1) * 80) + ' ' + (50 + r(2) * 40) + ' L' + (150 + r(3) * 60) + ' 120Z'} fill="#fff" opacity=".1" />
  </svg>)
}

function MiniCal({ marques }) {
  const [d, setD] = useState(new Date()); const a = d.getFullYear(), m = d.getMonth(), t = new Date()
  const prem = (new Date(a, m, 1).getDay() + 6) % 7, nb = new Date(a, m + 1, 0).getDate()
  const c = [...Array(prem).fill(null), ...Array.from({ length: nb }, (_, i) => i + 1)]
  while (c.length % 7) c.push(null)
  return (<div>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
      <button className="lien" aria-label="Mois précédent" onClick={() => setD(new Date(a, m - 1, 1))}>‹</button>
      <b style={{ textTransform: 'capitalize' }}>{d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</b>
      <button className="lien" aria-label="Mois suivant" onClick={() => setD(new Date(a, m + 1, 1))}>›</button></div>
    <table className="cal"><thead><tr>{['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((x, i) => <th key={i}>{x}</th>)}</tr></thead>
      <tbody>{Array.from({ length: c.length / 7 }, (_, w) => <tr key={w}>{c.slice(w * 7, w * 7 + 7).map((j, i) =>
        <td key={i} className={j && j === t.getDate() && m === t.getMonth() && a === t.getFullYear() ? 'auj' : ''}>{j}{j && marques.has(a + '-' + (m + 1) + '-' + j) && <i className="pt" />}</td>)}</tr>)}</tbody></table></div>)
}

/* ---------- Tableau de bord ---------- */
function Tableau({ p, aller }) {
  const e = p.role === 'entreprise', mod = p.role === 'administration' || p.role === 'enseignant'
  const [cours, setCours] = useState([]), [ann, setAnn] = useState([]), [chrono, setChrono] = useState([]), [menu, setMenu] = useState([]), [m, setM] = useState(null), [f, setF] = useState({ titre: '', contenu: '' })
  const auj = new Date().toISOString().slice(0, 10)
  const charger = async () => setAnn((await supabase.from('annonces').select('*').order('publiee_le', { ascending: false }).limit(5)).data || [])
  useEffect(() => {
    charger()
    supabase.from('calendrier_academique').select('titre, debut').gte('debut', auj).order('debut').limit(6).then(({ data: c }) =>
      supabase.from('evenements').select('titre, debut').gte('debut', new Date().toISOString()).order('debut').limit(6).then(({ data: v }) =>
        setChrono([...(c || []).map((x) => ({ ...x, k: 'Calendrier' })), ...(v || []).map((x) => ({ ...x, k: 'Événement' }))].sort((a, b) => new Date(a.debut) - new Date(b.debut)).slice(0, 8))))
    if (!e) supabase.from('cantine_menu_jour').select('cantine_articles(nom, prix_fcfa)').eq('jour', auj).then(({ data }) => setMenu((data || []).map((x) => x.cantine_articles).filter(Boolean)))
    ;(async () => {
      if (e) return
      if (p.role === 'etudiant') {
        const { data: et } = await supabase.from('etudiants').select('filiere_id, niveau').eq('profil_id', p.id).maybeSingle()
        if (et) setCours(((await supabase.from('modules').select('id, code, intitule, professeurs(nom, prenom)').eq('filiere_id', et.filiere_id).eq('niveau', et.niveau).order('code')).data || []).map((x) => ({ id: x.id, t: x.intitule, s: x.code + (x.professeurs ? ' · ' + x.professeurs.prenom + ' ' + x.professeurs.nom : '') })))
      } else setCours(((await supabase.from('filieres').select('*').order('nom')).data || []).map((x) => ({ id: x.id, t: x.nom, s: x.code })))
    })()
  }, [])
  const publier = async (ev) => {
    ev.preventDefault()
    const { error } = await supabase.from('annonces').insert({ titre: f.titre, contenu: f.contenu })
    setM(error ? { t: error.message } : { t: 'Annonce publiée.', ok: true }); if (!error) { setF({ titre: '', contenu: '' }); charger() }
  }
  return (<>
    <h1>Tableau de bord</h1>
    <div className="dash"><div>
      {!e && <section className="card"><h2>Vue d'ensemble des {p.role === 'etudiant' ? 'modules' : 'filières'}</h2>
        {cours.length === 0 ? <p className="muted">Aucun élément à afficher pour le moment.</p> :
          <div className="grille">{cours.map((c) => <div className="cours" key={c.id} role="button" tabIndex={0} onClick={() => aller('campus')} onKeyDown={(k) => { if (k.key === 'Enter') aller('campus') }}>
            <Banniere s={c.t} /><div><b>{c.t}</b><div className="muted">{c.s}</div></div></div>)}</div>}</section>}
      <section className="card"><h2>Annonces</h2>
        {ann.length === 0 && <p className="muted">Aucune annonce pour le moment.</p>}
        {ann.map((x) => <div key={x.id} style={{ borderBottom: '1px solid var(--bord)', padding: '8px 0' }}><b>{x.important && <span className="badge">Important</span>}{x.titre}</b><div>{x.contenu}</div><div className="muted">{new Date(x.publiee_le).toLocaleDateString('fr-FR')}</div></div>)}
        {mod && <form onSubmit={publier} style={{ marginTop: 12 }}><label htmlFor="at">Publier une annonce</label>
          <input id="at" placeholder="Titre" required value={f.titre} onChange={(x) => setF({ ...f, titre: x.target.value })} />
          <textarea aria-label="Message" rows={2} placeholder="Message" value={f.contenu} onChange={(x) => setF({ ...f, contenu: x.target.value })} />
          <Msg m={m} /><button className="btn" type="submit">Publier</button></form>}</section>
    </div><aside>
      <section className="card"><h2>Chronologie</h2>{chrono.length === 0 ? <p className="muted">Rien à venir.</p> : chrono.map((x, i) => <div key={i} style={{ padding: '6px 0', borderBottom: '1px solid var(--bord)' }}><b>{x.titre}</b><div className="muted">{x.k} · {jj(x.debut)}</div></div>)}</section>
      <section className="card"><h2>Calendrier</h2><MiniCal marques={new Set(chrono.map((x) => cle(x.debut)))} /></section>
      {!e && <section className="card"><h2>Menu du jour</h2>{menu.length === 0 ? <p className="muted">Non publié.</p> : menu.map((x, i) => <div key={i}>{x.nom} <span className="muted">· {Number(x.prix_fcfa).toLocaleString('fr-FR')} FCFA</span></div>)}</section>}
    </aside></div></>)
}

/* ---------- Administration du site ---------- */
function AdminSite({ p }) {
  const [t, setT] = useState('tableau')
  const L = [['tableau', 'Tableau de bord'], ['validation', 'Validations'], ['utilisateurs', 'Utilisateurs'], ['moderation', 'Modération'], ['scolarite', 'Scolarité']]
  return (<><h1>Administration du site</h1>
    <div className="tabs">{L.map(([k, l]) => <button key={k} className={'btn ' + (t === k ? '' : 'ghost')} onClick={() => setT(k)}>{l}</button>)}</div>
    {t === 'tableau' && <StatsAdmin />}{t === 'validation' && <Admin p={p} />}{t === 'utilisateurs' && <Utilisateurs p={p} />}{t === 'moderation' && <Moderation />}{t === 'scolarite' && <ScolariteAdmin />}</>)
}
function StatsAdmin() {
  const [n, setN] = useState({})
  const defs = [['Comptes actifs', 'profils', (q) => q.eq('valide', true)], ['Comptes à valider', 'profils', (q) => q.eq('valide', false)], ['Fiches étudiants', 'etudiants', (q) => q], ['Épreuves publiées', 'epreuves', (q) => q.eq('statut', 'validee')], ['Épreuves à valider', 'epreuves', (q) => q.eq('statut', 'en_attente')], ['Offres publiées', 'offres', (q) => q.eq('publiee', true)], ['Entreprises à valider', 'entreprises', (q) => q.eq('valide', false)], ['Médias à valider', 'medias', (q) => q.eq('statut', 'en_attente')], ['Signalements ouverts', 'epreuve_signalements', (q) => q.eq('traite', false)]]
  useEffect(() => { defs.forEach(([, t, f], i) => f(supabase.from(t).select('id', { count: 'exact', head: true })).then(({ count }) => setN((o) => ({ ...o, [i]: count })))) }, [])
  return <div className="stats">{defs.map(([l], i) => <div className="stat" key={l}><b>{n[i] ?? '–'}</b>{l}</div>)}</div>
}
function Utilisateurs({ p }) {
  const [q, setQ] = useState(''), [l, setL] = useState([]), [m, setM] = useState(null)
  const chercher = async () => {
    const s = q.replace(/[,%()]/g, '').trim()
    let r = supabase.from('profils').select('*').order('cree_le', { ascending: false }).limit(20)
    if (s.length > 1) r = r.or('nom.ilike.%' + s + '%,prenom.ilike.%' + s + '%,email.ilike.%' + s + '%')
    setL((await r).data || [])
  }
  useEffect(() => { chercher() }, [])
  const maj = async (x, ch) => { const { error } = await supabase.from('profils').update(ch).eq('id', x.id); setM(error ? { t: error.message } : { t: 'Modification enregistrée.', ok: true }); chercher() }
  return (<>
    <div className="row"><input aria-label="Rechercher" placeholder="Nom, prénom ou email" value={q} onChange={(e) => setQ(e.target.value)} /><button className="btn" onClick={chercher}>Rechercher</button></div>
    <Msg m={m} />
    {l.map((x) => <div className="card" key={x.id}><b>{x.prenom} {x.nom}</b> <span className="badge">{x.valide ? 'Actif' : 'Suspendu ou en attente'}</span><div className="muted">{x.email}</div>
      <label htmlFor={'r' + x.id}>Rôle</label>
      <select id={'r' + x.id} value={x.role} disabled={x.id === p.id} onChange={(e) => maj(x, { role: e.target.value })}>{['etudiant', 'enseignant', 'administration', 'entreprise', 'alumni'].map((r) => <option key={r}>{r}</option>)}</select>
      {x.id !== p.id && <button className={'btn ' + (x.valide ? 'ko' : 'jaune')} onClick={() => maj(x, { valide: !x.valide })}>{x.valide ? 'Suspendre le compte' : 'Valider le compte'}</button>}</div>)}
    <p className="muted">Pour donner un nouveau mot de passe à une personne, utilisez l'outil « reinitialiser ».</p></>)
}
function Moderation() {
  const [ep, setEp] = useState([]), [sg, setSg] = useState([])
  const charger = async () => {
    setEp((await supabase.from('epreuves').select('*, filieres(nom)').eq('statut', 'en_attente').order('cree_le')).data || [])
    setSg((await supabase.from('epreuve_signalements').select('*, epreuves(matiere, annee)').eq('traite', false).order('cree_le')).data || [])
  }
  useEffect(() => { charger() }, [])
  const statut = async (x, s) => { await supabase.from('epreuves').update({ statut: s }).eq('id', x.id); charger() }
  const ouvrir = async (x) => { const w = window.open('', '_blank'); const { data } = await supabase.storage.from('epreuves').createSignedUrl(x.fichier_path, 120); if (data && w) w.location = data.signedUrl; else if (w) w.close() }
  const traite = async (x) => { await supabase.from('epreuve_signalements').update({ traite: true }).eq('id', x.id); charger() }
  return (<>
    <h2>Épreuves à valider</h2>
    {ep.length === 0 && <p className="muted">Aucune épreuve en attente.</p>}
    {ep.map((x) => <div className="card" key={x.id}><b>{x.matiere}</b><div className="muted">{x.filieres?.nom} · {x.niveau} · {x.annee} · {x.session}</div>
      <button className="btn ghost" onClick={() => ouvrir(x)}>Ouvrir le fichier</button><button className="btn" onClick={() => statut(x, 'validee')}>Valider</button><button className="btn ko" onClick={() => statut(x, 'refusee')}>Refuser</button></div>)}
    <h2>Signalements</h2>
    {sg.length === 0 && <p className="muted">Aucun signalement ouvert.</p>}
    {sg.map((x) => <div className="card" key={x.id}><b>{x.epreuves?.matiere} {x.epreuves?.annee}</b><div>{x.motif}</div><button className="btn" onClick={() => traite(x)}>Marquer comme traité</button></div>)}</>)
}

/* ---------- Coque principale ---------- */
export default function Coque({ p, recharger, sortir }) {
  const [route, aller] = useRoute()
  const [tiroir, setTiroir] = useState(false), [menu, setMenu] = useState(false), [nonLus, setNonLus] = useState(0)
  const inst = useInstall()
  const [bandeau, setBandeau] = useState(() => { try { return localStorage.getItem('pgb-bandeau') !== '1' } catch (e) { return true } })
  const e = p.role === 'entreprise'
  const R = ROUTES(p)
  const cur = [...R.map((x) => x[0]), 'profil'].includes(route) ? route : 'accueil'
  const titre = cur === 'profil' ? 'Mon profil' : R.find((x) => x[0] === cur)[1]
  useEffect(() => { supabase.from('messages').select('id', { count: 'exact', head: true }).eq('destinataire', p.id).eq('lu', false).then(({ count }) => setNonLus(count || 0)) }, [cur])
  const va = (k) => { aller(k); setTiroir(false); setMenu(false) }
  const fermer = () => { setBandeau(false); try { localStorage.setItem('pgb-bandeau', '1') } catch (x) {} }
  const installer = () => { if (inst.possible) inst.installer(); else window.alert('Touchez Partager, puis « Sur l\'écran d\'accueil ».') }
  const ini = ((p.prenom || '?')[0] + (p.nom || '')[0]).toUpperCase()
  return (<>
    <header className="m-nav">
      <button className="m-ico burger" aria-label="Ouvrir le menu" onClick={() => setTiroir(!tiroir)}><I n="menu" /></button>
      <img className="m-logo" src="/logo.png" alt="Pigier Bénin" onClick={() => va('accueil')} />
      <nav className="m-liens" aria-label="Navigation principale">{R.map(([k, l]) => <button key={k} className={cur === k ? 'on' : ''} onClick={() => va(k)}>{l}</button>)}</nav>
      <div className="m-droite">
        {!e && <button className="m-ico" aria-label="Messages" onClick={() => va('vie')}><I n="mail" />{nonLus > 0 && <span className="m-pastille">{nonLus}</span>}</button>}
        <div style={{ position: 'relative' }}>
          <button className="m-avatar" aria-label="Menu utilisateur" aria-expanded={menu} onClick={() => setMenu(!menu)}>{ini}</button>
          {menu && <div className="m-menu"><div className="nom"><b>{p.prenom} {p.nom}</b><div className="muted">{p.role}</div></div>
            <button onClick={() => va('profil')}><I n="user" />Profil</button>
            {(inst.possible || inst.ios) && <button onClick={installer}><I n="download" />Installer l'application</button>}
            <button onClick={sortir}><I n="logout" />Déconnexion</button></div>}</div>
      </div>
    </header>
    {tiroir && <div className="m-voile" onClick={() => setTiroir(false)} />}
    <aside className={'m-tiroir' + (tiroir ? ' ouvert' : '')} aria-label="Menu">
      {R.map(([k, l, i]) => <button key={k} className={cur === k ? 'on' : ''} onClick={() => va(k)}><I n={i} />{l}</button>)}
      <button className={cur === 'profil' ? 'on' : ''} onClick={() => va('profil')}><I n="user" />Profil</button>
      {(inst.possible || inst.ios) && <button onClick={installer}><I n="download" />Installer l'application</button>}
      <button onClick={sortir}><I n="logout" />Déconnexion</button>
    </aside>
    <main className="m-page"><div className="page" key={cur}>
      <nav className="fil-ariane" aria-label="Fil d'Ariane"><button className="lien" onClick={() => va('accueil')}>Accueil</button> › {titre}</nav>
      {cur === 'accueil' && <Tableau p={p} aller={va} />}
      {cur === 'campus' && <CampusPlus p={p} />}
      {cur === 'epreuves' && <Epreuves p={p} />}
      {cur === 'stages' && <Stages p={p} />}
      {cur === 'vie' && <ViePlus p={p} />}
      {cur === 'admin' && <AdminSite p={p} />}
      {cur === 'profil' && <Profil p={p} recharger={recharger} sortir={sortir} />}
    </div>
    <footer className="m-pied"><p>Vous êtes connecté sous le nom de <b>{p.prenom} {p.nom}</b> (<button className="lien" onClick={sortir}>Déconnexion</button>)</p>
      <p><button className="lien" onClick={() => va('accueil')}>Accueil</button>{(inst.possible || inst.ios) && <> · <button className="lien" onClick={installer}>Obtenir l'application</button></>}</p>
      <p>À Pigier Bénin, nous sommes une famille</p></footer></main>
    {bandeau && (inst.possible || inst.ios) && <div className="m-bandeau" role="region" aria-label="Installation">
      <span style={{ marginRight: 12 }}>{inst.possible ? 'Installez l\'application Pigier Bénin sur cet appareil.' : 'Pour installer : touchez Partager, puis « Sur l\'écran d\'accueil ».'}</span>
      {inst.possible && <button className="btn" onClick={inst.installer}>Installer</button>}<button className="btn ghost" onClick={fermer}>Plus tard</button></div>}
  </>)
}
