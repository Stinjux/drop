# Photos du produit

Les fichiers `*.jpg` de ce dossier sont des **visuels provisoires** marqués « VISUEL PROVISOIRE »
(générés par `scripts/make-placeholders.mjs`). Aucun n'est une photo du produit.

Remplacez-les par vos vraies photos **en gardant les mêmes noms** (`hero.jpg`, `angle-1.jpg`…),
dont vous détenez les droits : photos prises par vous, licence ou autorisation écrite du fournisseur.
Puis, dans `data/product.ts`, passez `provisional: false` (et ajustez `width`/`height`/`alt`).
Évitez les liens directs vers les images du fournisseur.

Photos d'avis (vrais avis uniquement) : `reviews/`.

**Astuce cache.** L'optimiseur d'images de Next.js conserve les versions redimensionnées (jusqu'à
4 h en Next 16). Si vous remplacez une photo **en gardant le même nom**, l'ancienne peut encore
s'afficher : donnez un nouveau nom au fichier (et mettez à jour `data/product.ts`), ou supprimez
`.next/cache/images` puis relancez le serveur.
