// Packs de crédits à vendre. 1 crédit = 1 vidéo de 5 secondes.
// Coût fal.ai (H3 Max) ≈ 0,25 $ par vidéo de 5 s → prix de vente ≈ 2,5 à 3 fois le coût.
// Change les prix ici quand tu veux (montants entiers : centimes d'euro, francs rwandais).
export type Pack = {
  id: string;
  credits: number;
  eurCents: number; // prix carte (Stripe), en centimes d'euro
  rwf: number;      // prix Mobile Money (Flutterwave), en francs rwandais
  best?: boolean;
};

export const PACKS: Pack[] = [
  { id: "mini",     credits: 5,  eurCents: 400,  rwf: 6500 },
  { id: "standard", credits: 15, eurCents: 1000, rwf: 16500, best: true },
  { id: "pro",      credits: 40, eurCents: 2500, rwf: 41000 },
];

export function findPack(id: string) {
  return PACKS.find((p) => p.id === id);
}
