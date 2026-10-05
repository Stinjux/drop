# Photos du produit

Les fichiers `*.jpg` de ce dossier sont des **visuels provisoires** marqués « VISUEL PROVISOIRE »
(générés par `scripts/make-placeholders.mjs`). Aucun n'est une photo du produit.

Remplacez-les par vos vraies photos **en gardant les mêmes noms** (`hero.jpg`, `angle-1.jpg`…),
dont vous détenez les droits : photos prises par vous, licence ou autorisation écrite du fournisseur.
Puis, dans `data/product.ts`, passez `provisional: false` (et ajustez `width`/`height`/`alt`).
Évitez les liens directs vers les images du fournisseur.

Photos d'avis (vrais avis uniquement) : `reviews/`.
