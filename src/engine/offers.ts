import type { Offer } from "./schemas.ts";

export const OFFER_LIBRARY: Record<Offer["type"], Offer> = {
  financing: {
    id: "zero-percent-financing",
    name: "0% financing",
    description: "Interest-free financing for price-sensitive leads.",
    type: "financing",
    conversionLift: 0.25,
    revenueMultiplier: 1,
    marginCost: 0.035,
    eligibleObjections: ["cost"],
    assumptions: [
      "Eligible leads receive and understand the financing offer.",
      "The synthetic lift prior starts at 25%; the final lift is evidence-weighted.",
      "Financing costs 3.5% of recognized revenue.",
      "Average deal value remains unchanged.",
    ],
  },
  discount: {
    id: "ten-percent-discount",
    name: "10% price reduction",
    description: "Reduce contract value by 10% for price-sensitive leads.",
    type: "discount",
    conversionLift: 0.34,
    revenueMultiplier: 0.9,
    marginCost: 0,
    eligibleObjections: ["cost"],
    assumptions: [
      "The discount is limited to the selected population.",
      "The synthetic lift prior starts at 34%; the final lift is evidence-weighted.",
      "Contract value declines by exactly 10%.",
    ],
  },
  trial: {
    id: "thirty-day-trial",
    name: "30-day pilot",
    description: "A time-boxed pilot before the annual agreement begins.",
    type: "trial",
    conversionLift: 0.18,
    revenueMultiplier: 0.96,
    marginCost: 0.02,
    eligibleObjections: ["trust", "need"],
    assumptions: [
      "Pilot participants are qualified at the same rate as historical leads.",
      "The synthetic lift prior starts at 18%; the final lift is evidence-weighted.",
      "Four percent of first-year contract value is deferred.",
      "Pilot delivery costs 2% of recognized revenue.",
    ],
  },
  bundle: {
    id: "implementation-bundle",
    name: "Implementation bundle",
    description: "Include onboarding services in the annual contract.",
    type: "bundle",
    conversionLift: 0.14,
    revenueMultiplier: 1.06,
    marginCost: 0.045,
    eligibleObjections: ["timing", "trust"],
    assumptions: [
      "Implementation support increases contract value by 6%.",
      "Delivery costs reduce gross margin by 4.5 points.",
      "The synthetic lift prior starts at 14%; the final lift is evidence-weighted.",
    ],
  },
};

export function offerFromScenario(scenario: string): Offer {
  const value = scenario.toLowerCase();
  if (/discount|% off|price reduction|reduce price/.test(value)) return OFFER_LIBRARY.discount;
  if (/trial|pilot|proof of concept|poc/.test(value)) return OFFER_LIBRARY.trial;
  if (/bundle|implementation|onboarding/.test(value)) return OFFER_LIBRARY.bundle;
  return OFFER_LIBRARY.financing;
}
