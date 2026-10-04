# Médias de la boutique

- `placeholder/` : **visuels provisoires** générés pour la maquette (marqués « VISUEL PROVISOIRE »). Aucun n'est une photo du produit.
- `product/` : déposez ici les **vraies photos et vidéos** (JPG/PNG/WebP/AVIF, MP4/WebM) dont vous détenez les droits :
  photos prises par vous, achetées sous licence, ou autorisation écrite du fournisseur.

Pour remplacer un visuel : copiez le fichier dans `product/`, puis modifiez l'entrée correspondante dans
`src/config/product.ts` (`src`, `width`, `height`, `alt`, `provisional: false`, `rights`).
N'utilisez pas de liens directs vers les images du fournisseur (fragiles et souvent non autorisés).
