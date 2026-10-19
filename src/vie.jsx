import { useEffect, useState } from 'react'
import { supabase } from './supabase'

const Msg = ({ m }) => (m ? <div className={'msg' + (m.ok ? ' ok' : '')} role="status">{m.t}</div> : null)
const fcfa = (n) => Number(n || 0).toLocaleString('fr-FR') + ' FCFA'
const jour = (d) => (d ? new Date(d).toLocaleDateString('fr-FR') : '')
const admin = (p) => p.role === 'administration'
const Onglets = ({ liste, val, set }) => (
  <div className="tabs" style={{ flexWrap: 'wrap' }}>
    {liste.map(([k, l]) => <button key={k} className={'btn ' + (val === k ? '' : 'ghost')} onClick={() => set(k)}>{l}</button>)}
  </div>
)
const Champ = ({ id, l, ...r }) => <><label htmlFor={id}>{l}</label><input id={id} {...r} /></>

/* ================= CAMPUS : calendrier et scolarité ================= */
export function Campus({ p }) {
  const [t, setT] = useState('calendrier')
  const o = [['calendrier', 'Calendrier']]
  if (p.role === 'etudiant') o.push(['scolarite', 'Ma scolarité'])
  return <><h1>Campus</h1><Onglets liste={o} val={t} set={setT} />{t === 'calendrier' ? <Calendrier p={p} /> : <Scolarite />}</>
}

function Calendrier({ p }) {
  const [l, setL] = useState([]), [m, setM] = useState(null), [f, setF] = useState({ titre: '', type: 'examen', debut: '', fin: '' })
  const charger = () => supabase.from('calendrier_academique').select('*').order('debut').then(({ data }) => setL(data || []))
  useEffect(() => { charger() }, [])
  const ajouter = async (e) => {
    e.preventDefault()
    const { error } = await supabase.from('calendrier_academique').insert({ titre: f.titre, type: f.type, debut: f.debut, fin: f.fin || null })
    setM(error ? { t: error.message } : { t: 'Date ajoutée.', ok: true })
    if (!error) { setF({ ...f, titre: '' }); charger() }
  }
  return (<>
    {l.length === 0 && <p className="muted">Aucune date au calendrier pour le moment.</p>}
    {l.map((x) => <div className="card" key={x.id}><h3><span className="badge">{x.type}</span>{x.titre}</h3><div className="muted">{jour(x.debut)}{x.fin ? ' au ' + jour(x.fin) : ''}</div></div>)}
    {admin(p) && <form className="card" onSubmit={ajouter}><h3>Ajouter une date</h3>
      <Champ id="ct" l="Titre" required value={f.titre} onChange={(e) => setF({ ...f, titre: e.target.value })} />
      <label htmlFor="cy">Type</label><select id="cy" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}><option value="examen">Examen</option><option value="vacances">Vacances</option><option value="soutenance">Soutenance</option><option value="autre">Autre</option></select>
      <div className="row"><div><Champ id="cd" l="Début" type="date" required value={f.debut} onChange={(e) => setF({ ...f, debut: e.target.value })} /></div><div><Champ id="cf" l="Fin (facultatif)" type="date" value={f.fin} onChange={(e) => setF({ ...f, fin: e.target.value })} /></div></div>
      <Msg m={m} /><button className="btn jaune" type="submit">Ajouter</button></form>}
  </>)
}

function Scolarite() {
  const [ins, setIns] = useState(null), [notes, setNotes] = useState([]), [abs, setAbs] = useState([])
  useEffect(() => {
    supabase.from('inscriptions').select('*, frais(*), paiements(*)').order('annee_academique', { ascending: false }).then(({ data }) => setIns(data || []))
    supabase.from('notes').select('*, modules(code, intitule, coefficient)').order('annee_academique', { ascending: false }).then(({ data }) => setNotes(data || []))
    supabase.from('absences').select('*').order('jour', { ascending: false }).then(({ data }) => setAbs(data || []))
  }, [])
  if (!ins) return <p>Chargement…</p>
  const somme = (a, k) => (a || []).reduce((s, x) => s + Number(x[k] || 0), 0)
  return (<>
    {ins.length === 0 && <p className="muted">Aucune inscription enregistrée pour le moment. Rapprochez-vous de la scolarité.</p>}
    {ins.map((i) => {
      const du = somme(i.frais, 'montant_du_fcfa'), paye = somme(i.paiements, 'montant_fcfa')
      return (<div className="card" key={i.id}>
        <h3>{i.annee_academique} · {i.niveau} · {i.statut}</h3>
        <div className="stats"><div className="stat"><b>{fcfa(du)}</b>à payer</div><div className="stat"><b>{fcfa(paye)}</b>payé</div></div>
        <span className="badge">{du - paye > 0 ? 'Solde : ' + fcfa(du - paye) : 'Soldé'}</span>
        {(i.frais || []).map((x) => <div className="muted" key={x.id}>{x.libelle} : {fcfa(x.montant_du_fcfa)}{x.echeance ? ' · échéance ' + jour(x.echeance) : ''}</div>)}
        {(i.paiements || []).map((x) => <div className="muted" key={x.id}>Paiement du {jour(x.date_paiement)} : {fcfa(x.montant_fcfa)}{x.mode ? ' (' + x.mode + ')' : ''}</div>)}
      </div>)
    })}
    <h2>Notes</h2>
    {notes.length === 0 && <p className="muted">Aucune note publiée.</p>}
    {notes.map((n) => <div className="card" key={n.id}><h3>{n.modules?.code} · {n.modules?.intitule}</h3><div>{n.note} / 20 <span className="badge">{n.valide ? 'Validé' : 'Non validé'}</span></div><div className="muted">{n.annee_academique} · {n.session}</div></div>)}
    <h2>Absences</h2>
    {abs.length === 0 ? <p className="muted">Aucune absence enregistrée.</p> : abs.map((a) => <div className="muted" key={a.id}>{jour(a.jour)} · {a.justifiee ? 'justifiée' : 'non justifiée'}{a.motif ? ' · ' + a.motif : ''}</div>)}
  </>)
}

/* ================= VIE : événements, clubs, cantine, alumni, annuaire, médias ================= */
export function Vie({ p }) {
  const [t, setT] = useState('evenements')
  const L = [['evenements', 'Événements'], ['clubs', 'Clubs'], ['cantine', 'Cantine'], ['alumni', 'Alumni'], ['annuaire', 'Annuaire'], ['medias', 'Médias']]
  return (<><h1>Vie à Pigier</h1><Onglets liste={L} val={t} set={setT} />
    {t === 'evenements' && <Evenements p={p} />}{t === 'clubs' && <Clubs p={p} />}{t === 'cantine' && <Cantine p={p} />}
    {t === 'alumni' && <Alumni p={p} />}{t === 'annuaire' && <Annuaire />}{t === 'medias' && <Medias p={p} />}</>)
}

function Evenements({ p }) {
  const [l, setL] = useState([]), [m, setM] = useState(null), [f, setF] = useState({ titre: '', type: '', debut: '', lieu: '', description: '' })
  const charger = async () => setL((await supabase.from('evenements').select('*, evenement_inscriptions(profil_id)').order('debut')).data || [])
  useEffect(() => { charger() }, [])
  const inscrire = async (e, oui) => {
    const r = oui ? await supabase.from('evenement_inscriptions').insert({ evenement_id: e.id })
      : await supabase.from('evenement_inscriptions').delete().eq('evenement_id', e.id).eq('profil_id', p.id)
    setM(r.error ? { t: r.error.message } : { t: oui ? 'Inscription enregistrée.' : 'Inscription annulée.', ok: true }); charger()
  }
  const creer = async (ev) => {
    ev.preventDefault()
    const { error } = await supabase.from('evenements').insert({ titre: f.titre, type: f.type || null, debut: new Date(f.debut).toISOString(), lieu: f.lieu, description: f.description, statut: 'publie' })
    setM(error ? { t: error.message } : { t: 'Événement publié.', ok: true }); if (!error) { setF({ titre: '', type: '', debut: '', lieu: '', description: '' }); charger() }
  }
  return (<>
    <Msg m={m} />
    {l.length === 0 && <p className="muted">Aucun événement prévu pour le moment.</p>}
    {l.map((e) => {
      const ins = (e.evenement_inscriptions || []).some((x) => x.profil_id === p.id)
      return (<div className="card" key={e.id}>
        <h3>{e.type && <span className="badge">{e.type}</span>}{e.titre}</h3>
        <div className="muted">{new Date(e.debut).toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' })}{e.lieu ? ' · ' + e.lieu : ''}</div>
        <p style={{ margin: '6px 0 0' }}>{e.description}</p>
        {admin(p) && <div className="muted">{(e.evenement_inscriptions || []).length} inscrit(s)</div>}
        {new Date(e.debut) > new Date() && (ins ? <button className="btn ghost" onClick={() => inscrire(e, false)}>Inscrit ✔ (annuler)</button> : <button className="btn jaune" onClick={() => inscrire(e, true)}>M'inscrire</button>)}
      </div>)
    })}
    {admin(p) && <form className="card" onSubmit={creer}><h3>Publier un événement</h3>
      <Champ id="et" l="Titre" required value={f.titre} onChange={(e) => setF({ ...f, titre: e.target.value })} />
      <Champ id="ey" l="Type (soirée, conférence, sport...)" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} />
      <Champ id="ed" l="Date et heure" type="datetime-local" required value={f.debut} onChange={(e) => setF({ ...f, debut: e.target.value })} />
      <Champ id="el" l="Lieu" value={f.lieu} onChange={(e) => setF({ ...f, lieu: e.target.value })} />
      <label htmlFor="ex">Description</label><textarea id="ex" rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
      <button className="btn jaune" type="submit">Publier</button></form>}
  </>)
}

function Clubs({ p }) {
  const [l, setL] = useState([]), [ad, setAd] = useState([]), [m, setM] = useState(null), [f, setF] = useState({ nom: '', categorie: '', description: '', jour_reunion: '' })
  const charger = async () => {
    setL((await supabase.from('clubs').select('*').order('nom')).data || [])
    setAd((await supabase.from('club_adhesions').select('club_id, profil_id')).data || [])
  }
  useEffect(() => { charger() }, [])
  const basculer = async (c, membre) => {
    const r = membre ? await supabase.from('club_adhesions').delete().eq('club_id', c.id).eq('profil_id', p.id) : await supabase.from('club_adhesions').insert({ club_id: c.id })
    setM(r.error ? { t: r.error.message } : null); charger()
  }
  const creer = async (e) => {
    e.preventDefault()
    const { error } = await supabase.from('clubs').insert(f)
    setM(error ? { t: error.message } : { t: 'Club créé.', ok: true }); if (!error) { setF({ nom: '', categorie: '', description: '', jour_reunion: '' }); charger() }
  }
  return (<>
    <Msg m={m} />
    {l.length === 0 && <p className="muted">Aucun club pour le moment.</p>}
    {l.map((c) => {
      const mem = ad.filter((x) => x.club_id === c.id), moi = mem.some((x) => x.profil_id === p.id)
      return (<div className="card" key={c.id}><h3>{c.categorie && <span className="badge">{c.categorie}</span>}{c.nom}</h3>
        <p style={{ margin: 0 }}>{c.description}</p>
        <div className="muted">{mem.length} membre(s){c.jour_reunion ? ' · réunion : ' + c.jour_reunion : ''}</div>
        {p.role !== 'administration' && (moi ? <button className="btn ghost" onClick={() => basculer(c, true)}>Membre ✔ (quitter)</button> : <button className="btn jaune" onClick={() => basculer(c, false)}>Rejoindre</button>)}
      </div>)
    })}
    {admin(p) && <form className="card" onSubmit={creer}><h3>Créer un club</h3>
      <Champ id="kn" l="Nom" required value={f.nom} onChange={(e) => setF({ ...f, nom: e.target.value })} />
      <Champ id="kc" l="Catégorie (danse, musique, sport...)" value={f.categorie} onChange={(e) => setF({ ...f, categorie: e.target.value })} />
      <Champ id="kj" l="Jour de réunion" value={f.jour_reunion} onChange={(e) => setF({ ...f, jour_reunion: e.target.value })} />
      <label htmlFor="kd">Description</label><textarea id="kd" rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
      <button className="btn jaune" type="submit">Créer</button></form>}
  </>)
}

function Cantine({ p }) {
  const [a, setA] = useState([]), [av, setAv] = useState([]), [menu, setMenu] = useState([]), [m, setM] = useState(null)
  const auj = new Date().toISOString().slice(0, 10)
  const charger = async () => {
    setA((await supabase.from('cantine_articles').select('*').order('categorie').order('nom')).data || [])
    setAv((await supabase.from('cantine_avis').select('article_id, note, profil_id')).data || [])
    setMenu(((await supabase.from('cantine_menu_jour').select('article_id').eq('jour', auj)).data || []).map((x) => x.article_id))
  }
  useEffect(() => { charger() }, [])
  const noter = async (id, note) => {
    const { error } = await supabase.from('cantine_avis').upsert({ article_id: id, note, profil_id: p.id }, { onConflict: 'article_id,profil_id' })
    setM(error ? { t: error.message } : { t: 'Merci pour votre note.', ok: true }); charger()
  }
  const basculer = async (id) => {
    if (menu.includes(id)) await supabase.from('cantine_menu_jour').delete().eq('jour', auj).eq('article_id', id)
    else await supabase.from('cantine_menu_jour').insert({ jour: auj, article_id: id })
    charger()
  }
  const Carte = ({ x }) => {
    const notes = av.filter((v) => v.article_id === x.id), moy = notes.length ? (notes.reduce((s, v) => s + v.note, 0) / notes.length).toFixed(1) : null
    const ma = (notes.find((v) => v.profil_id === p.id) || {}).note
    return (<div className="card"><h3>{x.nom}</h3><div>{fcfa(x.prix_fcfa)} {moy && <span className="muted">· {moy}/5 ({notes.length} avis)</span>}</div>
      <div aria-label="Noter ce plat">{[1, 2, 3, 4, 5].map((n) => <button key={n} aria-label={n + ' sur 5'} onClick={() => noter(x.id, n)} style={{ border: 0, background: 'none', fontSize: 26, minWidth: 44, minHeight: 44, color: n <= (ma || 0) ? '#FFC20E' : '#9aa8d4' }}>★</button>)}</div>
      {admin(p) && <button className="btn ghost" onClick={() => basculer(x.id)}>{menu.includes(x.id) ? 'Retirer du menu du jour' : 'Ajouter au menu du jour'}</button>}</div>)
  }
  const cats = [['plat', 'Plats'], ['jus', 'Jus'], ['en_cas', 'En-cas']]
  return (<>
    <Msg m={m} />
    <h2>Menu du jour</h2>
    {menu.length === 0 ? <p className="muted">Le menu du jour n'est pas encore publié.</p> : a.filter((x) => menu.includes(x.id)).map((x) => <Carte key={'m' + x.id} x={x} />)}
    {cats.map(([k, l]) => <div key={k}><h2>{l}</h2>{a.filter((x) => x.categorie === k).map((x) => <Carte key={x.id} x={x} />)}</div>)}
  </>)
}

function Alumni({ p }) {
  const [l, setL] = useState([]), [moi, setMoi] = useState(null), [m, setM] = useState(null), [seul, setSeul] = useState(false)
  const charger = async () => {
    setL((await supabase.from('alumni').select('*').order('nom')).data || [])
    if (p.role === 'alumni') setMoi((await supabase.from('alumni').select('*').eq('profil_id', p.id).maybeSingle()).data)
  }
  useEffect(() => { charger() }, [])
  const enregistrer = async (e) => {
    e.preventDefault()
    const { error } = await supabase.from('alumni').update({ poste: moi.poste, entreprise: moi.entreprise, ville: moi.ville, pays: moi.pays, mentorat: moi.mentorat, consentement_annuaire: moi.consentement_annuaire }).eq('id', moi.id)
    setM(error ? { t: error.message } : { t: 'Fiche enregistrée.', ok: true }); charger()
  }
  const maj = (k) => (e) => setMoi({ ...moi, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  return (<>
    {p.role === 'alumni' && moi && <form className="card" onSubmit={enregistrer}><h3>Ma fiche alumni</h3>
      <Champ id="ap" l="Poste actuel" value={moi.poste || ''} onChange={maj('poste')} /><Champ id="ae" l="Entreprise" value={moi.entreprise || ''} onChange={maj('entreprise')} />
      <div className="row"><div><Champ id="av" l="Ville" value={moi.ville || ''} onChange={maj('ville')} /></div><div><Champ id="ay" l="Pays" value={moi.pays || ''} onChange={maj('pays')} /></div></div>
      <label style={{ fontWeight: 400 }}><input type="checkbox" style={{ width: 'auto', minHeight: 0 }} checked={!!moi.consentement_annuaire} onChange={maj('consentement_annuaire')} /> J'accepte d'apparaître dans l'annuaire</label>
      <label style={{ fontWeight: 400 }}><input type="checkbox" style={{ width: 'auto', minHeight: 0 }} checked={!!moi.mentorat} onChange={maj('mentorat')} /> Je suis disponible pour accompagner des étudiants</label>
      <Msg m={m} /><button className="btn jaune" type="submit">Enregistrer</button></form>}
    {p.role === 'alumni' && !moi && <div className="msg">Votre fiche alumni n'existe pas encore : contactez l'administration.</div>}
    <label style={{ fontWeight: 400 }}><input type="checkbox" style={{ width: 'auto', minHeight: 0 }} checked={seul} onChange={() => setSeul(!seul)} /> Afficher seulement les mentors</label>
    {l.filter((x) => !seul || x.mentorat).length === 0 && <p className="muted">Aucun alumni dans l'annuaire pour le moment.</p>}
    {l.filter((x) => !seul || x.mentorat).map((x) => <div className="card" key={x.id}><h3>{x.prenom} {x.nom}{x.mentorat && <span className="badge" style={{ marginLeft: 8 }}>Mentor</span>}</h3>
      <div>{x.poste}{x.entreprise ? ' · ' + x.entreprise : ''}</div><div className="muted">{[x.ville, x.pays].filter(Boolean).join(', ')}{x.promotion_diplome ? ' · promotion ' + x.promotion_diplome : ''}</div>
      {x.mentorat && x.email && <a className="btn jaune" style={{ display: 'inline-block', textDecoration: 'none', lineHeight: '28px' }} href={'mailto:' + x.email + '?subject=Demande de mentorat'}>Demander un mentorat</a>}</div>)}
  </>)
}

function Annuaire() {
  const [s, setS] = useState(''), [et, setEt] = useState([]), [pr, setPr] = useState([])
  useEffect(() => {
    supabase.rpc('annuaire_etudiants').then(({ data }) => setEt(data || []))
    supabase.from('professeurs').select('id, nom, prenom, specialite').order('nom').then(({ data }) => setPr(data || []))
  }, [])
  const ok = (x) => (x.nom + ' ' + x.prenom).toLowerCase().includes(s.toLowerCase())
  return (<>
    <input aria-label="Rechercher une personne" placeholder="Rechercher par nom ou prénom" value={s} onChange={(e) => setS(e.target.value)} />
    <h2>Enseignants</h2>
    {pr.filter(ok).length === 0 && <p className="muted">Aucun résultat.</p>}
    {pr.filter(ok).slice(0, 100).map((x) => <div className="card" key={x.id}><h3>{x.prenom} {x.nom}</h3><div className="muted">{x.specialite}</div></div>)}
    <h2>Étudiants</h2>
    {et.filter(ok).length === 0 && <p className="muted">Aucun résultat.</p>}
    {et.filter(ok).slice(0, 100).map((x) => <div className="card" key={x.id}><h3>{x.prenom} {x.nom}</h3><div className="muted">{x.filiere} · {x.niveau}</div></div>)}
  </>)
}

function Medias({ p }) {
  const [vue, setVue] = useState('validee'), [l, setL] = useState([]), [urls, setUrls] = useState({}), [m, setM] = useState(null), [ouvert, setOuvert] = useState(false)
  const vide = { type: 'temoignage', titre: '', auteur_nom: '', theme: '', texte: '', lien_externe: '', fichier: null, consentement: false }
  const [d, setD] = useState(vide)
  const charger = async () => {
    const { data } = await supabase.from('medias').select('*').eq('statut', vue).order('cree_le', { ascending: false }).limit(50)
    setL(data || [])
    const chemins = (data || []).filter((x) => x.fichier_path).map((x) => x.fichier_path)
    if (chemins.length) { const r = await supabase.storage.from('medias').createSignedUrls(chemins, 3600); setUrls(Object.fromEntries((r.data || []).map((x) => [x.path, x.signedUrl]))) }
  }
  useEffect(() => { charger() }, [vue])
  const deposer = async (e) => {
    e.preventDefault(); setM(null)
    if (!d.consentement) return setM({ t: 'Le consentement de la personne concernée est obligatoire.' })
    let chemin = null
    if (d.fichier) {
      if (d.fichier.size > 5 * 1024 * 1024) return setM({ t: 'Image trop lourde (5 Mo maximum).' })
      chemin = p.id + '/' + Date.now() + '-' + d.fichier.name.replace(/[^\w.\-]/g, '_')
      const up = await supabase.storage.from('medias').upload(chemin, d.fichier)
      if (up.error) return setM({ t: 'Envoi impossible : ' + up.error.message })
    }
    const { error } = await supabase.from('medias').insert({ type: d.type, titre: d.titre, auteur_nom: d.auteur_nom, theme: d.theme, texte: d.texte, lien_externe: d.lien_externe || null, fichier_path: chemin, consentement: true })
    if (error) return setM({ t: error.message })
    setM({ t: 'Merci ! Votre contenu sera publié après validation.', ok: true }); setOuvert(false); setD(vide); setVue('en_attente'); charger()
  }
  const statut = async (x, s) => { const { error } = await supabase.from('medias').update({ statut: s }).eq('id', x.id); if (error) setM({ t: error.message }); else charger() }
  const retirer = async (x) => {
    if (!window.confirm('Retirer ce contenu ?')) return
    await supabase.from('medias').delete().eq('id', x.id)
    if (x.fichier_path) await supabase.storage.from('medias').remove([x.fichier_path])
    charger()
  }
  return (<>
    <div className="tabs" style={{ flexWrap: 'wrap' }}>
      <button className={'btn ' + (vue === 'validee' ? '' : 'ghost')} onClick={() => setVue('validee')}>Publiés</button>
      <button className={'btn ' + (vue === 'en_attente' ? '' : 'ghost')} onClick={() => setVue('en_attente')}>{admin(p) ? 'À valider' : 'Mes envois en attente'}</button>
      <button className="btn jaune" onClick={() => setOuvert(!ouvert)}>Proposer</button>
    </div>
    <Msg m={m} />
    {ouvert && <form className="card" onSubmit={deposer}><h3>Proposer un contenu</h3>
      <label htmlFor="mt">Type</label><select id="mt" value={d.type} onChange={(e) => setD({ ...d, type: e.target.value })}><option value="temoignage">Témoignage</option><option value="image">Image</option><option value="video">Vidéo (lien)</option></select>
      <Champ id="mi" l="Titre" required value={d.titre} onChange={(e) => setD({ ...d, titre: e.target.value })} />
      <Champ id="ma" l="Nom de la personne concernée" required value={d.auteur_nom} onChange={(e) => setD({ ...d, auteur_nom: e.target.value })} />
      <Champ id="mh" l="Thème (campus, événement, parcours...)" value={d.theme} onChange={(e) => setD({ ...d, theme: e.target.value })} />
      {d.type === 'temoignage' && <><label htmlFor="mx">Témoignage</label><textarea id="mx" rows={4} required value={d.texte} onChange={(e) => setD({ ...d, texte: e.target.value })} /></>}
      {d.type === 'image' && <><label htmlFor="mf">Image (JPG ou PNG)</label><input id="mf" type="file" accept="image/*" required onChange={(e) => setD({ ...d, fichier: e.target.files[0] })} /></>}
      {d.type === 'video' && <Champ id="ml" l="Lien de la vidéo (YouTube non répertorié...)" type="url" required value={d.lien_externe} onChange={(e) => setD({ ...d, lien_externe: e.target.value })} />}
      <label style={{ fontWeight: 400 }}><input type="checkbox" style={{ width: 'auto', minHeight: 0 }} checked={d.consentement} onChange={(e) => setD({ ...d, consentement: e.target.checked })} /> La personne concernée a donné son accord pour la publication de ce contenu et de son image.</label>
      <button className="btn jaune" type="submit">Envoyer</button></form>}
    {l.length === 0 && <p className="muted">Aucun contenu pour le moment.</p>}
    {l.map((x) => <div className="card" key={x.id}>
      <h3><span className="badge">{x.type}</span>{x.titre}</h3>
      {x.fichier_path && urls[x.fichier_path] && <img src={urls[x.fichier_path]} alt={x.titre} loading="lazy" style={{ maxWidth: '100%', borderRadius: 10 }} />}
      {x.texte && <p style={{ margin: '6px 0' }}>« {x.texte} »</p>}
      {x.lien_externe && <a href={x.lien_externe} target="_blank" rel="noopener noreferrer">Voir la vidéo</a>}
      <div className="muted">{x.auteur_nom}{x.theme ? ' · ' + x.theme : ''}</div>
      {admin(p) && x.statut === 'en_attente' && <><button className="btn" onClick={() => statut(x, 'validee')}>Valider</button><button className="btn ko" onClick={() => statut(x, 'refusee')}>Refuser</button></>}
      {(admin(p) || x.cree_par === p.id) && <button className="btn ghost" onClick={() => retirer(x)}>Retirer</button>}
    </div>)}
  </>)
}
