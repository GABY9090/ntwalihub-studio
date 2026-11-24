# Studio IA — Étape 1 (FR / EN)

Site web (installable sur téléphone) où l'utilisateur écrit une demande et reçoit une vidéo générée par IA.
Cette étape contient : connexion par e-mail, crédits (3 offerts), génération via fal.ai, galerie, remboursement automatique en cas d'échec.
**Les paiements (MoMo / carte) arrivent à l'étape 2.**

## Ce qu'il te faut
- [Node.js](https://nodejs.org) 20 ou plus
- Un compte [Supabase](https://supabase.com) (gratuit)
- Un compte [fal.ai](https://fal.ai) avec quelques dollars de crédit
- Un compte [Vercel](https://vercel.com) pour mettre en ligne (gratuit)

## Installation (une seule fois)
1. **Supabase** : crée un projet, va dans *SQL Editor*, colle tout le fichier `supabase/schema.sql` et clique *Run*.
2. Dans Supabase > *Authentication > URL Configuration*, mets ton adresse (ex : `http://localhost:3000`) dans *Site URL* et ajoute `http://localhost:3000/auth/callback` dans *Redirect URLs*.
3. **fal.ai** : crée une clé API dans le tableau de bord.
4. Copie `.env.example` en `.env.local` et remplis les valeurs.
5. Dans un terminal, dans ce dossier :
   ```
   npm install
   npm run dev
   ```
6. Ouvre http://localhost:3000

## En local
Pas besoin de ngrok : tant que la page Studio est ouverte, le site demande à fal.ai toutes les 5 secondes
si la vidéo est prête. Laisse `NEXT_PUBLIC_SITE_URL=http://localhost:3000`.
En ligne (adresse en https), fal.ai prévient aussi directement le site (webhook), en plus de cette vérification.

## Mise en ligne : code sur GitHub + site sur Cloudflare
1. Mets le code sur GitHub (dépôt **privé**). `.env.local` n'est jamais envoyé (il est dans `.gitignore`).
2. Cloudflare > **Workers & Pages** > **Create** > **Import a repository** > choisis ton dépôt GitHub.
   - Build command : `npx opennextjs-cloudflare build`
   - Deploy command : `npx opennextjs-cloudflare deploy`
3. Dans le Worker > **Settings** :
   - **Variables and Secrets** : ajoute toutes les lignes de `.env.local` (type *Secret* pour les clés).
   - **Build > Variables** : ajoute aussi `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     et `NEXT_PUBLIC_SITE_URL` (elles sont utilisées pendant la construction du site).
4. Worker > **Settings > Domains & Routes** > **Add > Custom domain** : `tondomaine.com` (Cloudflare fait le reste).
5. Mets `NEXT_PUBLIC_SITE_URL=https://tondomaine.com` partout, et dans Supabase > *Authentication > URL Configuration* :
   Site URL `https://tondomaine.com` et Redirect URL `https://tondomaine.com/auth/callback`.

Ensuite, chaque `git push` remet le site à jour automatiquement.
Tester la version Cloudflare sur ton ordinateur : copie `.env.local` en `.dev.vars`, puis `npm run preview`.

## E-mail de connexion à ton nom
1. Crée un compte sur [Resend](https://resend.com) (gratuit) > **Domains** > ajoute `tondomaine.com`.
   Resend donne des lignes DNS : ajoute-les dans Cloudflare > DNS (ou bouton automatique Cloudflare).
2. Resend > **API Keys** > crée une clé.
3. Supabase > *Authentication > Emails > SMTP Settings* > active **Custom SMTP** :
   - Sender email : `noreply@tondomaine.com` — Sender name : le nom de ton app
   - Host `smtp.resend.com` — Port `465` — Username `resend` — Password : ta clé Resend
4. Supabase > *Authentication > Emails > Templates > Magic Link* :
   colle le contenu de `supabase/email-connexion.html` et change le sujet.

## Comment ça marche
```
Studio (navigateur) → /api/generate → retire 1 crédit → envoie à fal.ai
fal.ai termine → /api/fal-webhook → copie la vidéo dans Supabase Storage → statut "prête"
Échec → crédit rendu automatiquement
```

## Fichiers
- `app/page.tsx` : page d'accueil
- `app/login/page.tsx` : connexion par lien e-mail
- `components/Studio.tsx` : écran principal (demande + galerie)
- `app/api/generate/route.ts` : lance une génération
- `app/api/fal-webhook/route.ts` : reçoit le résultat de fal.ai
- `lib/moderation.ts` : liste des mots interdits (à compléter)
- `supabase/schema.sql` : base de données, crédits, sécurité

## Changer de modèle vidéo
Modifie `FAL_MODEL` dans `.env.local` (vois les modèles et leurs prix sur fal.ai/models).
Vérifie que le modèle accepte un `prompt` et renvoie `video.url`.

## Prochaines étapes
- Étape 2 : achat de crédits (Flutterwave pour MoMo/Airtel, Stripe pour les cartes)
- Étape 3 : filigrane sur les vidéos gratuites, site en kinyarwanda/anglais
- Étape 4 : meilleure modération, limites par jour

## Étape 3 : projets (séries) et vidéos longues
1. Supabase > SQL Editor : colle `supabase/series.sql` et clique *Run* (une seule fois).
2. Dans `.env.local`, ajoute : `FAL_MODEL_I2V=minimax/h3-max/image-to-video`
   (optionnel : `FAL_RESOLUTION=480P` pour diviser le coût, qualité plus faible).

Fonctionnement :
- Chaque projet est comme une conversation : partie 1, puis partie 2, 3... qui continuent l'histoire.
- Une vidéo longue (jusqu'à 2 min par partie) est découpée en clips de 5 s, 1 crédit chacun.
  Chaque clip démarre sur la dernière image du précédent, pour une vidéo continue.
- Si les crédits sont épuisés, la partie s'arrête ; après un achat, le bouton *Continuer* reprend.
- *Créer le fichier complet* assemble tous les clips du projet en un seul MP4.
- Temps : environ 1 à 3 min par clip. 2 minutes de vidéo = 24 clips, donc parfois 30 min ou plus.
  En ligne, la génération continue même si la page est fermée (webhook) ; en local, garde la page ouverte.

### Collage automatique (étape 3b)
Supabase > SQL Editor : colle `supabase/collage.sql` et clique *Run*.
Quand une partie est finie (ex : 20 s = 4 clips), ses clips sont collés automatiquement :
le client reçoit une seule vidéo de 20 s. Les clips séparés restent visibles dans « Voir les clips ».
