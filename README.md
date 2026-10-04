# Boréa : boutique monoproduit (Canada, FR/EN, Stripe Checkout)

Boutique de dropshipping monoproduit construite avec **Next.js 16 (App Router), TypeScript et Tailwind CSS 4**.
Elle inclut une base **libSQL/SQLite**, un paiement **Stripe Checkout** avec webhooks idempotents, un espace
d'administration protégé et un traitement fournisseur manuel. Le français est la langue par défaut, l'anglais est disponible, et la devise est le CAD.

> ⚠️ **Contenu produit provisoire.** La fiche AliExpress `1005005777504095` n'a pas pu être consultée
> automatiquement (protection anti-robot / captcha). Aucun nom, caractéristique, variante, dimension,
> coût ni délai n'a été inventé : tout est marqué « à confirmer » et les visuels sont des gabarits marqués
> « VISUEL PROVISOIRE ». Un bandeau « Aperçu » s'affiche et l'indexation est bloquée tant que
> `product.confirmed` vaut `false`.

Aperçus (générés par les tests e2e) : [`docs/preview/`](docs/preview/).

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
| `src/config/product.ts` | Produit, textes FR/EN, variantes, **paliers de prix**, lots, médias, vidéo, bénéfices, étapes, caractéristiques, contenu du colis, FAQ, avis |
| `src/content/fr.ts`, `en.ts` | Textes de l'interface |
| `src/server/supplier-config.ts` | **Interne** : URL fournisseur, coût, correspondance des variantes (jamais envoyé au navigateur) |
| `src/app/globals.css` (`@theme`) | Couleurs, polices, ombres |
| `public/media/` | Médias (voir `public/media/README.md`) |

**Prix et lots.** Ils sont définis par des paliers de prix unitaire selon la quantité totale
(`product.pricing.tiers`, en cents). Le palier 1 unité est le prix de référence qui justifie le prix
barré et les économies affichées. Le calcul (`src/lib/pricing.ts`) est partagé par le navigateur et le
serveur. Le pourcentage d'économie est arrondi à la baisse.

**Médias.** Déposez vos photos et vidéos (dont vous détenez les droits) dans `public/media/product/`, puis
modifiez `src`, `width`, `height`, `alt`, `provisional: false` et `rights` dans `product.ts`. Le hero est
recadré en 4:3 sur mobile et en carré sur desktop : prévoyez un sujet centré. Les liens directs vers les images du fournisseur
sont à éviter.

**Avis.** La section reste masquée tant que `product.reviews` est vide. N'y mettez que de vrais avis,
publiés avec l'accord de leur auteur.

**Pages légales.** Les pages Contact, Livraison, Retours, Confidentialité et Conditions de vente
(`src/components/info-pages.tsx`) affichent en surbrillance « À compléter » les champs manquants
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

- `npm test` (62 tests) : prix, lots et paliers ; validation du panier ; **montants manipulés** (prix ou
  montant injecté, quantités 0, négatives, décimales, en texte, excessives, variante inconnue) ; CSRF ;
  limitation de débit ; double clic ; garde-fou des clés live ; paramètres Stripe ; validation des paramètres
  par **stripe-mock** (test ignoré si stripe-mock n'est pas lancé) ; webhooks : signature absente ou invalide,
  corps modifié, paiement confirmé, **événements répétés et simultanés**, paiements différés réussis ou échoués,
  désordre, expiration, anomalie de montant, courriel envoyé une seule fois ; jeton admin, proxy, CSV.
- `npm run test:e2e` (26 tests, Pixel 7 et Chrome desktop) : rendu, absence de débordement horizontal,
  variantes, quantités et lots, panier latéral, achat immédiat (un seul appel malgré le double clic),
  redirection Stripe (page Stripe simulée), succès confirmé par webhook signé, faux `session_id`, paiement
  différé puis échec, annulation, langue anglaise, pages légales, animations réduites, barre d'achat mobile
  (masquée sur les blocs d'achat et le pied de page), protection de l'admin, traitement d'une commande et export CSV.
- **Non réalisé ici** : un paiement réel sur la page Stripe hébergée, faute de clés de test dans l'environnement.
  Suivez le §4.6.

## 9. Déploiement

Sur Vercel (ou équivalent Node) : définissez les variables du §2 dans les secrets du projet et utilisez
une base **libSQL distante** (ex. Turso : `DATABASE_URL=libsql://…`, `DATABASE_AUTH_TOKEN=…`), car le disque
d'une fonction serverless n'est pas persistant. Configurez ensuite l'endpoint webhook de production (§4.3).
Sur un serveur classique (VPS), le fichier SQLite suffit : sauvegardez `data/`.

## 10. Avant d'accepter de vraies commandes

Voir la liste dans `/admin` : fiche produit vérifiée, vrais médias et droits, prix et coût fournisseur habituel,
délais et tarifs de livraison réels, politique de retour, contact et identité légale, taxes, Resend,
URL HTTPS, achat test complet, puis seulement après tout cela les clés live avec `STORE_ALLOW_LIVE_PAYMENTS=true`.
