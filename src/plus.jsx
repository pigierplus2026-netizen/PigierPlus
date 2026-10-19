-- =====================================================================
-- PIGIER BÉNIN - Ajout : messagerie, emploi du temps, confidentialité des profils
-- À coller dans Supabase > SQL Editor > New query > Run (une seule fois)
-- =====================================================================

-- 1. CONFIDENTIALITÉ : chacun ne lit plus que son propre profil.
--    (L'administration lit tout ; une entreprise lit seulement ses candidats.)
drop policy if exists profils_lecture on public.profils;
create policy profils_lecture on public.profils for select to authenticated
  using (id = auth.uid() or public.est_admin()
         or exists (select 1 from public.candidatures c
                    join public.offres o on o.id = c.offre_id
                    join public.entreprises e on e.id = o.entreprise_id
                    where c.profil_id = profils.id and e.profil_id = auth.uid()));

-- Liste minimale des membres (nom, prénom, rôle) pour la messagerie et le fil
create or replace function public.annuaire_profils()
returns table (id uuid, nom text, prenom text, role text)
language sql stable security definer set search_path = public as
$$ select p.id, p.nom, p.prenom, p.role from public.profils p
   where p.valide and p.actif and public.est_valide() $$;
revoke execute on function public.annuaire_profils() from public, anon;
grant execute on function public.annuaire_profils() to authenticated;

-- 2. MESSAGERIE PRIVÉE
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  expediteur uuid not null default auth.uid() references public.profils(id) on delete cascade,
  destinataire uuid not null references public.profils(id) on delete cascade,
  contenu text not null check (char_length(contenu) between 1 and 2000),
  lu boolean not null default false,
  cree_le timestamptz not null default now(),
  check (expediteur <> destinataire)
);
create index on public.messages (destinataire, cree_le desc);
create index on public.messages (expediteur, cree_le desc);
alter table public.messages enable row level security;
revoke all on public.messages from anon;
grant select, insert, delete on public.messages to authenticated;
create policy messages_lecture on public.messages for select to authenticated
  using (expediteur = auth.uid() or destinataire = auth.uid());
create policy messages_envoi on public.messages for insert to authenticated
  with check (expediteur = auth.uid() and public.est_valide());
create policy messages_suppression on public.messages for delete to authenticated
  using (expediteur = auth.uid());

create or replace function public.marquer_lus(p_autre uuid) returns void
language sql security definer set search_path = public as
$$ update public.messages set lu = true
   where destinataire = auth.uid() and expediteur = p_autre and not lu $$;
revoke execute on function public.marquer_lus(uuid) from public, anon;
grant execute on function public.marquer_lus(uuid) to authenticated;

-- 3. EMPLOI DU TEMPS
create table public.emploi_du_temps (
  id uuid primary key default gen_random_uuid(),
  filiere_id int not null references public.filieres(id) on delete cascade,
  niveau text not null check (niveau in ('L1','L2','L3','M1','M2')),
  jour int not null check (jour between 1 and 6),     -- 1 = lundi ... 6 = samedi
  debut time not null,
  fin time not null,
  matiere text not null,
  enseignant text,
  salle text
);
alter table public.emploi_du_temps enable row level security;
revoke all on public.emploi_du_temps from anon;
grant select, insert, update, delete on public.emploi_du_temps to authenticated;
create policy edt_lecture on public.emploi_du_temps for select to authenticated using (public.est_valide());
create policy edt_admin on public.emploi_du_temps for all to authenticated
  using (public.est_admin()) with check (public.est_admin());
