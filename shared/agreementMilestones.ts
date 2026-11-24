/**
 * The 2026 agreement's payment schedule: the four payments Exhibit A.5 prints
 * for a phase that has no stored milestones of its own. The wizard's Phase
 * Payment Schedule card seeds its default rows from this same list, so the card
 * opens showing exactly what the contract would print today.
 */
export const AGREEMENT_MILESTONES = [
  { name: "1st Payment", trigger: "Agreement Deposit", percentage: 10, due: "Upon execution of Exhibit A" },
  { name: "2nd Payment", trigger: "Production Approved - Manufacturing starts", percentage: 40, due: "Upon Green Light Production Notice" },
  { name: "3rd Payment", trigger: "Manufacturing - Final Module Started", percentage: 40, due: "Upon start of final module" },
  { name: "4th Payment", trigger: "Modules Complete - Before pickup or transport", percentage: 10, due: "Dvele Quality certification complete" },
];
