import type { ReactNode } from "react";
import { store } from "@/config/store";
import type { Locale } from "@/config/types";
import { fmt, getDictionary, infoHref, type InfoPageId } from "@/content";
import { defaultShipping, deliveryEstimate } from "@/lib/catalog";
import { formatMoney } from "@/lib/money";
import { TrackingForm } from "./store/tracking-form";
import { prizeLabel, prizeOdds, scratchGame } from "@/config/promo";

/**
 * Pages d'information. Les champs vides de src/config/store.ts s'affichent en
 * « À compléter » : ces pages sont des MODÈLES à faire valider (idéalement par un
 * juriste) avant publication.
 */
function Todo({ locale, children }: { locale: Locale; children: ReactNode }) {
  return (
    <mark className="border-2 border-ink bg-accent px-1.5 py-0.5 font-mono text-sm font-bold text-ink" data-todo>
      [{getDictionary(locale).pages.toComplete} : {children}]
    </mark>
  );
}

function Val({ locale, value, label }: { locale: Locale; value: string; label: string }) {
  return value ? <>{value}</> : <Todo locale={locale}>{label}</Todo>;
}

const H2 = ({ children }: { children: ReactNode }) => <h2 className="mt-10 border-t-[3px] border-ink pt-4 font-display text-xl font-bold uppercase">{children}</h2>;
const P = ({ children }: { children: ReactNode }) => <p className="mt-3 leading-relaxed text-ink-soft">{children}</p>;
const UL = ({ children }: { children: ReactNode }) => <ul className="mt-3 list-disc space-y-1.5 pl-5 leading-relaxed text-ink-soft">{children}</ul>;

export const INFO_TITLES: Record<InfoPageId, Record<Locale, string>> = {
  contact: { fr: "Nous joindre", en: "Contact us" },
  shipping: { fr: "Livraison", en: "Shipping" },
  returns: { fr: "Retours et remboursements", en: "Returns and refunds" },
  privacy: { fr: "Politique de confidentialité", en: "Privacy policy" },
  terms: { fr: "Conditions générales de vente", en: "Terms of sale" },
  tracking: { fr: "Suivi de commande", en: "Order tracking" },
  game: { fr: "Règlement du jeu « Gratte & gagne »", en: "“Scratch & win” game rules" },
};

function Contact({ locale: l }: { locale: Locale }) {
  const c = store.contact;
  const fr = l === "fr";
  return (
    <>
      <P>{fr ? <>Pour suivre un colis, utilisez la page <a className="font-bold underline decoration-accent decoration-2" href={infoHref(l, "tracking")}>Suivi de commande</a>. </> : <>To track a parcel, use the <a className="font-bold underline decoration-accent decoration-2" href={infoHref(l, "tracking")}>Order tracking</a> page. </>}</P>
      <P>{fr ? "Une question sur un produit ou une commande ? Écrivez-nous en indiquant votre numéro de commande si vous en avez un." : "A question about a product or an order? Write to us and include your order number if you have one."}</P>
      <dl className="mt-6 grid gap-4 border-[3px] border-ink bg-white p-6 shadow-[var(--shadow-hard)] sm:grid-cols-2">
        <div>
          <dt className="text-sm font-semibold">{fr ? "Courriel" : "Email"}</dt>
          <dd className="mt-1">{c.email ? <a className="font-bold underline decoration-accent decoration-2 underline-offset-4" href={`mailto:${c.email}`}>{c.email}</a> : <Todo locale={l}>store.contact.email</Todo>}</dd>
        </div>
        <div>
          <dt className="text-sm font-semibold">{fr ? "Délai de réponse" : "Response time"}</dt>
          <dd className="mt-1 text-ink-soft">{c.responseTime[l]}</dd>
        </div>
        {c.phone && (
          <div>
            <dt className="text-sm font-semibold">{fr ? "Téléphone" : "Phone"}</dt>
            <dd className="mt-1 text-ink-soft">{c.phone}</dd>
          </div>
        )}
        <div>
          <dt className="text-sm font-semibold">{fr ? "Entreprise" : "Business"}</dt>
          <dd className="mt-1 text-ink-soft">
            <Val locale={l} value={store.legal.businessName} label={fr ? "raison sociale" : "legal business name"} />
            <br />
            <Val locale={l} value={store.legal.businessAddress} label={fr ? "adresse" : "address"} />
          </dd>
        </div>
      </dl>
    </>
  );
}

function Shipping({ locale: l }: { locale: Locale }) {
  const s = defaultShipping;
  const est = deliveryEstimate();
  const fr = l === "fr";
  return (
    <>
      {!store.shipping.confirmed && <P><Todo locale={l}>{fr ? "vérifier tarifs, délais et lieu d'expédition réels du fournisseur vers le Canada" : "verify the supplier's real rates, delivery times and ship-from location to Canada"}</Todo></P>}
      <H2>{fr ? "Destinations" : "Destinations"}</H2>
      <P>{fr ? "Nous livrons partout au Canada (provinces et territoires)." : "We ship anywhere in Canada (provinces and territories)."}</P>
      <H2>{fr ? "Tarifs" : "Rates"}</H2>
      <UL>
        <li>
          {s.label[l]} : {formatMoney(s.amountCents, l)}
          {s.freeFromSubtotalCents !== null && (fr ? `, gratuite dès ${formatMoney(s.freeFromSubtotalCents, l)} d'achat` : `, free on orders of ${formatMoney(s.freeFromSubtotalCents, l)} or more`)}.
        </li>
        <li>{fr ? "Le montant exact est affiché dans le panier et sur la page de paiement, avant de payer." : "The exact amount is shown in the cart and on the checkout page before you pay."}</li>
      </UL>
      <H2>{fr ? "Délais" : "Delivery times"}</H2>
      <UL>
        <li>{fr ? `Préparation : ${s.processingDays.min} à ${s.processingDays.max} jours ouvrables.` : `Processing: ${s.processingDays.min}–${s.processingDays.max} business days.`}</li>
        <li>{fr ? `Transport : ${s.transitDays.min} à ${s.transitDays.max} jours ouvrables.` : `Transit: ${s.transitDays.min}–${s.transitDays.max} business days.`}</li>
        <li><strong>{fr ? `Total estimé : ${est.min} à ${est.max} jours ouvrables.` : `Estimated total: ${est.min}–${est.max} business days.`}</strong></li>
      </UL>
      <P>{fr ? "Les délais sont des estimations ; ils peuvent être prolongés en période de pointe ou pour les régions éloignées. Vous recevez un numéro de suivi par courriel dès l'expédition." : "Times are estimates and may be longer during peak periods or for remote areas. Tracking is emailed as soon as your order ships."}</P>
      <H2>{fr ? "Lieu d'expédition, droits et taxes" : "Ship-from location, duties and taxes"}</H2>
      <P><Todo locale={l}>{fr ? "préciser le pays d'expédition et qui assume d'éventuels droits ou frais d'importation (recommandé : la boutique, sans frais pour le client)" : "state the ship-from country and who pays any import duties or fees (recommended: the store, at no cost to the customer)"}</Todo></P>
      <H2>{fr ? "Colis perdu ou endommagé" : "Lost or damaged parcels"}</H2>
      <P>{fr ? "Contactez-nous avec votre numéro de commande et, si possible, une photo. " : "Contact us with your order number and, if possible, a photo. "}<Todo locale={l}>{fr ? "décrire la solution offerte (renvoi ou remboursement) et le délai pour signaler" : "describe the remedy (reship or refund) and the reporting window"}</Todo></P>
    </>
  );
}

function Returns({ locale: l }: { locale: Locale }) {
  const r = store.returns;
  const fr = l === "fr";
  const contactHref = infoHref(l, "contact");
  return (
    <>
      {!r.confirmed && <P><Todo locale={l}>{fr ? "valider cette politique de retour" : "validate this return policy"}</Todo></P>}
      <H2>{fr ? "Délai" : "Return window"}</H2>
      <P>{fr ? `Vous pouvez demander un retour dans les ${r.windowDays} jours suivant la réception de votre commande.` : `You can request a return within ${r.windowDays} days of receiving your order.`}</P>
      <H2>{fr ? "Comment faire" : "How to return"}</H2>
      <UL>
        <li>{fr ? <>Écrivez-nous via la page <a className="font-bold underline decoration-accent decoration-2" href={contactHref}>Contact</a> avec votre numéro de commande et le motif.</> : <>Write to us via the <a className="font-bold underline decoration-accent decoration-2" href={contactHref}>Contact</a> page with your order number and the reason.</>}</li>
        <li>{fr ? "Nous vous indiquons l'adresse de retour et la marche à suivre. N'envoyez aucun colis sans notre confirmation." : "We'll send you the return address and instructions. Please don't ship anything before we confirm."}</li>
        <li>{fr ? "Le produit doit être retourné complet, avec ses accessoires." : "The product must be returned complete, with its accessories."}</li>
      </UL>
      <H2>{fr ? "Frais et remboursement" : "Costs and refund"}</H2>
      <UL>
        <li>
          {r.returnShippingPaidBy === "store"
            ? fr ? "Les frais de retour sont à notre charge." : "We cover return shipping."
            : fr ? "Les frais de retour d'un article non défectueux sont à votre charge." : "Return shipping for non-defective items is at your expense."}
        </li>
        <li>{fr ? "Article défectueux ou erreur de notre part : les frais sont à notre charge." : "Defective item or our mistake: we cover the costs."}</li>
        <li>{fr ? `Remboursement sur le moyen de paiement d'origine sous ${r.refundDelayBusinessDays} jours ouvrables après réception du retour.` : `Refund to the original payment method within ${r.refundDelayBusinessDays} business days of receiving the return.`}</li>
      </UL>
      <P>{fr ? "Ces conditions s'ajoutent aux garanties prévues par la loi, notamment la Loi sur la protection du consommateur du Québec, et ne les limitent pas." : "These terms are in addition to, and do not limit, your statutory warranties, including under Québec's Consumer Protection Act."}</P>
      <H2>{fr ? "Exceptions" : "Exceptions"}</H2>
      <P><Todo locale={l}>{fr ? "lister les éventuelles exceptions (hygiène, article utilisé…) — ou supprimer cette section" : "list any exceptions (hygiene, used items…) — or remove this section"}</Todo></P>
    </>
  );
}

function Privacy({ locale: l }: { locale: Locale }) {
  const fr = l === "fr";
  const lg = store.legal;
  return (
    <>
      {lg.lastUpdated && <P>{fmt(getDictionary(l).pages.lastUpdated, { date: lg.lastUpdated })}</P>}
      <H2>{fr ? "Qui sommes-nous" : "Who we are"}</H2>
      <P>
        <Val locale={l} value={lg.businessName} label={fr ? "raison sociale" : "legal business name"} /> — <Val locale={l} value={lg.businessAddress} label={fr ? "adresse" : "address"} />
      </P>
      <H2>{fr ? "Renseignements recueillis" : "Information we collect"}</H2>
      <UL>
        <li>{fr ? "Nom, courriel, téléphone et adresse de livraison, saisis sur la page de paiement Stripe." : "Name, email, phone and shipping address, entered on Stripe's checkout page."}</li>
        <li>{fr ? "Détails de la commande (produits, montants, numéro de suivi)." : "Order details (products, amounts, tracking number)."}</li>
        <li>{fr ? "Vos données de carte sont traitées par Stripe ; nous n'y avons pas accès et ne les conservons pas." : "Card details are processed by Stripe; we never access or store them."}</li>
      </UL>
      <H2>{fr ? "Utilisation" : "How we use it"}</H2>
      <P>{fr ? "Uniquement pour traiter, expédier et suivre votre commande, répondre à vos demandes et respecter nos obligations légales. Aucune vente de renseignements personnels." : "Only to process, ship and track your order, answer your requests and meet our legal obligations. We never sell personal information."}</P>
      <H2>{fr ? "Communication à des tiers" : "Sharing"}</H2>
      <UL>
        <li>{fr ? "Stripe (paiement)." : "Stripe (payments)."}</li>
        <li>{fr ? "Notre fournisseur et ses transporteurs (nom, adresse et téléphone de livraison uniquement), qui peuvent être situés hors du Québec et du Canada." : "Our supplier and its carriers (shipping name, address and phone only), who may be located outside Québec and Canada."}</li>
        <li>{fr ? "Notre service d'envoi de courriels transactionnels." : "Our transactional email provider."}</li>
        <li><Todo locale={l}>{fr ? "hébergeur du site et de la base de données, et lieu d'hébergement" : "website and database host, and hosting location"}</Todo></li>
      </UL>
      <H2>{fr ? "Témoins et stockage local" : "Cookies and local storage"}</H2>
      <P>{fr ? "Le site n'utilise pas de témoins publicitaires ni d'outil d'analyse. Votre panier est conservé dans votre navigateur et un témoin mémorise votre langue. Stripe utilise ses propres témoins sur sa page de paiement." : "We use no advertising cookies or analytics. Your cart is kept in your browser and a cookie remembers your language. Stripe uses its own cookies on its checkout page."}</P>
      <H2>{fr ? "Conservation" : "Retention"}</H2>
      <P><Todo locale={l}>{fr ? "durée de conservation des commandes (ex. obligations fiscales)" : "order retention period (e.g. tax obligations)"}</Todo></P>
      <H2>{fr ? "Vos droits et responsable" : "Your rights and privacy officer"}</H2>
      <P>{fr ? "Vous pouvez demander l'accès à vos renseignements, leur rectification ou leur suppression en écrivant au responsable de la protection des renseignements personnels : " : "You may request access to, correction or deletion of your information by writing to our privacy officer: "}
        <Val locale={l} value={lg.privacyOfficer.name} label={fr ? "nom du responsable" : "officer's name"} />, <Val locale={l} value={lg.privacyOfficer.email} label={fr ? "courriel du responsable" : "officer's email"} />.
      </P>
    </>
  );
}

function Terms({ locale: l }: { locale: Locale }) {
  const fr = l === "fr";
  const lg = store.legal;
  const est = deliveryEstimate();
  return (
    <>
      <P><Todo locale={l}>{fr ? "modèle à faire valider par un juriste avant publication" : "template to be reviewed by a lawyer before launch"}</Todo></P>
      <H2>{fr ? "Commerçant" : "Merchant"}</H2>
      <P>
        <Val locale={l} value={lg.businessName} label={fr ? "raison sociale" : "legal business name"} />, <Val locale={l} value={lg.businessAddress} label={fr ? "adresse" : "address"} />
        {lg.neq && <> — NEQ {lg.neq}</>}. {fr ? "Courriel" : "Email"} : <Val locale={l} value={store.contact.email} label="store.contact.email" />.
      </P>
      <H2>{fr ? "Prix et taxes" : "Prices and taxes"}</H2>
      <P>{fr ? "Les prix sont indiqués en dollars canadiens. Les frais de livraison et, le cas échéant, les taxes applicables sont affichés avant le paiement. Le prix unitaire dégressif selon la quantité est calculé automatiquement." : "Prices are in Canadian dollars. Shipping and any applicable taxes are shown before payment. Quantity-based unit pricing is applied automatically."}</P>
      {(lg.gstHstNumber || lg.qstNumber) && <P>TPS/TVH : {lg.gstHstNumber || "—"} · TVQ : {lg.qstNumber || "—"}</P>}
      <H2>{fr ? "Commande et paiement" : "Ordering and payment"}</H2>
      <P>{fr ? "La commande est confirmée après validation du paiement par Stripe ; un courriel récapitulatif vous est alors envoyé. Aucun compte n'est requis." : "Your order is confirmed once Stripe validates the payment; a summary email is then sent. No account is required."}</P>
      <H2>{fr ? "Livraison" : "Delivery"}</H2>
      <P>{fr ? `Livraison au Canada, délai estimé de ${est.min} à ${est.max} jours ouvrables. Voir la page Livraison.` : `Shipping within Canada, estimated ${est.min}–${est.max} business days. See the Shipping page.`}</P>
      <H2>{fr ? "Retours et garanties" : "Returns and warranties"}</H2>
      <P>{fr ? "Voir la politique de retour. Les garanties légales prévues par la Loi sur la protection du consommateur s'appliquent." : "See the return policy. Statutory warranties under the Consumer Protection Act apply."}</P>
      <H2>{fr ? "Droit applicable" : "Governing law"}</H2>
      <P>{fr ? "Lois du Québec et lois fédérales du Canada applicables." : "Laws of Québec and applicable federal laws of Canada."}</P>
    </>
  );
}

function GameRules({ locale: l }: { locale: Locale }) {
  const fr = l === "fr";
  const g = scratchGame;
  const prizes = [...g.prizes].sort((a, b) => b.weight - a.weight);
  return (
    <>
      <P><Todo locale={l}>{fr ? "faire valider ce règlement et vérifier l'obligation de déclaration à la Régie des alcools, des courses et des jeux (Québec)" : "have these rules reviewed and check the Québec RACJ declaration requirement"}</Todo></P>
      <H2>{fr ? "Organisateur" : "Organizer"}</H2>
      <P>
        <Val locale={l} value={store.legal.businessName} label={fr ? "raison sociale" : "legal business name"} /> — <Val locale={l} value={store.legal.businessAddress} label={fr ? "adresse" : "address"} />
      </P>
      <H2>{fr ? "Période et admissibilité" : "Period and eligibility"}</H2>
      <P>
        <Todo locale={l}>{fr ? "dates de début et de fin du jeu" : "game start and end dates"}</Todo>{" "}
        {fr ? "Ouvert aux résidents du Canada ayant atteint l'âge de la majorité dans leur province." : "Open to residents of Canada who have reached the age of majority in their province."}
      </P>
      <H2>{fr ? "Comment jouer" : "How to play"}</H2>
      <UL>
        <li>{fr ? "Aucun achat requis pour jouer. Grattez la carte sur le site (ou utilisez « Révéler sans gratter »)." : "No purchase necessary to play. Scratch the card on the site (or use “Reveal without scratching”)."}</li>
        <li>{fr ? "Un ticket par personne et par navigateur ; le résultat est tiré au hasard par notre serveur au moment où le ticket est attribué." : "One ticket per person and browser; the result is drawn at random by our server when the ticket is issued."}</li>
      </UL>
      <H2>{fr ? "Lots et chances de gagner" : "Prizes and odds"}</H2>
      <P>{fr ? "Chaque ticket est gagnant. Chances par ticket :" : "Every ticket wins. Odds per ticket:"}</P>
      <UL>
        {prizes.map((p) => (
          <li key={p.id}>
            <strong>{prizeLabel(p, l)}</strong> : {prizeOdds(p, l)}
          </li>
        ))}
      </UL>
      <H2>{fr ? "Utilisation du code" : "Using the code"}</H2>
      <UL>
        <li>{fr ? `Valable ${g.validityDays} jours après l'attribution, pour une seule commande payée.` : `Valid for ${g.validityDays} days after it is issued, for a single paid order.`}</li>
        <li>{fr ? "Les rabais en pourcentage s'appliquent au sous-total, après le rabais de quantité (cumulables)." : "Percentage discounts apply to the subtotal, after the quantity discount (they stack)."}</li>
        <li>{fr ? "« 1 acheté = 1 offert » : avec au moins 2 doudounes au panier, une unité est offerte (au prix unitaire du palier), une fois par commande." : "“Buy 1, get 1 free”: with at least 2 jackets in the cart, one unit is free (at the tier unit price), once per order."}</li>
        <li>{fr ? "Non monnayable, non transférable, non remboursable en argent." : "No cash value, non-transferable, not redeemable for cash."}</li>
      </UL>
      <H2>{fr ? "Renseignements personnels" : "Personal information"}</H2>
      <P>{fr ? "Pour limiter les abus, nous conservons le code, le lot, la date et une empreinte non réversible de l'adresse IP. Voir la politique de confidentialité." : "To limit abuse, we store the code, prize, date and a non-reversible fingerprint of the IP address. See the privacy policy."}</P>
    </>
  );
}

export function InfoPageContent({ id, locale }: { id: InfoPageId; locale: Locale }) {
  switch (id) {
    case "contact":
      return <Contact locale={locale} />;
    case "shipping":
      return <Shipping locale={locale} />;
    case "returns":
      return <Returns locale={locale} />;
    case "privacy":
      return <Privacy locale={locale} />;
    case "terms":
      return <Terms locale={locale} />;
    case "tracking":
      return <TrackingForm />;
    case "game":
      return <GameRules locale={locale} />;
  }
}
