# Plateforme Pigier Bénin

Application web installable (PWA) : React + Vite + Supabase.

## Mise en route
1. Supabase : exécutez le script SQL, créez votre projet, notez l'adresse du projet et la clé publique (anon).
2. Authentication > Sign In / Providers > Email : pendant les tests, désactivez « Confirm email » (sinon configurez Resend).
3. GitHub : décompressez ce dossier, créez un dépôt privé, glissez-déposez les fichiers et dossiers (jamais le fichier .env).
4. Cloudflare Pages : connectez le dépôt, commande `npm run build`, dossier de sortie `dist`.
   Variables : `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` (voir `.env.example`).
5. Créez votre compte dans l'application, puis exécutez dans Supabase la requête commentée à la fin du script SQL pour devenir administrateur.

## Test local (facultatif)
Copiez `.env.example` en `.env`, remplissez-le, puis `npm install` et `npm run dev`.
