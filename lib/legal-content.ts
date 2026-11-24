// Textes des pages légales (FR / EN). Modèles de départ : fais-les relire si possible.
import { LEGAL as L } from "./legal";
import type { Lang } from "./i18n";

export type Section = { h: string; p: string[] };
export type LegalPage = { title: string; sections: Section[] };
export const LEGAL_SLUGS = ["contact", "cgv", "confidentialite", "remboursement"] as const;
export type LegalSlug = (typeof LEGAL_SLUGS)[number];

const fr: Record<LegalSlug, LegalPage> = {
  contact: {
    title: "Contact et mentions légales",
    sections: [
      { h: "Nous contacter", p: [
        `Pour toute question, demande de remboursement ou réclamation : ${L.email}. Nous répondons sous 72 heures ouvrées.`,
      ] },
      { h: "Éditeur du site", p: [
        `${L.appName} est édité par ${L.owner}, ${L.status}.`,
        `SIRET : ${L.siret}. Adresse : ${L.address}.`,
        `E-mail : ${L.email}. Directeur de la publication : ${L.owner}.`,
      ] },
      { h: "Hébergement", p: [`Le site est hébergé par ${L.host}.`] },
      { h: "Propriété intellectuelle", p: [
        `Le site, son nom, son logo et ses textes appartiennent à l'éditeur. Les vidéos générées par les utilisateurs sont régies par les Conditions générales de vente.`,
      ] },
    ],
  },
  cgv: {
    title: "Conditions générales d'utilisation et de vente",
    sections: [
      { h: "1. Objet", p: [
        `${L.appName} (${L.siteUrl}) permet de générer des vidéos à l'aide de l'intelligence artificielle à partir d'une description écrite. Les présentes conditions s'appliquent à toute utilisation du service et à tout achat de crédits.`,
      ] },
      { h: "2. Compte", p: [
        `L'accès au service nécessite un compte créé avec une adresse e-mail valide. L'utilisateur est responsable de l'utilisation de son compte. Le service est réservé aux personnes de 16 ans et plus.`,
      ] },
      { h: "3. Crédits et prix", p: [
        `Le service fonctionne avec des crédits : 1 crédit permet de générer 5 secondes de vidéo. Des crédits gratuits peuvent être offerts à l'inscription. Les packs de crédits et leurs prix TTC sont affichés sur la page « Acheter des crédits ». TVA non applicable, article 293 B du CGI.`,
        `Une vidéo longue est générée par tranches de 5 secondes ; si le solde de crédits est épuisé, la génération s'arrête et peut être reprise après un nouvel achat.`,
      ] },
      { h: "4. Paiement", p: [
        `Le paiement s'effectue par carte bancaire via Stripe, sur une page sécurisée. ${L.appName} n'a jamais accès aux numéros de carte. Les crédits sont ajoutés au compte dès la confirmation du paiement.`,
      ] },
      { h: "5. Droit de rétractation", p: [
        `Les crédits sont un contenu numérique fourni immédiatement. Conformément à l'article L221-28 13° du Code de la consommation, en cochant la case prévue avant le paiement, l'utilisateur demande l'exécution immédiate et reconnaît perdre son droit de rétractation dès que les crédits sont crédités. Voir aussi la Politique de remboursement.`,
      ] },
      { h: "6. Contenus interdits", p: [
        `Il est interdit de demander des contenus : sexuels ou impliquant des mineurs, violents ou haineux, représentant de vraies personnes sans leur accord (deepfakes), trompeurs, illégaux, ou portant atteinte aux droits d'autrui. Les demandes peuvent être filtrées automatiquement. En cas d'abus, le compte peut être suspendu sans remboursement des crédits utilisés.`,
      ] },
      { h: "7. Vidéos générées", p: [
        `Sous réserve du respect des présentes conditions et des conditions des fournisseurs de modèles d'IA, l'utilisateur peut utiliser les vidéos qu'il a générées, y compris à des fins commerciales. Il reste seul responsable de ses descriptions et de l'usage des vidéos. Les résultats de l'IA peuvent être imparfaits ou ne pas correspondre exactement à la demande.`,
      ] },
      { h: "8. Disponibilité et responsabilité", p: [
        `Le service est fourni « en l'état ». Nous faisons de notre mieux pour qu'il soit disponible, sans pouvoir le garantir en permanence. Conserve une copie de tes vidéos : elles peuvent être supprimées après une longue période d'inactivité du compte.`,
      ] },
      { h: "9. Modification et droit applicable", p: [
        `Ces conditions peuvent évoluer ; la version en vigueur est celle publiée sur le site. Elles sont soumises au droit français. En cas de litige, une solution amiable sera recherchée avant toute action ; le consommateur peut recourir gratuitement à un médiateur de la consommation.`,
        `Dernière mise à jour : ${L.updated}.`,
      ] },
    ],
  },
  confidentialite: {
    title: "Politique de confidentialité",
    sections: [
      { h: "Responsable du traitement", p: [`${L.owner} (${L.appName}), contact : ${L.email}.`] },
      { h: "Données collectées", p: [
        `Adresse e-mail (création du compte et connexion) ; descriptions écrites et vidéos générées ; historique des crédits et des achats (montant, date, pack) ; préférence de langue. Nous ne recevons jamais tes données de carte bancaire : elles sont traitées par Stripe.`,
      ] },
      { h: "Pourquoi", p: [
        `Fournir le service (exécution du contrat), gérer les paiements et la comptabilité (obligation légale), prévenir les abus et assurer la sécurité (intérêt légitime). Pas de publicité ciblée, pas de revente de données.`,
      ] },
      { h: "Sous-traitants", p: [
        `Supabase (base de données, comptes, stockage des vidéos), fal.ai (génération des vidéos par IA, États-Unis), Stripe (paiements), Brevo (e-mails de connexion), Cloudflare (hébergement). Certains peuvent traiter des données hors de l'Union européenne, avec des garanties appropriées (clauses contractuelles types).`,
      ] },
      { h: "Durée de conservation", p: [
        `Compte et vidéos : tant que le compte est actif, puis suppression après 2 ans d'inactivité. Données de facturation : 10 ans (obligation comptable).`,
      ] },
      { h: "Cookies", p: [
        `Uniquement des cookies nécessaires : session de connexion et choix de la langue. Aucun cookie publicitaire ou de mesure d'audience.`,
      ] },
      { h: "Tes droits", p: [
        `Tu peux demander l'accès, la rectification, la suppression ou la portabilité de tes données, ou t'opposer à un traitement, en écrivant à ${L.email}. Tu peux aussi saisir la CNIL (www.cnil.fr).`,
        `Dernière mise à jour : ${L.updated}.`,
      ] },
    ],
  },
  remboursement: {
    title: "Politique de remboursement",
    sections: [
      { h: "Génération ratée : crédit rendu automatiquement", p: [
        `Si une vidéo (ou un clip de 5 s) ne peut pas être générée à cause d'une erreur technique, le crédit correspondant est automatiquement rendu sur ton compte.`,
      ] },
      { h: "Crédits non utilisés", p: [
        `Tu peux demander le remboursement d'un pack dont aucun crédit n'a été utilisé, dans les 14 jours suivant l'achat, en écrivant à ${L.email} avec l'e-mail de ton compte. Le remboursement est fait sur la carte utilisée, sous 10 jours.`,
      ] },
      { h: "Crédits utilisés", p: [
        `Les crédits déjà utilisés pour générer des vidéos ne sont pas remboursables, le service ayant été entièrement exécuté. Le résultat d'une IA pouvant varier, nous étudions toutefois de bonne foi toute réclamation (par exemple un résultat manifestement inutilisable) et pouvons offrir des crédits.`,
      ] },
      { h: "Paiement contesté", p: [
        `En cas de problème, contacte-nous avant toute contestation bancaire : nous trouverons une solution rapidement.`,
        `Dernière mise à jour : ${L.updated}.`,
      ] },
    ],
  },
};

const en: Record<LegalSlug, LegalPage> = {
  contact: {
    title: "Contact & legal notice",
    sections: [
      { h: "Contact us", p: [`For any question, refund request or complaint: ${L.email}. We reply within 3 business days.`] },
      { h: "Publisher", p: [
        `${L.appName} is published by ${L.owner}, sole trader (France). SIRET: ${L.siret}. Address: ${L.address}. Email: ${L.email}.`,
      ] },
      { h: "Hosting", p: [`The site is hosted by ${L.host}.`] },
      { h: "Intellectual property", p: [`The site, its name, logo and texts belong to the publisher. Videos generated by users are governed by the Terms.`] },
    ],
  },
  cgv: {
    title: "Terms of use and sale",
    sections: [
      { h: "1. Service", p: [`${L.appName} (${L.siteUrl}) lets you generate AI videos from a written description. These terms apply to any use of the service and any purchase of credits.`] },
      { h: "2. Account", p: [`An account with a valid email address is required. You are responsible for your account. The service is for people aged 16 and over.`] },
      { h: "3. Credits and prices", p: [
        `1 credit = 5 seconds of video. Free credits may be offered at sign-up. Credit packs and prices (taxes included) are shown on the "Buy credits" page.`,
        `Long videos are generated in 5-second steps; if your credits run out, generation stops and can be resumed after a new purchase.`,
      ] },
      { h: "4. Payment", p: [`Payment is made by card through Stripe on a secure page. We never see card numbers. Credits are added once payment is confirmed.`] },
      { h: "5. Right of withdrawal", p: [`Credits are digital content supplied immediately. By ticking the box before payment, you request immediate performance and acknowledge that you lose your right of withdrawal once the credits are added (EU consumer law). See also our Refund policy.`] },
      { h: "6. Prohibited content", p: [`You may not request sexual content or content involving minors, violent or hateful content, real people without consent (deepfakes), misleading, illegal or infringing content. Requests may be filtered automatically. Abuse may lead to account suspension without refund of used credits.`] },
      { h: "7. Generated videos", p: [`Subject to these terms and the AI model providers' terms, you may use the videos you generate, including commercially. You are solely responsible for your prompts and how you use the videos. AI output may be imperfect.`] },
      { h: "8. Availability and liability", p: [`The service is provided "as is". We do our best to keep it available but cannot guarantee it at all times. Keep a copy of your videos.`] },
      { h: "9. Changes and governing law", p: [`These terms may change; the version published on the site applies. French law applies. We will always seek an amicable solution first.`, `Last updated: ${L.updated}.`] },
    ],
  },
  confidentialite: {
    title: "Privacy policy",
    sections: [
      { h: "Controller", p: [`${L.owner} (${L.appName}), contact: ${L.email}.`] },
      { h: "Data we collect", p: [`Email address (account and sign-in); prompts and generated videos; credit and purchase history; language preference. We never receive your card details: Stripe processes them.`] },
      { h: "Why", p: [`To provide the service (contract), handle payments and accounting (legal obligation), prevent abuse and keep the service secure (legitimate interest). No targeted advertising, no data selling.`] },
      { h: "Processors", p: [`Supabase (database, accounts, video storage), fal.ai (AI video generation, USA), Stripe (payments), Brevo (sign-in emails), Cloudflare (hosting). Some may process data outside the EU with appropriate safeguards (standard contractual clauses).`] },
      { h: "Retention", p: [`Account and videos: while the account is active, deleted after 2 years of inactivity. Billing data: 10 years (accounting law).`] },
      { h: "Cookies", p: [`Only necessary cookies: sign-in session and language choice. No advertising or analytics cookies.`] },
      { h: "Your rights", p: [`You can request access, correction, deletion or portability of your data, or object to processing, by writing to ${L.email}. You may also complain to your data protection authority (in France: CNIL).`, `Last updated: ${L.updated}.`] },
    ],
  },
  remboursement: {
    title: "Refund policy",
    sections: [
      { h: "Failed generation: credit refunded automatically", p: [`If a video (or 5-second clip) fails because of a technical error, the credit is automatically returned to your account.`] },
      { h: "Unused credits", p: [`You can request a refund for a pack with no credits used within 14 days of purchase by writing to ${L.email} from your account email. Refunds go back to the card used within 10 days.`] },
      { h: "Used credits", p: [`Credits already used to generate videos are not refundable, as the service has been fully performed. Because AI output can vary, we review any complaint in good faith (e.g. a clearly unusable result) and may offer credits.`] },
      { h: "Disputed payments", p: [`If something goes wrong, please contact us before disputing a payment with your bank: we will fix it quickly.`, `Last updated: ${L.updated}.`] },
    ],
  },
};

export function legalPage(lang: Lang, slug: LegalSlug) {
  return (lang === "fr" ? fr : en)[slug];
}
