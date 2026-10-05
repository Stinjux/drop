# Boréa : boutique monoproduit (Canada, FR/EN, Stripe Checkout)

Boutique de dropshipping monoproduit construite avec **Next.js 16 (App Router), TypeScript, Tailwind CSS 4,
Framer Motion et Zustand**, dans une direction artistique **néo-moderne / néo-brutaliste**.
Elle inclut une base **libSQL/SQLite**, un paiement **Stripe Checkout** avec webhooks idempotents, un espace
d'administration protégé et un traitement fournisseur manuel. Le français est la langue par défaut, l'anglais est disponible, et la devise est le CAD.

> ⚠️ **Contenu produit provisoire.** La fiche AliExpress `1005005777504095` n'a pas pu être consultée
> automatiquement (protection anti-robot / captcha). Aucun nom, caractéristique, variante, dimension,
> coût ni délai n'a été inventé : tout est marqué « à confirmer » et les visuels sont des gabarits marqués
> « VISUEL PROVISOIRE ». Un bandeau « Aperçu » s'affiche et l'indexation est bloquée tant que
> `product.confirmed` vaut `false`.

Aperçus (générés par les tests e2e) : [`docs/preview/`](docs/preview/).

### Design system

Il est défini dans `src/app/globals.css` (`@theme`). Avec Tailwind 4, la configuration du thème se fait en CSS
et non plus dans `tailwind.config`.

| Élément | Valeur |
| --- | --- |
| Fond / texte | `#F4F3EF` / `#0E0E0E` |
| Accent unique | `#FF3B00`, réservé aux CTA, prix et badges, toujours avec du **texte noir** (contraste 5,9:1, AA) |
| Formes | Coins carrés, bordures 3 px, ombres dures `6px 6px 0 #000`, aucun dégradé, grille visible |
| Titres | **Unbounded** 700 (hero : `clamp(3rem, 8vw, 7rem)`, interligne 0,95, -0,03em, majuscules) |
| Corps | **Satoshi** (Fontshare), 17 px |
| Prix et compteurs | **JetBrains Mono** |
| Interactions | Boutons qui s'enfoncent (`.btn-press`), bandeau défilant, focus visible 2 px accent |

**Polices.** Unbounded et JetBrains Mono sont sous licence OFL et passent par npm et `next/font` (préchargées).
Satoshi est sous ITF Free Font License : l'auto-hébergement est autorisé, la redistribution interdite. Comme le
dépôt est **public**, ses fichiers ne sont pas versionnés : `scripts/fetch-fonts.mjs` la télécharge depuis
Fontshare au `npm run dev` / `npm run build`. Si le téléchargement échoue, une police système prend le relais.

### Règles d'honnêteté appliquées par le code
- **Note ★ et avis** : calculés uniquement à partir de `product.reviews` (vrais avis). Liste vide = rien d'affiché.
- **Prix barré et badge « -XX % »** : seulement si `pricing.compareAt` est renseigné **avec une justification**,
  ou pour la remise de quantité réelle (prix d'une unité × quantité).
- **Barre « plus que X $ pour un cadeau »** : seulement si `gift.enabled`. Le cadeau est enregistré sur la
  commande par le serveur et signalé dans l'admin pour être ajouté au colis.
- **Pas de « stock limité »** ni de compte à rebours : le bandeau défilant ne contient que des arguments vrais
  (livraison gratuite, retours 30 jours, paiement sécurisé, délai).
- **Comparatif** : « Variable » plutôt qu'une affirmation non vérifiée sur les concurrents.

---

## 1. Démarrage

```bash
npm install
cp .env.example .env.local      # compléter (voir §2) — .env.local est ignoré par Git
npm run dev                     # http://localhost:3000 → redirige vers /fr
```

La base SQLite (`data/store.db`) et son schéma sont créés automatiquement au premier accès.

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Serveur de développement |
| `npm run build` puis `npm start` | Build et serveur de production |
| `npm run lint` · `npm run typecheck` | Vérifications statiques |
| `npm test` | Tests unitaires et d'intégration (Vitest) |
| `npm run test:e2e` | Tests navigateur mobile et desktop (Playwright), avec captures dans `tests/.tmp/screenshots` |
| `npm run stripe:listen` | Relais des webhooks Stripe en local (Stripe CLI) |

## 2. Variables d'environnement

Tout est documenté dans [`.env.example`](.env.example). **Aucune clé privée n'est exposée au navigateur.**
Seule `NEXT_PUBLIC_SITE_URL` est publique.

| Variable | Obligatoire | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | oui | URL publique (HTTPS en production) |
| `STRIPE_SECRET_KEY` | oui | Clé **restreinte** recommandée (`rk_test_…`) |
| `STRIPE_WEBHOOK_SECRET` | oui | `whsec_…` de l'endpoint webhook |
| `STRIPE_TAX_ENABLED` | non | `true` seulement après configuration de Stripe Tax (§4.5) |
| `STORE_ALLOW_LIVE_PAYMENTS` | non | Garde-fou : clés live refusées tant que ≠ `true` |
| `DATABASE_URL` / `DATABASE_AUTH_TOKEN` | oui en prod. | `file:./data/store.db` en local ; `libsql://…` (Turso) en serverless |
| `ADMIN_PASSWORD` / `ADMIN_SESSION_SECRET` | oui | 12 et 32 caractères minimum, sinon `/admin` est désactivé |
| `RESEND_API_KEY` / `EMAIL_FROM` | non | Sans eux, aucun courriel n'est envoyé (statut visible dans l'admin) |
| `ORDER_NOTIFICATION_EMAIL`, `EMAIL_REPLY_TO` | non | Copie des confirmations, adresse de réponse |
| `CLIENT_IP_HEADER` | non | En-tête IP fiable de l'hébergeur (limitation de débit) |

## 3. Où modifier le contenu

Toute l'information modifiable est centralisée :

| Fichier | Contenu |
| --- | --- |
| `src/config/store.ts` | Marque, contact, identité légale, livraison (tarifs, seuil gratuit, délais), retours, quantité max., durée de session |
| **`data/product.ts`** | **Fichier unique du produit** : nom, titre, problème résolu, variantes, prix et paliers, prix barré justifié, cadeau, médias, avant/après, caractéristiques, étapes, comparatif, FAQ, avis |
| `src/content/fr.ts`, `en.ts` | Textes de l'interface |
| `src/server/supplier-config.ts` | **Interne** : URL fournisseur, coût, correspondance des variantes (jamais envoyé au navigateur) |
| `src/app/globals.css` (`@theme`) | Couleurs, polices, ombres |
| `public/product/` | Photos (`hero.jpg`, `angle-1.jpg`…), voir `public/product/README.md` |

**Prix et lots.** Ils sont définis par des paliers de prix unitaire selon la quantité totale
(`product.pricing.tiers`, en cents). Le palier 1 unité est le prix de référence qui justifie le prix
barré et les économies affichées. Le calcul (`src/lib/pricing.ts`) est partagé par le navigateur et le
serveur. Le pourcentage d'économie est arrondi à la baisse.

**Médias.** Remplacez les JPG provisoires de `public/product/` par vos photos (dont vous détenez les droits)
**en gardant les mêmes noms**, puis passez `provisional: false` dans `data/product.ts`. Les images de la
galerie sont carrées : prévoyez un sujet centré. Les liens directs vers les images du fournisseur sont à éviter.

**Avis.** La section reste masquée tant que `product.reviews` est vide. N'y mettez que de vrais avis,
publiés avec l'accord de leur auteur.

**Pages légales.** Les routes `/cgv`, `/confidentialite`, `/retours`, `/contact`, `/livraison` et
`/suivi-commande` redirigent vers `/fr/…` (EN : `/en/terms`, `/en/privacy`…). Le contenu est dans
`src/components/info-pages.tsx`. Le **suivi de commande** est un formulaire (numéro + courriel), limité
à 10 recherches par 15 min, avec une réponse identique en cas d'erreur pour éviter l'énumération ; il n'affiche ni adresse ni montant.
Les pages affichent en surbrillance « À compléter » les champs manquants
de `store.legal` et `store.contact`. Ce sont des modèles à faire valider avant publication
(Loi sur la protection du consommateur et Loi 25 au Québec).

**Liste de lancement.** `/admin` affiche automatiquement les points encore provisoires ou non configurés.

## 4. Stripe

### 4.1 Compte de test séparé
Créez un **compte Stripe dédié** (ou un environnement de test / sandbox) pour la boutique, en mode test.
Dans *Paramètres > Moyens de paiement*, activez les moyens voulus. Le code ne fixe **pas**
`payment_method_types` : Stripe présente les moyens admissibles selon le client, le montant et la devise CAD.
Dans *Paramètres > Image de marque*, ajoutez le logo et les couleurs, qui s'affichent sur la page Checkout.

### 4.2 Clé restreinte
*Développeurs > Clés API > Créer une clé restreinte* avec **Checkout Sessions : Écriture**. Les prix
sont envoyés en `price_data`, il n'y a donc aucun produit à créer dans Stripe. Si Stripe répond par une erreur de permission,
le message nomme la permission manquante : ajoutez-la à la clé. Placez la clé dans `STRIPE_SECRET_KEY`
via les secrets de l'environnement, jamais dans le code ni dans une conversation.

### 4.3 Webhook
Endpoint : `POST /api/stripe/webhook` (runtime Node). La signature est vérifiée sur le **corps brut**.

- **En local** : `stripe login`, puis `npm run stripe:listen`. Copiez le `whsec_…` affiché dans `STRIPE_WEBHOOK_SECRET`.
- **En production** : *Développeurs > Webhooks > Ajouter un endpoint* `https://votre-domaine/api/stripe/webhook`
  avec les événements :
  `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
  `checkout.session.async_payment_failed` et `checkout.session.expired`.
  Choisissez de préférence la version d'API du SDK (`2026-09-30.endive`). Les versions antérieures restent prises en charge.

### 4.4 Parcours et garanties
1. Le navigateur envoie **uniquement** `{ variantId, quantity }[]`, la langue et une clé de tentative (UUID).
   Tout autre champ (prix, montant…) donne une **400**. Variantes, quantités (entières, 1 à 10) et total sont
   validés côté serveur.
2. Le serveur recalcule les montants depuis la configuration, crée une commande `pending`, puis une session
   Checkout (`mode: payment`, adresse limitée au Canada, frais et délai de livraison affichés, langue fr-CA/en)
   avec une **clé d'idempotence**. Les doubles clics réutilisent la même commande et la même session.
3. Protections : vérification de l'origine (CSRF), taille de corps limitée, **limitation de débit**
   (12 sessions par 10 min et par IP, stockée en base), blocage des clés live tant que `STORE_ALLOW_LIVE_PAYMENTS≠true`.
4. **Seul le webhook** fait passer une commande à « payée » :
   `completed` + `payment_status=paid` donne **payée** ; `completed` + `unpaid` donne **paiement différé** ;
   `async_payment_succeeded` donne **payée** ; `async_payment_failed` donne **échouée** ; `expired` donne **expirée**.
   Une commande payée ne régresse jamais, même si les événements arrivent dans le désordre.
5. **Idempotence** : l'identifiant d'événement est enregistré dans la même transaction que la mise à jour.
   Un événement répété est ignoré. Le courriel est « réservé » atomiquement, donc envoyé au plus une fois.
6. La page `/checkout/success` **ne confirme rien** : elle affiche le statut en base (écrit par le webhook)
   et s'actualise. Avec un `session_id` inventé, elle affiche « confirmation non reçue ».
7. Un écart entre le sous-total Stripe et le calcul serveur marque la commande « à vérifier » dans l'admin.

### 4.5 Taxes
Par défaut, **aucune taxe n'est perçue** (`STRIPE_TAX_ENABLED=false`) et le site l'indique sans inventer de taux.
Pour percevoir la TPS/TVH/TVQ : vérifiez vos obligations (inscriptions à Revenu Québec et à l'ARC,
seuil du petit fournisseur), configurez **Stripe Tax** dans le Dashboard (adresse d'origine, inscriptions,
code fiscal produit), puis passez `STRIPE_TAX_ENABLED=true`. Le code active alors `automatic_tax` et
`tax_behavior: exclusive`, et l'interface annonce « taxes calculées au paiement ».

### 4.6 Achat test complet (avec vos clés de test)
1. `.env.local` : `STRIPE_SECRET_KEY=rk_test_…`, puis lancez `npm run stripe:listen` et `npm run dev`.
2. Commandez sur `/fr` et payez avec `4242 4242 4242 4242`, une date future et un CVC quelconque.
   La commande passe à « Payée » dans `/admin`.
3. **Refus** : `4000 0000 0000 0002`. Stripe affiche l'erreur et aucune commande n'est payée.
4. **Authentification 3DS** : `4000 0025 0000 3155`.
5. **Annulation** : bouton retour de la page Stripe, qui mène à `/checkout/cancel` (panier conservé).
   La session expire ensuite (statut « expirée »).
6. **Paiements différés** : utilisez un moyen différé disponible au Canada (ex. prélèvement préautorisé
   ACSS, avec les comptes de test Stripe), ou bien `stripe trigger checkout.session.async_payment_succeeded`.
7. **Webhooks répétés** : *Dashboard > Webhooks > événement > Renvoyer*. Le résultat est `duplicate` et rien ne change.

## 5. Traitement fournisseur (manuel)

Stripe encaisse ; l'achat chez le fournisseur est **un processus distinct**. Aucune commande AliExpress
n'est simulée ni automatisée.

1. `/admin` affiche les commandes **payées à commander**.
2. La fiche commande donne le lien fournisseur, l'option à choisir pour chaque variante, l'adresse
   prête à copier et le téléphone. Les formulaires sont désactivés tant que le paiement n'est pas confirmé.
3. Passez la commande chez le fournisseur, puis saisissez **son numéro et le coût réel**. Le statut devient
   « Commandée chez le fournisseur ».
4. À réception du suivi, saisissez le **transporteur, le numéro et le lien**. Le statut passe à « Expédiée » et le
   courriel d'expédition part (s'il est configuré).
5. Export **CSV** filtrable, compatible Excel et protégé contre l'injection de formules.

Le module est isolé dans `src/server/fulfillment/` (interface `FulfillmentProvider`). Une future
intégration officielle (API fournisseur autorisée) implémentera `submitOrder` sans toucher au reste.

## 6. Courriels

Confirmation (après paiement confirmé) et expédition (après saisie du suivi), en FR ou EN selon la langue
de la commande (`src/server/email/`). Ils passent par l'API HTTP de **Resend** : vérifiez votre domaine d'envoi chez Resend.
**Sans `RESEND_API_KEY` et `EMAIL_FROM`, aucun courriel n'est envoyé.** La commande affiche alors
« Non envoyé : service d'envoi non configuré », et un bouton « Renvoyer » permet de relancer une fois le service configuré.

## 7. Administration

`/admin` est protégé par un mot de passe (`ADMIN_PASSWORD`), avec un cookie de session signé HMAC
(httpOnly, SameSite=strict, Secure en production, 8 h). Les tentatives de connexion sont limitées à 5 par 15 min.
Chaque page, action serveur et export revérifie la session, et `/admin` n'est pas indexé.

## 8. Tests réalisés

- `npm test` (63 tests) : prix, lots et paliers ; validation du panier ; **montants manipulés** (prix ou
  montant injecté, quantités 0, négatives, décimales, en texte, excessives, variante inconnue) ; CSRF ;
  limitation de débit ; double clic ; garde-fou des clés live ; paramètres Stripe ; validation des paramètres
  par **stripe-mock** (test ignoré si stripe-mock n'est pas lancé) ; webhooks : signature absente ou invalide,
  corps modifié, paiement confirmé, **événements répétés et simultanés**, paiements différés réussis ou échoués,
  désordre, expiration, anomalie de montant, courriel envoyé une seule fois ; jeton admin, proxy, CSV.
- `npm run test:e2e` (26 tests, Pixel 7 et Chrome desktop) : rendu, ordre des sections, absence de débordement horizontal,
  absence de note, de prix barré ou de « stock limité » non justifiés, variantes, quantités, panier latéral et barre cadeau, suivi de commande, achat immédiat (un seul appel malgré le double clic),
  redirection Stripe (page Stripe simulée), succès confirmé par webhook signé, faux `session_id`, paiement
  différé puis échec, annulation, langue anglaise, pages légales, animations réduites, barre d'achat mobile
  (masquée sur les blocs d'achat et le pied de page), protection de l'admin, traitement d'une commande et export CSV.
- **Lighthouse** (build de production, page `/fr`) : mobile **Performance 95**, Accessibilité 100, Bonnes pratiques 100 ;
  desktop 100 / 100 / 100. Le SEO affiche 69 pour une **seule** raison : l'indexation est volontairement bloquée tant que
  `product.confirmed` vaut `false`. Tous les autres contrôles SEO passent.
- **Non réalisé ici** : un paiement réel sur la page Stripe hébergée, faute de clés de test dans l'environnement.
  Suivez le §4.6.

## 9. Déploiement

Sur Vercel (ou équivalent Node) : définissez les variables du §2 dans les secrets du projet et utilisez
une base **libSQL distante** (ex. Turso : `DATABASE_URL=libsql://…`, `DATABASE_AUTH_TOKEN=…`), car le disque
d'une fonction serverless n'est pas persistant. Configurez ensuite l'endpoint webhook de production (§4.3).
Sur un serveur classique (VPS), le fichier SQLite suffit : sauvegardez `data/`.

## 10. Avant d'accepter de vraies commandes

Voir la liste dans `/admin` : fiche produit vérifiée, vrais médias et droits, vrais avis (ou aucun), cadeau réel (ou désactivé), prix et coût fournisseur habituel,
délais et tarifs de livraison réels, politique de retour, contact et identité légale, taxes, Resend,
URL HTTPS, achat test complet, puis seulement après tout cela les clés live avec `STORE_ALLOW_LIVE_PAYMENTS=true`.
