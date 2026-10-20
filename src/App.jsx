import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { CampusPlus, ViePlus, ScolariteAdmin } from './plus.jsx'
import { Vie } from './vie.jsx'

const Msg = ({ m }) => (m ? <div className={'msg' + (m.ok ? ' ok' : '')} role="status">{m.t}</div> : null)
const Champ = ({ id, l, ...r }) => <><label htmlFor={id}>{l}</label><input id={id} {...r} /></>
const NIV = ['L1', 'L2', 'L3', 'M1', 'M2']
const fcfa = (n) => Number(n || 0).toLocaleString('fr-FR') + ' FCFA'
const Onglets = ({ liste, val, set }) => (
  <div className="tabs" style={{ flexWrap: 'wrap' }}>
    {liste.map(([k, l]) => <button key={k} className={'btn ' + (val === k ? '' : 'ghost')} onClick={() => set(k)}>{l}</button>)}
  </div>
)
function useFilieres() {
  const [l, setL] = useState([])
  useEffect(() => { supabase.from('filieres').select('*').order('nom').then(({ data }) => setL(data || [])) }, [])
  return l
}
function useNoms() {
  const [l, setL] = useState([])
  useEffect(() => { supabase.rpc('annuaire_profils').then(({ data }) => setL(data || [])) }, [])
  return [l, Object.fromEntries(l.map((x) => [x.id, x]))]
}
const nomDe = (map, id) => (map[id] ? map[id].prenom + ' ' + map[id].nom : 'Membre')

/* ================= CAMPUS + : emploi du temps, programmes ================= */
export function CampusPlus({ p }) {
  const [t, setT] = useState('base')
  return (<>
    <Onglets liste={[['base', 'Calendrier et scolarité'], ['edt', 'Emploi du temps'], ['prog', 'Programmes']]} val={t} set={setT} />
    {t === 'base' && <Campus p={p} />}
    {t === 'edt' && <><h1>Emploi du temps</h1><EmploiDuTemps p={p} /></>}
    {t === 'prog' && <><h1>Programmes</h1><Programmes /></>}
  </>)
}

const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
function EmploiDuTemps({ p }) {
  const fil = useFilieres()
  const [sel, setSel] = useState({ filiere: '', niveau: '' }), [l, setL] = useState([]), [m, setM] = useState(null)
  const [f, setF] = useState({ jour: '1', debut: '08:00', fin: '10:00', matiere: '', enseignant: '', salle: '' })
  useEffect(() => {
    if (p.role === 'etudiant') supabase.from('etudiants').select('filiere_id, niveau').eq('profil_id', p.id).maybeSingle()
      .then(({ data }) => { if (data) setSel({ filiere: String(data.filiere_id || ''), niveau: data.niveau || '' }) })
  }, [])
  const charger = async () => {
    if (!sel.filiere || !sel.niveau) return setL([])
    setL((await supabase.from('emploi_du_temps').select('*').eq('filiere_id', sel.filiere).eq('niveau', sel.niveau).order('debut')).data || [])
  }
  useEffect(() => { charger() }, [sel.filiere, sel.niveau])
  const ajouter = async (e) => {
    e.preventDefault()
    const { error } = await supabase.from('emploi_du_temps').insert({ filiere_id: sel.filiere, niveau: sel.niveau, jour: Number(f.jour), debut: f.debut, fin: f.fin, matiere: f.matiere, enseignant: f.enseignant || null, salle: f.salle || null })
    setM(error ? { t: error.message } : { t: 'Cours ajouté.', ok: true }); if (!error) { setF({ ...f, matiere: '' }); charger() }
  }
  const retirer = async (x) => { await supabase.from('emploi_du_temps').delete().eq('id', x.id); charger() }
  const h = (t) => String(t).slice(0, 5)
  return (<>
    <div className="row">
      <select aria-label="Filière" value={sel.filiere} onChange={(e) => setSel({ ...sel, filiere: e.target.value })}><option value="">Choisir la filière</option>{fil.map((x) => <option key={x.id} value={x.id}>{x.nom}</option>)}</select>
      <select aria-label="Niveau" value={sel.niveau} onChange={(e) => setSel({ ...sel, niveau: e.target.value })}><option value="">Choisir le niveau</option>{NIV.map((x) => <option key={x}>{x}</option>)}</select>
    </div>
    {sel.filiere && sel.niveau && l.length === 0 && <p className="muted">Aucun cours enregistré pour cette classe.</p>}
    {JOURS.map((j, i) => { const c = l.filter((x) => x.jour === i + 1); return c.length ? (<div key={j}><h2>{j}</h2>
      {c.map((x) => <div className="card" key={x.id}><h3>{h(x.debut)} – {h(x.fin)} · {x.matiere}</h3><div className="muted">{[x.enseignant, x.salle && 'salle ' + x.salle].filter(Boolean).join(' · ')}</div>
        {p.role === 'administration' && <button className="btn ghost" onClick={() => retirer(x)}>Retirer</button>}</div>)}</div>) : null })}
    {p.role === 'administration' && sel.filiere && sel.niveau && <form className="card" onSubmit={ajouter}><h3>Ajouter un cours</h3>
      <label htmlFor="ej">Jour</label><select id="ej" value={f.jour} onChange={(e) => setF({ ...f, jour: e.target.value })}>{JOURS.map((j, i) => <option key={j} value={i + 1}>{j}</option>)}</select>
      <div className="row"><div><Champ id="eh1" l="Début" type="time" required value={f.debut} onChange={(e) => setF({ ...f, debut: e.target.value })} /></div><div><Champ id="eh2" l="Fin" type="time" required value={f.fin} onChange={(e) => setF({ ...f, fin: e.target.value })} /></div></div>
      <Champ id="em" l="Matière" required value={f.matiere} onChange={(e) => setF({ ...f, matiere: e.target.value })} />
      <Champ id="ee" l="Enseignant" value={f.enseignant} onChange={(e) => setF({ ...f, enseignant: e.target.value })} />
      <Champ id="es" l="Salle" value={f.salle} onChange={(e) => setF({ ...f, salle: e.target.value })} />
      <Msg m={m} /><button className="btn jaune" type="submit">Ajouter</button></form>}
  </>)
}

function Programmes() {
  const fil = useFilieres()
  const [sel, setSel] = useState(''), [niv, setNiv] = useState(''), [mods, setMods] = useState([])
  useEffect(() => {
    if (!sel) return setMods([])
    let q = supabase.from('modules').select('*, professeurs(nom, prenom)').eq('filiere_id', sel).order('niveau').order('semestre').order('code')
    if (niv) q = q.eq('niveau', niv)
    q.then(({ data }) => setMods(data || []))
  }, [sel, niv])
  return (<>
    <div className="row">
      <select aria-label="Filière" value={sel} onChange={(e) => setSel(e.target.value)}><option value="">Choisir la filière</option>{fil.map((x) => <option key={x.id} value={x.id}>{x.nom}</option>)}</select>
      <select aria-label="Niveau" value={niv} onChange={(e) => setNiv(e.target.value)}><option value="">Tous les niveaux</option>{NIV.map((x) => <option key={x}>{x}</option>)}</select>
    </div>
    {sel && mods.length === 0 && <p className="muted">Aucun module enregistré pour cette sélection.</p>}
    {mods.map((x) => <div className="card" key={x.id}><h3><span className="badge">{x.code}</span>{x.intitule}</h3>
      <div className="muted">{x.niveau} · semestre {x.semestre} · coefficient {x.coefficient} · {x.volume_horaire} h{x.professeurs ? ' · ' + x.professeurs.prenom + ' ' + x.professeurs.nom : ''}</div></div>)}
  </>)
}

/* ================= VIE + : fil d'actualité, messagerie ================= */
export function ViePlus({ p }) {
  const [t, setT] = useState('fil')
  return (<>
    <Onglets liste={[['fil', 'Fil'], ['msg', 'Messages'], ['vie', 'Clubs, cantine, événements…']]} val={t} set={setT} />
    {t === 'fil' && <Fil p={p} />}{t === 'msg' && <Messages p={p} />}{t === 'vie' && <Vie p={p} />}
  </>)
}

function Fil({ p }) {
  const [, noms] = useNoms()
  const [l, setL] = useState([]), [re, setRe] = useState([]), [txt, setTxt] = useState(''), [m, setM] = useState(null)
  const charger = async () => {
    const pub = (await supabase.from('publications').select('*').order('cree_le', { ascending: false }).limit(40)).data || []
    setL(pub)
    if (pub.length) setRe((await supabase.from('publication_reactions').select('publication_id, profil_id').in('publication_id', pub.map((x) => x.id))).data || [])
  }
  useEffect(() => { charger() }, [])
  const publier = async (e) => {
    e.preventDefault()
    const { error } = await supabase.from('publications').insert({ contenu: txt })
    setM(error ? { t: error.message } : null); if (!error) { setTxt(''); charger() }
  }
  const aimer = async (x, moi) => {
    if (moi) await supabase.from('publication_reactions').delete().eq('publication_id', x.id).eq('profil_id', p.id)
    else await supabase.from('publication_reactions').insert({ publication_id: x.id })
    charger()
  }
  const retirer = async (x) => { if (window.confirm('Supprimer cette publication ?')) { await supabase.from('publications').delete().eq('id', x.id); charger() } }
  return (<>
    <form className="card" onSubmit={publier}><label htmlFor="fp">Partager avec la communauté</label>
      <textarea id="fp" rows={3} maxLength={2000} required value={txt} onChange={(e) => setTxt(e.target.value)} />
      <Msg m={m} /><button className="btn jaune" type="submit">Publier</button></form>
    {l.length === 0 && <p className="muted">Aucune publication pour le moment. Lancez la conversation !</p>}
    {l.map((x) => { const r = re.filter((v) => v.publication_id === x.id), moi = r.some((v) => v.profil_id === p.id); return (
      <div className="card" key={x.id}><h3>{nomDe(noms, x.auteur)}</h3><div className="muted">{new Date(x.cree_le).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}</div>
        <p style={{ margin: '6px 0', whiteSpace: 'pre-wrap' }}>{x.contenu}</p>
        <button className={'btn ' + (moi ? '' : 'ghost')} onClick={() => aimer(x, moi)}>J'aime ({r.length})</button>
        {(x.auteur === p.id || p.role === 'administration') && <button className="btn ghost" onClick={() => retirer(x)}>Supprimer</button>}</div>) })}
  </>)
}

function Messages({ p }) {
  const [liste, noms] = useNoms()
  const [msgs, setMsgs] = useState([]), [avec, setAvec] = useState(null), [txt, setTxt] = useState(''), [q, setQ] = useState(''), [m, setM] = useState(null)
  const charger = async () => setMsgs((await supabase.from('messages').select('*').order('cree_le', { ascending: false }).limit(300)).data || [])
  useEffect(() => { charger(); const t = setInterval(charger, 20000); return () => clearInterval(t) }, [])
  const ouvrir = (id) => { setAvec(id); supabase.rpc('marquer_lus', { p_autre: id }).then(charger) }
  const envoyer = async (e) => {
    e.preventDefault()
    const { error } = await supabase.from('messages').insert({ destinataire: avec, contenu: txt })
    setM(error ? { t: error.message } : null); if (!error) { setTxt(''); charger() }
  }
  if (avec) {
    const fil = msgs.filter((x) => x.expediteur === avec || x.destinataire === avec).slice().reverse()
    return (<>
      <button className="btn ghost" onClick={() => setAvec(null)}>← Retour</button>
      <h2>{nomDe(noms, avec)}</h2>
      {fil.length === 0 && <p className="muted">Écrivez le premier message.</p>}
      {fil.map((x) => <div key={x.id} style={{ textAlign: x.expediteur === p.id ? 'right' : 'left', margin: '6px 0' }}>
        <span style={{ display: 'inline-block', maxWidth: '85%', padding: '8px 12px', borderRadius: 12, textAlign: 'left', whiteSpace: 'pre-wrap', background: x.expediteur === p.id ? '#0000A0' : '#EAF0FB', color: x.expediteur === p.id ? '#fff' : '#1b1f2a' }}>{x.contenu}</span>
        <div className="muted" style={{ fontSize: 12 }}>{new Date(x.cree_le).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</div></div>)}
      <form onSubmit={envoyer}><label htmlFor="mm">Votre message</label><textarea id="mm" rows={2} maxLength={2000} required value={txt} onChange={(e) => setTxt(e.target.value)} />
        <Msg m={m} /><button className="btn jaune" type="submit">Envoyer</button></form>
    </>)
  }
  const convs = {}
  msgs.forEach((x) => { const o = x.expediteur === p.id ? x.destinataire : x.expediteur; if (!convs[o]) convs[o] = { id: o, dernier: x, nonLus: 0 }; if (x.destinataire === p.id && !x.lu) convs[o].nonLus++ })
  const trouves = q.length > 1 ? liste.filter((x) => x.id !== p.id && (x.prenom + ' ' + x.nom).toLowerCase().includes(q.toLowerCase())).slice(0, 8) : []
  return (<>
    <h2>Nouveau message</h2>
    <input aria-label="Rechercher une personne" placeholder="Rechercher une personne par nom" value={q} onChange={(e) => setQ(e.target.value)} />
    {trouves.map((x) => <button key={x.id} className="btn ghost" onClick={() => { setQ(''); ouvrir(x.id) }}>{x.prenom} {x.nom}</button>)}
    <h2>Conversations</h2>
    {Object.values(convs).length === 0 && <p className="muted">Aucune conversation pour le moment.</p>}
    {Object.values(convs).map((c) => <div className="card" key={c.id} style={{ cursor: 'pointer' }} onClick={() => ouvrir(c.id)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') ouvrir(c.id) }}>
      <h3>{nomDe(noms, c.id)} {c.nonLus > 0 && <span className="badge">{c.nonLus} nouveau(x)</span>}</h3>
      <div className="muted">{c.dernier.contenu.slice(0, 80)}</div></div>)}
  </>)
}

/* ================= ADMINISTRATION : saisie de la scolarité ================= */
function Mini({ titre, champs, init, envoyer }) {
  const [v, setV] = useState(init)
  return (<form className="card" onSubmit={async (e) => { e.preventDefault(); await envoyer(v); setV(init) }}><h3>{titre}</h3>
    {champs.map(([k, l, t, o]) => <div key={k}><label htmlFor={titre + k}>{l}</label>
      {o ? <select id={titre + k} value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value })}>{o.map((x) => <option key={x[0]} value={x[0]}>{x[1]}</option>)}</select>
        : <input id={titre + k} type={t || 'text'} required={t !== 'texte-facultatif'} value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value })} />}</div>)}
    <button className="btn jaune" type="submit">Enregistrer</button></form>)
}

export function ScolariteAdmin() {
  const [q, setQ] = useState(''), [res, setRes] = useState([]), [et, setEt] = useState(null), [ins, setIns] = useState([]), [mods, setMods] = useState([]), [insSel, setInsSel] = useState(''), [m, setM] = useState(null)
  const chercher = async () => {
    const s = q.replace(/[,%()]/g, '').trim(); if (s.length < 2) return
    setRes((await supabase.from('etudiants').select('id, identifiant, nom, prenom, niveau, filiere_id').or(`nom.ilike.%${s}%,prenom.ilike.%${s}%,identifiant.ilike.%${s}%`).limit(10)).data || [])
  }
  const charger = async (e) => {
    const r = (await supabase.from('inscriptions').select('*, frais(*), paiements(*)').eq('etudiant_id', e.id).order('annee_academique', { ascending: false })).data || []
    setIns(r); if (r.length && !insSel) setInsSel(r[0].id)
    setMods((await supabase.from('modules').select('id, code, intitule').order('code')).data || [])
  }
  const choisir = (e) => { setEt(e); setRes([]); setInsSel(''); charger(e) }
  const ok = (r, msg) => { setM(r.error ? { t: r.error.message } : { t: msg, ok: true }); if (!r.error) charger(et) }
  const somme = (a, k) => (a || []).reduce((s, x) => s + Number(x[k] || 0), 0)
  return (<>
    <h2>Scolarité : saisie par étudiant</h2>
    <div className="row"><input aria-label="Rechercher un étudiant" placeholder="Nom, prénom ou identifiant PGB-..." value={q} onChange={(e) => setQ(e.target.value)} />
      <button className="btn" type="button" onClick={chercher}>Rechercher</button></div>
    {res.map((e) => <button key={e.id} className="btn ghost" onClick={() => choisir(e)}>{e.identifiant} · {e.prenom} {e.nom} · {e.niveau}</button>)}
    <Msg m={m} />
    {et && <>
      <div className="card"><h3>{et.prenom} {et.nom} ({et.identifiant})</h3>
        {ins.map((i) => <div key={i.id} className="muted">{i.annee_academique} · {i.niveau} : dû {fcfa(somme(i.frais, 'montant_du_fcfa'))}, payé {fcfa(somme(i.paiements, 'montant_fcfa'))}</div>)}
        {ins.length === 0 && <div className="muted">Aucune inscription : créez-la ci-dessous.</div>}</div>
      <Mini titre="Nouvelle inscription" init={{ annee: '2026-2027', niveau: et.niveau || 'L1' }} champs={[['annee', 'Année académique'], ['niveau', 'Niveau', null, NIV.map((x) => [x, x])]]}
        envoyer={async (v) => ok(await supabase.from('inscriptions').insert({ etudiant_id: et.id, annee_academique: v.annee, niveau: v.niveau, filiere_id: et.filiere_id }), 'Inscription créée.')} />
      {ins.length > 0 && <>
        <label htmlFor="isel">Inscription concernée</label>
        <select id="isel" value={insSel} onChange={(e) => setInsSel(e.target.value)}>{ins.map((i) => <option key={i.id} value={i.id}>{i.annee_academique} · {i.niveau}</option>)}</select>
        <Mini titre="Ajouter des frais" init={{ libelle: 'Scolarité', montant: '', echeance: '' }} champs={[['libelle', 'Libellé'], ['montant', 'Montant (FCFA)', 'number'], ['echeance', 'Échéance (facultatif)', 'date']]}
          envoyer={async (v) => ok(await supabase.from('frais').insert({ inscription_id: insSel, libelle: v.libelle, montant_du_fcfa: Number(v.montant), echeance: v.echeance || null }), 'Frais ajoutés.')} />
        <Mini titre="Enregistrer un paiement" init={{ montant: '', mode: 'Espèces', reference: '' }} champs={[['montant', 'Montant (FCFA)', 'number'], ['mode', 'Mode (espèces, virement, mobile money…)'], ['reference', 'Référence', 'texte-facultatif']]}
          envoyer={async (v) => ok(await supabase.from('paiements').insert({ inscription_id: insSel, montant_fcfa: Number(v.montant), mode: v.mode, reference: v.reference || null }), 'Paiement enregistré.')} /></>}
      <Mini titre="Saisir une note" init={{ module: mods[0] ? mods[0].id : '', annee: '2026-2027', session: 'normale', note: '' }}
        champs={[['module', 'Module', null, mods.map((x) => [x.id, x.code + ' · ' + x.intitule])], ['annee', 'Année académique'], ['session', 'Session', null, [['normale', 'Normale'], ['rattrapage', 'Rattrapage']]], ['note', 'Note sur 20', 'number']]}
        envoyer={async (v) => ok(await supabase.from('notes').insert({ etudiant_id: et.id, module_id: v.module || mods[0]?.id, annee_academique: v.annee, session: v.session, note: Number(v.note), valide: Number(v.note) >= 10 }), 'Note enregistrée (validée si 10 ou plus).')} />
      <Mini titre="Enregistrer une absence" init={{ jour: '', justifiee: 'non', motif: '' }} champs={[['jour', 'Date', 'date'], ['justifiee', 'Justifiée ?', null, [['non', 'Non'], ['oui', 'Oui']]], ['motif', 'Motif', 'texte-facultatif']]}
        envoyer={async (v) => ok(await supabase.from('absences').insert({ etudiant_id: et.id, jour: v.jour, justifiee: v.justifiee === 'oui', motif: v.motif || null }), 'Absence enregistrée.')} />
    </>}
  </>)
}
