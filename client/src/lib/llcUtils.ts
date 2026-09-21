// Re-exported so the wizard and the POST /projects route generate the same
// name from one implementation; the server cannot import from client/.
export { generateLLCName } from '@shared/llcName';

export function canEditLLCName(status: string): boolean {
  return status !== 'active' && status !== 'formed';
}
