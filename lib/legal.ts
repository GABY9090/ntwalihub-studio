// Informations légales du site : REMPLIS LES CHAMPS "À COMPLÉTER" avant la mise en ligne.
// Elles s'affichent dans les pages Contact / Mentions légales, CGV, Confidentialité, Remboursement.
export const LEGAL = {
  appName: process.env.NEXT_PUBLIC_APP_NAME || "NtwaliHub Studio",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://studio.ntwalihub.com",
  owner: "Ange Gabriel GASIMBA NTWALI",
  status: "Entrepreneur individuel (micro-entreprise)",
  siret: "941 383 333 000015",
  address: "10 rue ernest renan 21300 Chenôve, France",
  email: "contact@ntwalihub.com",
  host: "Cloudflare, Inc., 101 Townsend St, San Francisco, CA 94107, USA",
  updated: "24/11/2026",
  // Micro-entreprise en franchise de TVA : la mention « TVA non applicable, art. 293 B du CGI » figure dans les CGV.
  // Si tu deviens redevable de la TVA, retire-la de lib/legal-content.ts.
};
