/** Entity suffixes the generated name must not double up on. */
const ENTITY_SUFFIX = /[,\s]+(l\.?l\.?c\.?|inc\.?|corp\.?|ltd\.?|l\.?p\.?)$/i;

/** A PO box is a mailing address, not a site: an entity named after one
 * identifies no property, so the project name is the better source. */
const PO_BOX = /^\s*p\.?\s*o\.?\s*box\b/i;

export function generateLLCName(projectAddress: string, projectName?: string): string {
  const address = (projectAddress || "").trim();
  const name = (projectName || "").trim();

  const usable = address !== "" && !PO_BOX.test(address);
  const source = usable ? address : name !== "" ? name : address;

  if (!source || source.trim() === "") return "";

  const suffix = source.match(ENTITY_SUFFIX);
  const base = (suffix ? source.slice(0, suffix.index) : source)
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .trim();

  if (base === "") return "";

  const tail = suffix
    ? suffix[1].replace(/[^a-zA-Z]/g, "").toUpperCase() === "LLC"
      ? "LLC"
      : suffix[1].replace(/[.,]/g, "")
    : "LLC";

  return `DP ${base} ${tail}`;
}

export function canEditLLCName(status: string): boolean {
  return status !== 'active' && status !== 'formed';
}
