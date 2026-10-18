import { useEffect, useState } from 'react'
import { supabase } from './supabase'

const NIVEAUX = ['L1', 'L2', 'L3', 'M1', 'M2']
const estMod = (p) => p.role === 'administration' || p.role === 'enseignant'
const Msg = ({ m }) => (m ? <div className={'msg' + (m.ok ? ' ok' : '')} role="status">{m.t}</div> : null)

function useFilieres() {
  const [l, setL] = useState([])
  useEffect(() => { supabase.from('filieres').select('*').order('nom').then(({ data }) => setL(data || [])) }, [])
  return l
}

/* ---------- ACCUEIL : chiffres et annonces ---------- */
export function Accueil({ p }) {
  const [a, setA] = useState([]); const [n, setN] = useState({}); const [m, setM] = useState(null)
  const [f, setF] = useState({ titre: '', contenu: '' })
  const charger = async () => {
    const r = await supabase.from('annonces').select('*').order('publiee_le', { ascending: false }).limit(15)
    setA(r.data || [])
    const ep = await supabase.from('epreuves').select('id', { count: 'exact', head: true }).eq('statut', 'validee')
    const of = p.role === 'enseignant' ? { count: null } : await supabase.from('offres').select('id', { count: 'exact', head: true })
    setN({ ep: ep.count, of: of.count })
  }
  useEffect(() => { charger() }, [])
  const publier = async (e) => {
    e.preventDefault()
    const { error } = await supabase.from('annonces').insert({ titre: f.titre, contenu: f.contenu })
    if (error) return setM({ t: 'Publication impossible : ' + error.message })
    setF({ titre: '', contenu: '' }); setM({ t: 'Annonce publiée.', ok: true }); charger()
  }
  return (<>
    <h1>Bienvenue {p.prenom}</h1>
    <div className="stats">
      <div className="stat"><b>{n.ep ?? '–'}</b>épreuves disponibles</div>
      {p.role !== 'enseignant' && <div className="stat"><b>{n.of ?? '–'}</b>offres de stage et d'emploi</div>}
    </div>
    <h2>Annonces</h2>
    {a.length === 0 && <p className="muted">Aucune annonce pour le moment.</p>}
    {a.map((x) => <div className="card" key={x.id}><h3>{x.important && <span className="badge">Important</span>}{x.titre}</h3><p style={{ margin: 0 }}>{x.contenu}</p><div className="muted">{new Date(x.publiee_le).toLocaleDateString('fr-FR')}</div></div>)}
    {estMod(p) && <form onSubmit={publier} className="card">
      <h3>Publier une annonce</h3>
      <label htmlFor="at">Titre</label><input id="at" required value={f.titre} onChange={(e) => setF({ ...f, titre: e.target.value })} />
      <label htmlFor="ac">Message</label><textarea id="ac" rows={3} value={f.contenu} onChange={(e) => setF({ ...f, contenu: e.target.value })} />
      <Msg m={m} /><button className="btn jaune" type="submit">Publier</button>
    </form>}
  </>)
}

/* ---------- ÉPREUVES ---------- */
export function Epreuves({ p }) {
  const fil = useFilieres()
  const [vue, setVue] = useState('validee'); const [l, setL] = useState([]); const [m, setM] = useState(null)
  const [fl, setFl] = useState({ filiere: '', niveau: '', annee: '', s: '' })
  const [d, setD] = useState({ filiere: '', niveau: 'L1', matiere: '', annee: new Date().getFullYear(), session: 'normale', type: 'examen', fichier: null })
  const [ouvert, setOuvert] = useState(false)
  const charger = async () => {
    let q = supabase.from('epreuves').select('*, filieres(nom)').eq('statut', vue).order('cree_le', { ascending: false }).limit(50)
    if (fl.filiere) q = q.eq('filiere_id', fl.filiere)
    if (fl.niveau) q = q.eq('niveau', fl.niveau)
    if (fl.annee) q = q.eq('annee', fl.annee)
    if (fl.s) q = q.ilike('matiere', '%' + fl.s + '%')
    const { data } = await q; setL(data || [])
  }
  useEffect(() => { charger() }, [vue, fl.filiere, fl.niveau, fl.annee, fl.s])
  const telecharger = async (e) => {
    const { data, error } = await supabase.storage.from('epreuves').createSignedUrl(e.fichier_path, 60, { download: true })
    if (error) return setM({ t: 'Téléchargement impossible.' })
    supabase.rpc('compter_telechargement', { p_epreuve: e.id })
    window.location.href = data.signedUrl
  }
  const moderer = async (e, statut) => {
    const { error } = await supabase.from('epreuves').update({ statut }).eq('id', e.id)
    if (error) setM({ t: error.message }); else charger()
  }
  const signaler = async (e) => {
    const motif = window.prompt('Pourquoi signalez-vous ce document ?'); if (!motif) return
    const { error } = await supabase.from('epreuve_signalements').insert({ epreuve_id: e.id, motif })
    setM(error ? { t: error.message } : { t: 'Signalement envoyé. Merci.', ok: true })
  }
  const deposer = async (ev) => {
    ev.preventDefault(); setM(null)
    if (!d.fichier) return setM({ t: 'Choisissez un fichier PDF ou une image.' })
    if (d.fichier.size > 10 * 1024 * 1024) return setM({ t: 'Fichier trop lourd (10 Mo maximum).' })
    const chemin = p.id + '/' + Date.now() + '-' + d.fichier.name.replace(/[^\w.\-]/g, '_')
    const up = await supabase.storage.from('epreuves').upload(chemin, d.fichier)
    if (up.error) return setM({ t: 'Envoi du fichier impossible : ' + up.error.message })
    const { error } = await supabase.from('epreuves').insert({ filiere_id: d.filiere || null, niveau: d.niveau, matiere: d.matiere, annee: Number(d.annee), session: d.session, type: d.type, fichier_path: chemin })
    if (error) return setM({ t: error.message })
    setM({ t: 'Épreuve déposée. Elle sera visible après validation.', ok: true }); setOuvert(false); setVue('en_attente'); charger()
  }
  const Sel = ({ k, o, ph }) => <select aria-label={ph} value={fl[k]} onChange={(e) => setFl({ ...fl, [k]: e.target.value })}><option value="">{ph}</option>{o}</select>
  return (<>
    <h1>Épreuves</h1>
    <div className="tabs">
      <button className={'btn ' + (vue === 'validee' ? '' : 'ghost')} onClick={() => setVue('validee')}>Validées</button>
      <button className={'btn ' + (vue === 'en_attente' ? '' : 'ghost')} onClick={() => setVue('en_attente')}>{estMod(p) ? 'À valider' : 'Mes dépôts en attente'}</button>
      <button className="btn jaune" onClick={() => setOuvert(!ouvert)}>Déposer</button>
    </div>
    <Msg m={m} />
    {ouvert && <form onSubmit={deposer} className="card">
      <h3>Déposer une épreuve</h3>
      <div className="row">
        <div><label htmlFor="df">Filière</label><select id="df" value={d.filiere} onChange={(e) => setD({ ...d, filiere: e.target.value })}><option value="">Choisir</option>{fil.map((x) => <option key={x.id} value={x.id}>{x.nom}</option>)}</select></div>
        <div><label htmlFor="dn">Niveau</label><select id="dn" value={d.niveau} onChange={(e) => setD({ ...d, niveau: e.target.value })}>{NIVEAUX.map((x) => <option key={x}>{x}</option>)}</select></div>
        <div><label htmlFor="dm">Matière</label><input id="dm" required value={d.matiere} onChange={(e) => setD({ ...d, matiere: e.target.value })} /></div>
        <div><label htmlFor="da">Année</label><input id="da" type="number" required value={d.annee} onChange={(e) => setD({ ...d, annee: e.target.value })} /></div>
        <div><label htmlFor="ds">Session</label><select id="ds" value={d.session} onChange={(e) => setD({ ...d, session: e.target.value })}><option value="normale">Normale</option><option value="rattrapage">Rattrapage</option></select></div>
        <div><label htmlFor="dt">Type</label><select id="dt" value={d.type} onChange={(e) => setD({ ...d, type: e.target.value })}><option value="examen">Examen</option><option value="devoir">Devoir</option><option value="td">Travaux dirigés</option></select></div>
      </div>
      <label htmlFor="dfi">Fichier (PDF ou image)</label>
      <input id="dfi" type="file" accept="application/pdf,image/*" onChange={(e) => setD({ ...d, fichier: e.target.files[0] })} />
      <button className="btn jaune" type="submit">Envoyer</button>
    </form>}
    <div className="row">
      <Sel k="filiere" ph="Toutes les filières" o={fil.map((x) => <option key={x.id} value={x.id}>{x.nom}</option>)} />
      <Sel k="niveau" ph="Tous les niveaux" o={NIVEAUX.map((x) => <option key={x}>{x}</option>)} />
      <input aria-label="Année" type="number" placeholder="Année" value={fl.annee} onChange={(e) => setFl({ ...fl, annee: e.target.value })} />
      <input aria-label="Rechercher une matière" placeholder="Rechercher une matière" value={fl.s} onChange={(e) => setFl({ ...fl, s: e.target.value })} />
    </div>
    <div style={{ marginTop: 12 }}>
      {l.length === 0 && <p className="muted">Aucune épreuve ne correspond. Essayez d'autres filtres ou déposez la première.</p>}
      {l.map((e) => <div className="card" key={e.id}>
        <h3>{e.matiere || 'Sans titre'}</h3>
        <div className="muted">{e.filieres?.nom} · {e.niveau} · {e.annee} · {e.session} · {e.type}</div>
        <span className="badge">{e.statut === 'validee' ? 'Validée' : e.statut === 'refusee' ? 'Refusée' : 'En attente'}</span>
        <div>
          {e.statut === 'validee' && <button className="btn" onClick={() => telecharger(e)}>Télécharger</button>}
          {e.statut === 'validee' && <button className="btn ghost" onClick={() => signaler(e)}>Signaler</button>}
          {estMod(p) && e.statut === 'en_attente' && <><button className="btn" onClick={() => moderer(e, 'validee')}>Valider</button><button className="btn ko" onClick={() => moderer(e, 'refusee')}>Refuser</button></>}
        </div>
      </div>)}
    </div>
  </>)
}

/* ---------- STAGES ---------- */
export function Stages({ p }) {
  const [vue, setVue] = useState('offres'); const [type, setType] = useState('')
  const [o, setO] = useState([]); const [c, setC] = useState([]); const [m, setM] = useState(null)
  const [cible, setCible] = useState(null); const [msgC, setMsgC] = useState('')
  const [cv, setCv] = useState(null)
  useEffect(() => {
    if (vue === 'offres') {
      let q = supabase.from('offres').select('*, entreprises(nom, ville)').eq('publiee', true).order('cree_le', { ascending: false }).limit(50)
      if (type) q = q.eq('type', type)
      q.then(({ data }) => setO(data || []))
    } else if (vue === 'candidatures') {
      supabase.from('candidatures').select('*, offres(titre)').eq('profil_id', p.id).order('cree_le', { ascending: false }).then(({ data }) => setC(data || []))
    }
  }, [vue, type])
  if (p.role === 'enseignant') return <><h1>Stages</h1><div className="msg">Accès non autorisé pour votre profil.</div></>
  const postuler = async (e) => {
    e.preventDefault(); setM(null)
    let cv_path = null
    if (cv) {
      cv_path = p.id + '/' + Date.now() + '-' + cv.name.replace(/[^\w.\-]/g, '_')
      const up = await supabase.storage.from('cv').upload(cv_path, cv)
      if (up.error) return setM({ t: 'Envoi du CV impossible : ' + up.error.message })
    }
    const { error } = await supabase.from('candidatures').insert({ offre_id: cible, message: msgC, cv_path })
    setM(error ? { t: error.code === '23505' ? 'Vous avez déjà postulé à cette offre.' : error.message } : { t: 'Candidature envoyée.', ok: true })
    if (!error) { setCible(null); setMsgC(''); setCv(null) }
  }
  return (<>
    <h1>Stages et emplois</h1>
    <div className="tabs">
      <button className={'btn ' + (vue === 'offres' ? '' : 'ghost')} onClick={() => setVue('offres')}>Offres</button>
      {p.role !== 'entreprise' && <button className={'btn ' + (vue === 'candidatures' ? '' : 'ghost')} onClick={() => setVue('candidatures')}>Mes candidatures</button>}
      {p.role === 'entreprise' && <button className={'btn ' + (vue === 'entreprise' ? '' : 'ghost')} onClick={() => setVue('entreprise')}>Mon entreprise</button>}
    </div>
    <Msg m={m} />
    {vue === 'offres' && <>
      <select aria-label="Type d'offre" value={type} onChange={(e) => setType(e.target.value)}><option value="">Tous les types</option><option value="stage">Stage</option><option value="immersion">Immersion</option><option value="emploi">Emploi</option></select>
      <div style={{ marginTop: 12 }}>
        {o.length === 0 && <p className="muted">Aucune offre pour le moment.</p>}
        {o.map((x) => <div className="card" key={x.id}>
          <h3><span className="badge">{x.type}</span>{x.titre}</h3>
          <div className="muted">{x.entreprises?.nom} · {x.ville || x.entreprises?.ville} · {x.duree_mois ? x.duree_mois + ' mois' : ''}</div>
          <p>{x.description}</p>
          {p.role !== 'entreprise' && p.role !== 'administration' && <button className="btn jaune" onClick={() => setCible(x.id)}>Postuler</button>}
          {cible === x.id && <form onSubmit={postuler}>
            <label htmlFor="mc">Votre message</label><textarea id="mc" rows={3} required value={msgC} onChange={(e) => setMsgC(e.target.value)} />
            <label htmlFor="cvf">CV (PDF)</label><input id="cvf" type="file" accept="application/pdf" onChange={(e) => setCv(e.target.files[0])} />
            <button className="btn" type="submit">Envoyer ma candidature</button><button className="btn ghost" type="button" onClick={() => setCible(null)}>Annuler</button>
          </form>}
        </div>)}
      </div>
    </>}
    {vue === 'candidatures' && <>
      {c.length === 0 && <p className="muted">Vous n'avez pas encore postulé. Consultez les offres.</p>}
      {c.map((x) => <div className="card" key={x.id}><h3>{x.offres?.titre}</h3><span className="badge">{x.statut}</span><span className="muted">{new Date(x.cree_le).toLocaleDateString('fr-FR')}</span></div>)}
    </>}
    {vue === 'entreprise' && <Entreprise p={p} />}
  </>)
}

function Entreprise({ p }) {
  const [e, setE] = useState(undefined); const [m, setM] = useState(null)
  const [f, setF] = useState({ nom: '', secteur: '', ville: '' }); const [of, setOf] = useState({ titre: '', type: 'stage', duree_mois: 3, description: '' })
  const [cands, setCands] = useState([])
  const charger = async () => {
    const r = await supabase.from('entreprises').select('*').eq('profil_id', p.id).maybeSingle(); setE(r.data)
    const c = await supabase.from('candidatures').select('*, offres(titre), profils(nom, prenom)').order('cree_le', { ascending: false }); setCands(c.data || [])
  }
  useEffect(() => { charger() }, [])
  if (e === undefined) return <p>Chargement…</p>
  const creer = async (ev) => {
    ev.preventDefault()
    const { error } = await supabase.from('entreprises').insert({ ...f, profil_id: p.id })
    setM(error ? { t: error.message } : { t: 'Entreprise enregistrée. Elle doit être validée par l\'administration.', ok: true }); charger()
  }
  const publier = async (ev) => {
    ev.preventDefault()
    const { error } = await supabase.from('offres').insert({ entreprise_id: e.id, titre: of.titre, type: of.type, duree_mois: Number(of.duree_mois), description: of.description, publiee: true })
    setM(error ? { t: error.message } : { t: 'Offre publiée.', ok: true })
  }
  const suivi = async (id, statut) => { await supabase.from('candidatures').update({ statut }).eq('id', id); charger() }
  if (!e) return (<form onSubmit={creer} className="card"><h3>Enregistrer votre entreprise</h3><Msg m={m} />
    <label htmlFor="en">Nom</label><input id="en" required value={f.nom} onChange={(x) => setF({ ...f, nom: x.target.value })} />
    <label htmlFor="es">Secteur</label><input id="es" value={f.secteur} onChange={(x) => setF({ ...f, secteur: x.target.value })} />
    <label htmlFor="ev">Ville</label><input id="ev" value={f.ville} onChange={(x) => setF({ ...f, ville: x.target.value })} />
    <button className="btn jaune" type="submit">Enregistrer</button></form>)
  if (!e.valide) return <div className="msg">{e.nom} : en attente de validation par l'administration.</div>
  return (<>
    <form onSubmit={publier} className="card"><h3>Publier une offre</h3><Msg m={m} />
      <label htmlFor="ot">Titre</label><input id="ot" required value={of.titre} onChange={(x) => setOf({ ...of, titre: x.target.value })} />
      <div className="row"><div><label htmlFor="oy">Type</label><select id="oy" value={of.type} onChange={(x) => setOf({ ...of, type: x.target.value })}><option value="stage">Stage</option><option value="immersion">Immersion</option><option value="emploi">Emploi</option></select></div>
      <div><label htmlFor="od">Durée (mois)</label><input id="od" type="number" min="1" max="24" value={of.duree_mois} onChange={(x) => setOf({ ...of, duree_mois: x.target.value })} /></div></div>
      <label htmlFor="ox">Description</label><textarea id="ox" rows={3} value={of.description} onChange={(x) => setOf({ ...of, description: x.target.value })} />
      <button className="btn jaune" type="submit">Publier</button></form>
    <h2>Candidatures reçues</h2>
    {cands.length === 0 && <p className="muted">Aucune candidature pour le moment.</p>}
    {cands.map((x) => <div className="card" key={x.id}><h3>{x.profils?.prenom} {x.profils?.nom} · {x.offres?.titre}</h3><p style={{ margin: 0 }}>{x.message}</p>
      <label htmlFor={'s' + x.id}>Statut</label><select id={'s' + x.id} value={x.statut} onChange={(ev) => suivi(x.id, ev.target.value)}>
        {['envoyee', 'vue', 'entretien', 'retenue', 'refusee'].map((s) => <option key={s}>{s}</option>)}</select></div>)}
  </>)
}

/* ---------- ADMINISTRATION ---------- */
export function Admin({ p }) {
  const [u, setU] = useState([]); const [en, setEn] = useState([]); const [m, setM] = useState(null)
  const charger = async () => {
    setU((await supabase.from('profils').select('*').eq('valide', false).order('cree_le')).data || [])
    setEn((await supabase.from('entreprises').select('*').eq('valide', false)).data || [])
  }
  useEffect(() => { charger() }, [])
  const valider = async (x, role) => {
    const { error } = await supabase.from('profils').update({ valide: true, role }).eq('id', x.id)
    setM(error ? { t: error.message } : { t: 'Compte validé.', ok: true }); charger()
  }
  const validerEn = async (x) => { await supabase.from('entreprises').update({ valide: true }).eq('id', x.id); charger() }
  const roles = ['etudiant', 'enseignant', 'entreprise', 'alumni', 'administration']
  return (<>
    <h1>Administration</h1><Msg m={m} />
    <h2>Comptes à valider</h2>
    {u.length === 0 && <p className="muted">Aucun compte en attente.</p>}
    {u.map((x) => <Compte key={x.id} x={x} roles={roles} valider={valider} />)}
    <h2>Entreprises à valider</h2>
    {en.length === 0 && <p className="muted">Aucune entreprise en attente.</p>}
    {en.map((x) => <div className="card" key={x.id}><h3>{x.nom}</h3><div className="muted">{x.secteur} · {x.ville}</div><button className="btn" onClick={() => validerEn(x)}>Valider</button></div>)}
    <p className="muted">Les épreuves à valider se trouvent dans l'onglet Épreuves, rubrique « À valider ».</p>
  </>)
}
function Compte({ x, roles, valider }) {
  const [r, setR] = useState(x.role)
  return <div className="card"><h3>{x.prenom} {x.nom}</h3><div className="muted">{x.email}</div>
    <label htmlFor={'r' + x.id}>Rôle</label><select id={'r' + x.id} value={r} onChange={(e) => setR(e.target.value)}>{roles.map((y) => <option key={y}>{y}</option>)}</select>
    <button className="btn jaune" onClick={() => valider(x, r)}>Valider ce compte</button></div>
}

/* ---------- PROFIL ---------- */
export function Profil({ p, recharger, sortir }) {
  const [f, setF] = useState({ prenom: p.prenom, nom: p.nom, telephone: p.telephone || '', ville: p.ville || '', a_propos: p.a_propos || '' })
  const [m, setM] = useState(null); const [inst, setInst] = useState(null); const [eco, setEco] = useState(document.body.classList.contains('eco'))
  useEffect(() => { const h = (e) => { e.preventDefault(); setInst(e) }; window.addEventListener('beforeinstallprompt', h); return () => window.removeEventListener('beforeinstallprompt', h) }, [])
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
  const enregistrer = async (e) => {
    e.preventDefault()
    const { error } = await supabase.from('profils').update(f).eq('id', p.id)
    setM(error ? { t: error.message } : { t: 'Informations enregistrées.', ok: true }); recharger()
  }
  const maj = (k) => (e) => setF({ ...f, [k]: e.target.value })
  return (<>
    <h1>Mon profil</h1>
    <form onSubmit={enregistrer} className="card">
      <div className="muted">{p.email} · rôle : {p.role}</div>
      <div className="row"><div><label htmlFor="pp">Prénom</label><input id="pp" required value={f.prenom} onChange={maj('prenom')} /></div>
      <div><label htmlFor="pn">Nom</label><input id="pn" required value={f.nom} onChange={maj('nom')} /></div>
      <div><label htmlFor="pt">Téléphone (+229)</label><input id="pt" type="tel" value={f.telephone} onChange={maj('telephone')} /></div>
      <div><label htmlFor="pv">Ville</label><input id="pv" value={f.ville} onChange={maj('ville')} /></div></div>
      <label htmlFor="pa">À propos (150 caractères maximum)</label><textarea id="pa" rows={2} maxLength={150} value={f.a_propos} onChange={maj('a_propos')} />
      <Msg m={m} /><button className="btn jaune" type="submit">Enregistrer</button>
    </form>
    <div className="card"><h3>Application</h3>
      {inst && <button className="btn" onClick={() => { inst.prompt(); setInst(null) }}>Installer l'application</button>}
      {!inst && ios && <p>Pour installer : touchez Partager, puis « Sur l'écran d'accueil ».</p>}
      {!inst && !ios && <p className="muted">Si votre navigateur le permet, une icône d'installation apparaît dans sa barre d'adresse.</p>}
      <label style={{ fontWeight: 400 }}><input type="checkbox" style={{ width: 'auto', minHeight: 0 }} checked={eco} onChange={() => { document.body.classList.toggle('eco'); setEco(!eco) }} /> Mode économie de données (sans animations)</label>
    </div>
    <button className="btn ghost" onClick={sortir}>Se déconnecter</button>
  </>)
}
