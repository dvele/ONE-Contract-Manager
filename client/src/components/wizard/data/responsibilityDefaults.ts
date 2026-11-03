// Re-exported so the wizard and server-side C.2 rendering share one list; the
// server cannot import from client/.
export {
  RESPONSIBILITY_CATEGORIES,
  getDefaultMatrix,
  C2_WORK_CATEGORIES,
  getC2DefaultMatrix,
  isC2Matrix,
  type ResponsibilityCategory,
  type C2WorkCategory,
} from '@shared/responsibilityMatrix';
