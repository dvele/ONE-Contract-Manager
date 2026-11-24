/**
 * The seller entity on the 2026 Master Factory Built Home Agreement. Every
 * project selects it for now (Decision 3 of the 2026 agreement plan): the
 * wizard defaults Step 5 to it, the test drafts use it, and the installer
 * creates it. Looked up by name because its id differs per environment.
 */
export const DEFAULT_SELLER_LLC_NAME = "Dvele AZ, LLC";

export function isDefaultSellerLlc(name: string | null | undefined): boolean {
  return (name ?? "").trim().toLowerCase() === DEFAULT_SELLER_LLC_NAME.toLowerCase();
}
