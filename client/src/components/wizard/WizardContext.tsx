import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { generateLLCName } from '@/lib/llcUtils';
import { getDefaultMatrix } from './data/responsibilityDefaults';

// Shell Testing Mode: Set to false when step content components are added
// When true: skips form validation and allows navigation to all steps without completing forms
export const SHELL_TESTING_MODE = false;

// US States for dropdown
export const US_STATES = [
  { value: 'AL', label: 'Alabama' }, { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' }, { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' }, { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' }, { value: 'DE', label: 'Delaware' },
  { value: 'FL', label: 'Florida' }, { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' }, { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' }, { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' }, { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' }, { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' }, { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' }, { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' }, { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' }, { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' }, { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' }, { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' }, { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' }, { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' }, { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' }, { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' }, { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' }, { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' }, { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' }, { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' }, { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' }, { value: 'WY', label: 'Wyoming' },
  { value: 'DC', label: 'District of Columbia' }
];

// Client entity types
export const ENTITY_TYPES = [
  { value: 'Individual', label: 'Individual' },
  { value: 'LLC', label: 'Limited Liability Company (LLC)' },
  { value: 'Corporation', label: 'Corporation' },
  { value: 'Partnership', label: 'Partnership' },
  { value: 'Trust', label: 'Trust' }
];

// Federal judicial districts by state
export const FEDERAL_DISTRICTS: Record<string, string[]> = {
  'AL': ['Northern District of Alabama', 'Middle District of Alabama', 'Southern District of Alabama'],
  'AK': ['District of Alaska'],
  'AZ': ['District of Arizona'],
  'AR': ['Eastern District of Arkansas', 'Western District of Arkansas'],
  'CA': ['Northern District of California', 'Eastern District of California', 'Central District of California', 'Southern District of California'],
  'CO': ['District of Colorado'],
  'CT': ['District of Connecticut'],
  'DE': ['District of Delaware'],
  'FL': ['Northern District of Florida', 'Middle District of Florida', 'Southern District of Florida'],
  'GA': ['Northern District of Georgia', 'Middle District of Georgia', 'Southern District of Georgia'],
  'HI': ['District of Hawaii'],
  'ID': ['District of Idaho'],
  'IL': ['Northern District of Illinois', 'Central District of Illinois', 'Southern District of Illinois'],
  'IN': ['Northern District of Indiana', 'Southern District of Indiana'],
  'IA': ['Northern District of Iowa', 'Southern District of Iowa'],
  'KS': ['District of Kansas'],
  'KY': ['Eastern District of Kentucky', 'Western District of Kentucky'],
  'LA': ['Eastern District of Louisiana', 'Middle District of Louisiana', 'Western District of Louisiana'],
  'ME': ['District of Maine'],
  'MD': ['District of Maryland'],
  'MA': ['District of Massachusetts'],
  'MI': ['Eastern District of Michigan', 'Western District of Michigan'],
  'MN': ['District of Minnesota'],
  'MS': ['Northern District of Mississippi', 'Southern District of Mississippi'],
  'MO': ['Eastern District of Missouri', 'Western District of Missouri'],
  'MT': ['District of Montana'],
  'NE': ['District of Nebraska'],
  'NV': ['District of Nevada'],
  'NH': ['District of New Hampshire'],
  'NJ': ['District of New Jersey'],
  'NM': ['District of New Mexico'],
  'NY': ['Northern District of New York', 'Southern District of New York', 'Eastern District of New York', 'Western District of New York'],
  'NC': ['Eastern District of North Carolina', 'Middle District of North Carolina', 'Western District of North Carolina'],
  'ND': ['District of North Dakota'],
  'OH': ['Northern District of Ohio', 'Southern District of Ohio'],
  'OK': ['Northern District of Oklahoma', 'Eastern District of Oklahoma', 'Western District of Oklahoma'],
  'OR': ['District of Oregon'],
  'PA': ['Eastern District of Pennsylvania', 'Middle District of Pennsylvania', 'Western District of Pennsylvania'],
  'RI': ['District of Rhode Island'],
  'SC': ['District of South Carolina'],
  'SD': ['District of South Dakota'],
  'TN': ['Eastern District of Tennessee', 'Middle District of Tennessee', 'Western District of Tennessee'],
  'TX': ['Northern District of Texas', 'Eastern District of Texas', 'Southern District of Texas', 'Western District of Texas'],
  'UT': ['District of Utah'],
  'VT': ['District of Vermont'],
  'VA': ['Eastern District of Virginia', 'Western District of Virginia'],
  'WA': ['Eastern District of Washington', 'Western District of Washington'],
  'WV': ['Northern District of West Virginia', 'Southern District of West Virginia'],
  'WI': ['Eastern District of Wisconsin', 'Western District of Wisconsin'],
  'WY': ['District of Wyoming'],
  'DC': ['District of Columbia']
};

// Unit specification interface for multi-unit support
export interface UnitSpec {
  id: number;
  model: string;
  squareFootage: number;
  bedrooms: number;
  bathrooms: number;
  price: number;
  onsiteEstimate?: number;
}

export interface ResponsibilityItem {
  id: string;
  category: string;
  label: string;
  assignedTo: 'company' | 'client_gc';
}

// Project data interface
export interface ProjectData {
  projectNumber: string;
  projectName: string;
  projectType: string;
  totalUnits: number;
  agreementDate: string;
  serviceModel: 'CRC' | 'CMOS';
  contractType: 'MASTER_EF';
  buyerType: 'end_customer' | 'developer';
  storageFeePerDay: number;
  storageFreedays: number;
  adminFeePercent: number;
  clientLegalName: string;
  clientState: string;
  clientEntityType: string;
  clientFullName: string;
  clientTitle: string;
  clientAddress: string;
  clientCity: string;
  clientZip: string;
  clientSignerName: string;
  clientSignerTitle: string;
  clientEmail: string;
  clientPhone: string;
  llcOption: 'new' | 'existing';
  selectedExistingLlcId: string;
  childLlcName: string;
  childLlcState: string;
  childLlcEin: string;
  childLlcAddress: string;
  siteAddress: string;
  siteCity: string;
  siteState: string;
  siteZip: string;
  siteCounty: string;
  siteApn: string;
  billingAddressDifferent: boolean;
  billingAddress: string;
  billingCity: string;
  billingState: string;
  billingZip: string;
  homeModel: string;
  homeSquareFootage: number;
  homeBedrooms: number;
  homeBathrooms: number;
  homeConfiguration: string;
  units: UnitSpec[];
  effectiveDate: string;
  targetDeliveryDate: string;
  manufacturingStartDate: string;
  installationDate: string;
  contractPrice: number;
  designFee: number;
  designRevisionRounds: number;
  preliminaryOffsiteCost: number;
  preliminaryOnsiteCost: number;
  deliveryInstallationPrice: number;
  sitePrepPrice: number;
  utilitiesPrice: number;
  completionPrice: number;
  totalPreliminaryContractPrice: number;
  depositAmount: number;
  paymentSchedule: string;
  milestone1Percent: number;
  milestone2Percent: number;
  milestone3Percent: number;
  milestone4Percent: number;
  milestone5Percent: number;
  retainagePercent: number;
  retainageDays: number;
  manufacturingDesignPayment: number;
  manufacturingProductionStart: number;
  manufacturingProductionComplete: number;
  manufacturingDeliveryReady: number;
  warrantyPeriodYears: number;
  warrantyStartDate: string;
  estimatedCompletionMonths: number;
  estimatedCompletionUnit: 'months' | 'weeks';
  designPhaseDays: number;
  manufacturingDurationDays: number;
  onsiteDurationDays: number;
  permittingDurationDays: number;
  estimatedCompletionDate: string;
  warrantyFitFinishMonths: number;
  warrantyBuildingEnvelopeMonths: number;
  warrantyStructuralMonths: number;
  warrantyFitFinishExpires: string;
  warrantyEnvelopeExpires: string;
  warrantyStructuralExpires: string;
  projectState: string;
  projectCounty: string;
  projectFederalDistrict: string;
  overrideJurisdiction: boolean;
  arbitrationProvider: 'JAMS' | 'AAA';
  generalContractorName: string;
  generalContractorLicense: string;
  contractorName: string;
  contractorLicense: string;
  contractorAddress: string;
  contractorInsurance: string;
  manufacturerName: string;
  manufacturerAddress: string;
  manufacturerEntityId: number | null;
  onsiteContractorName: string;
  onsiteContractorAddress: string;
  onsiteContractorEntityId: number | null;
  insuranceProvider: string;
  insurancePolicyNumber: string;
  insuranceCoverageAmount: number;
  // Exhibit C.4 - Interface Deadlines (days before delivery)
  foundationReadyDays: number;
  utilityStubbedDays: number;
  siteAccessReadyDays: number;
  permitsScheduledDays: number;
  craneAccessReadyDays: number;
  // Exhibit D.1 - Design/Pre-Production Milestone Target Dates
  designKickoffDate: string;
  schematicDesignDate: string;
  designDevelopmentDate: string;
  permitSubmittalDate: string;
  // Exhibit D.2 - Production Milestone Target Dates
  productionMidpointDate: string;
  productionCompleteDate: string;
  // Exhibit C.2 - Responsibility Matrix
  responsibilityMatrix: ResponsibilityItem[];
}

// Wizard state interface
export type GenerationState = 'idle' | 'pre-generation' | 'generating' | 'success' | 'error';

export interface WizardState {
  currentStep: number;
  projectData: ProjectData;
  completedSteps: Set<number>;
  validationErrors: Record<string, string>;
  generationState: GenerationState;
  confirmationChecked: boolean;
  generationProgress: number;
  showClausePreview: boolean;
}

// Generated contract interface
export interface GeneratedContract {
  id: string;
  type: string;
  filename: string;
  downloadUrl: string;
  size: number;
  generatedAt: string;
  clauseCount?: number;
}

// LLC data interface
export interface LLCData {
  id: number;
  name: string;
  status: string;
  state_of_formation: string;
  ein_number: string;
  formation_date: string;
}

// Clause comparison interface
export interface ClauseComparison {
  totalClauses: number;
  crcOnly: number;
  cmosOnly: number;
  shared: number;
  differences: Array<{
    clauseNumber: string;
    clauseName: string;
    appliesTo: 'CRC' | 'CMOS' | 'BOTH';
    contentDiffers?: boolean;
  }>;
}

// Step definition
export interface StepDefinition {
  number: number;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

// Context type interface
export interface WizardContextType {
  // State
  wizardState: WizardState;
  draftProjectId: number | null;
  generationState: GenerationState;
  generationProgress: number;
  currentGenerationStep: number;
  generationError: string | null;
  generatedContracts: GeneratedContract[];
  generatedProjectId: string | null;
  showComparisonModal: boolean;
  showClausePreview: boolean;
  confirmationChecked: boolean;
  expandedSections: Record<string, boolean>;
  isCheckingNumber: boolean;
  numberIsUnique: boolean | null;
  isLoadingNumber: boolean;
  isLoadingDraft: boolean;
  existingLlcs: LLCData[] | undefined;
  comparisonData: ClauseComparison | undefined;
  comparisonLoading: boolean;
  dbUnitsCount: number;
  
  // Methods
  updateProjectData: (updates: Partial<ProjectData>) => void;
  setValidationErrors: (errors: Record<string, string>) => void;
  validateStep: (stepNumber: number) => { valid: boolean; errors: Record<string, string> };
  nextStep: () => Promise<void>;
  prevStep: () => void;
  goToStep: (stepNumber: number) => void;
  saveDraft: () => void;
  loadDraft: () => void;
  loadTestDraft: () => void;
  generateContracts: () => Promise<void>;
  setShowComparisonModal: (show: boolean) => void;
  setShowClausePreview: (show: boolean) => void;
  setConfirmationChecked: (checked: boolean) => void;
  toggleSection: (section: string) => void;
  setGenerationState: (state: GenerationState) => void;
  regenerateProjectNumber: () => Promise<void>;
  checkProjectNumberUniqueness: (projectNumber: string) => Promise<void>;
  updateUnit: (unitId: number, updates: Partial<UnitSpec>) => void;
  addUnit: () => void;
  removeUnit: (unitId: number) => void;
  setDbUnitsCount: (count: number) => void;
}

// Initial project data
export const initialProjectData: ProjectData = {
  projectNumber: '',
  projectName: '',
  projectType: 'Single Family Residence',
  totalUnits: 1,
  agreementDate: new Date().toISOString().split('T')[0],
  serviceModel: 'CRC',
  contractType: 'MASTER_EF',
  buyerType: 'end_customer',
  storageFeePerDay: 15000,
  storageFreedays: 14,
  adminFeePercent: 10,
  clientLegalName: '',
  clientState: '',
  clientEntityType: 'Individual',
  clientFullName: '',
  clientTitle: '',
  clientAddress: '',
  clientCity: '',
  clientZip: '',
  clientSignerName: '',
  clientSignerTitle: '',
  clientEmail: '',
  clientPhone: '',
  llcOption: 'new',
  selectedExistingLlcId: '',
  childLlcName: '',
  childLlcState: 'DE',
  childLlcEin: '',
  childLlcAddress: '',
  siteAddress: '',
  siteCity: '',
  siteState: '',
  siteZip: '',
  siteCounty: '',
  siteApn: '',
  billingAddressDifferent: false,
  billingAddress: '',
  billingCity: '',
  billingState: '',
  billingZip: '',
  homeModel: '',
  homeSquareFootage: 0,
  homeBedrooms: 0,
  homeBathrooms: 0,
  homeConfiguration: '',
  units: [{ id: 1, model: '', squareFootage: 1500, bedrooms: 3, bathrooms: 2, price: 0 }],
  effectiveDate: new Date().toISOString().split('T')[0],
  targetDeliveryDate: '',
  manufacturingStartDate: '',
  installationDate: '',
  contractPrice: 0,
  designFee: 5000,
  designRevisionRounds: 3,
  preliminaryOffsiteCost: 0,
  preliminaryOnsiteCost: 0,
  deliveryInstallationPrice: 25000,
  sitePrepPrice: 0,
  utilitiesPrice: 0,
  completionPrice: 0,
  totalPreliminaryContractPrice: 0,
  depositAmount: 0,
  paymentSchedule: '',
  milestone1Percent: 20,
  milestone2Percent: 20,
  milestone3Percent: 20,
  milestone4Percent: 20,
  milestone5Percent: 15,
  retainagePercent: 5,
  retainageDays: 60,
  manufacturingDesignPayment: 5000,
  manufacturingProductionStart: 25000,
  manufacturingProductionComplete: 50000,
  manufacturingDeliveryReady: 20000,
  warrantyPeriodYears: 1,
  warrantyStartDate: '',
  estimatedCompletionMonths: 12,
  estimatedCompletionUnit: 'months',
  designPhaseDays: 60,
  manufacturingDurationDays: 120,
  onsiteDurationDays: 60,
  permittingDurationDays: 60,
  estimatedCompletionDate: '',
  warrantyFitFinishMonths: 24,
  warrantyBuildingEnvelopeMonths: 60,
  warrantyStructuralMonths: 120,
  warrantyFitFinishExpires: '',
  warrantyEnvelopeExpires: '',
  warrantyStructuralExpires: '',
  projectState: '',
  projectCounty: '',
  projectFederalDistrict: '',
  overrideJurisdiction: false,
  arbitrationProvider: 'JAMS',
  generalContractorName: '',
  generalContractorLicense: '',
  contractorName: '',
  contractorLicense: '',
  contractorAddress: '',
  contractorInsurance: '',
  manufacturerName: 'Dvele AZ, LLC',
  manufacturerAddress: '',
  manufacturerEntityId: null,
  onsiteContractorName: '',
  onsiteContractorAddress: '',
  onsiteContractorEntityId: null,
  insuranceProvider: '',
  insurancePolicyNumber: '',
  insuranceCoverageAmount: 0,
  foundationReadyDays: 14,
  utilityStubbedDays: 14,
  siteAccessReadyDays: 7,
  permitsScheduledDays: 30,
  craneAccessReadyDays: 7,
  designKickoffDate: '',
  schematicDesignDate: '',
  designDevelopmentDate: '',
  permitSubmittalDate: '',
  productionMidpointDate: '',
  productionCompleteDate: '',
  responsibilityMatrix: [],
};

// Test draft data pre-filled through Step 8 for faster testing
export const testDraftData: Partial<ProjectData> = {
  projectNumber: 'TEST-2026-001',
  projectName: 'Sample Test Project',
  projectType: 'Single Family',
  totalUnits: 1,
  serviceModel: 'CRC',
  clientLegalName: 'Acme Development LLC',
  clientState: 'CA',
  clientEntityType: 'LLC',
  clientEmail: 'contact@acmedev.com',
  clientSignerName: 'John Smith',
  clientSignerTitle: 'Managing Partner',
  clientPhone: '555-123-4567',
  contractorName: 'California Builders Inc',
  contractorLicense: 'CA-LIC-789012',
  contractorAddress: '456 Construction Way, Los Angeles, CA 90001',
  contractorInsurance: 'Policy-INS-2026-001',
  childLlcName: 'Dvele Partners Sample LLC',
  childLlcState: 'DE',
  siteAddress: '123 Oak Street',
  siteCity: 'San Francisco',
  siteState: 'CA',
  siteZip: '94102',
  siteCounty: 'San Francisco',
  units: [{ id: 1, model: 'Dvele Model X', squareFootage: 2000, bedrooms: 3, bathrooms: 2, price: 450000 }],
  effectiveDate: new Date().toISOString().split('T')[0],
  designFee: 15000,
  designRevisionRounds: 3,
  preliminaryOffsiteCost: 350000,
  deliveryInstallationPrice: 45000,
  totalPreliminaryContractPrice: 410000,
  milestone1Percent: 20,
  milestone2Percent: 20,
  milestone3Percent: 20,
  milestone4Percent: 20,
  milestone5Percent: 15,
  retainagePercent: 5,
  retainageDays: 60,
  manufacturingDesignPayment: 10000,
  manufacturingProductionStart: 50000,
  manufacturingProductionComplete: 100000,
  manufacturingDeliveryReady: 40000,
  designPhaseDays: 60,
  manufacturingDurationDays: 120,
  onsiteDurationDays: 45,
  permittingDurationDays: 45,
  warrantyFitFinishMonths: 24,
  warrantyBuildingEnvelopeMonths: 60,
  warrantyStructuralMonths: 120,
  projectState: 'CA',
  projectCounty: 'San Francisco',
  projectFederalDistrict: 'Northern District of California',
  overrideJurisdiction: false,
  arbitrationProvider: 'JAMS',
};

// Create context
const WizardContext = createContext<WizardContextType | undefined>(undefined);

// Provider component
interface WizardProviderProps {
  children: ReactNode;
  loadProjectId?: string | null;
}

export const WizardProvider: React.FC<WizardProviderProps> = ({ children, loadProjectId }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoadingDraft, setIsLoadingDraft] = useState(!!loadProjectId);
  
  // Core wizard state
  const [wizardState, setWizardState] = useState<WizardState>({
    currentStep: 1,
    projectData: initialProjectData,
    completedSteps: new Set<number>(),
    validationErrors: {},
    generationState: 'idle',
    confirmationChecked: false,
    generationProgress: 0,
    showClausePreview: false,
  });
  
  // Draft and UI states
  const [draftProjectId, setDraftProjectId] = useState<number | null>(null);
  const [isCheckingNumber, setIsCheckingNumber] = useState(false);
  const [numberIsUnique, setNumberIsUnique] = useState<boolean | null>(null);
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const [showClausePreview, setShowClausePreview] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    project: true,
    parties: true,
    property: true,
    financial: true,
    schedule: true,
  });
  
  // Generation states
  const [generationState, setGenerationState] = useState<GenerationState>('pre-generation');
  const [confirmationChecked, setConfirmationChecked] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [currentGenerationStep, setCurrentGenerationStep] = useState(0);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generatedContracts, setGeneratedContracts] = useState<GeneratedContract[]>([]);
  const [generatedProjectId, setGeneratedProjectId] = useState<string | null>(null);
  const [dbUnitsCount, setDbUnitsCount] = useState<number>(0);

  // Fetch next project number on mount
  const { data: nextNumberData, refetch: refetchNextNumber, isLoading: isLoadingNumber } = useQuery<{ projectNumber: string }>({
    queryKey: ['/api/projects/next-number'],
    staleTime: 0,
  });

  // Auto-populate project number on first load (only if not loading a draft)
  useEffect(() => {
    if (nextNumberData?.projectNumber && !wizardState.projectData.projectNumber && !loadProjectId) {
      setWizardState(prev => ({
        ...prev,
        projectData: { ...prev.projectData, projectNumber: nextNumberData.projectNumber },
      }));
      setNumberIsUnique(true);
    }
  }, [nextNumberData, loadProjectId]);

  // Load draft data when loadProjectId is provided
  useEffect(() => {
    if (!loadProjectId) {
      setIsLoadingDraft(false);
      return;
    }
    
    const loadDraft = async () => {
      try {
        setIsLoadingDraft(true);
        const projectId = parseInt(loadProjectId);
        
        // Fetch all data in parallel for efficiency
        const [projectRes, clientRes, financialsRes, detailsRes, warrantyRes, contractorsRes, unitsRes] = await Promise.all([
          fetch(`/api/projects/${projectId}`),
          fetch(`/api/projects/${projectId}/client`),
          fetch(`/api/projects/${projectId}/financials`),
          fetch(`/api/projects/${projectId}/details`),
          fetch(`/api/projects/${projectId}/warranty-terms`),
          fetch(`/api/projects/${projectId}/contractors`),
          fetch(`/api/projects/${projectId}/units`),
        ]);
        
        if (!projectRes.ok) throw new Error('Failed to load project');
        const project = await projectRes.json();
        const client = clientRes.ok ? await clientRes.json() : null;
        const financials = financialsRes.ok ? await financialsRes.json() : null;
        const details = detailsRes.ok ? await detailsRes.json() : null;
        const warranty = warrantyRes.ok ? await warrantyRes.json() : null;
        const contractors = contractorsRes.ok ? await contractorsRes.json() : [];
        const unitsData = unitsRes.ok ? await unitsRes.json() : [];
        
        // Build the project data from fetched data
        const loadedData: Partial<ProjectData> = {
          projectName: project?.name || '',
          projectNumber: project?.projectNumber || '',
          serviceModel: project?.onSiteSelection || 'CRC',
          contractType: project?.contractType === 'MASTER_EF' ? 'MASTER_EF' : 'MASTER_EF',
          buyerType: project?.buyerType || 'end_customer',
          storageFeePerDay: project?.storageFeePerDay || 15000,
          storageFreedays: project?.storageFreedays || 14,
          adminFeePercent: project?.adminFeePercent || 10,
        };
        
        // Add client data if available
        if (client) {
          loadedData.clientLegalName = client.legalName || '';
          loadedData.clientEntityType = client.entityType || '';
          loadedData.clientEmail = client.email || '';
          loadedData.clientPhone = client.phone || '';
          loadedData.clientAddress = client.address || '';
          loadedData.clientCity = client.city || '';
          loadedData.clientState = client.state || '';
          loadedData.clientZip = client.zip || '';
          loadedData.clientSignerName = client.trusteeName || '';
          loadedData.clientSignerTitle = client.trusteeTitle || '';
        }
        
        // Add site details if available
        if (details) {
          loadedData.siteAddress = details.deliveryAddress || '';
          loadedData.siteCity = details.deliveryCity || '';
          loadedData.siteState = details.deliveryState || '';
          loadedData.siteZip = details.deliveryZip || '';
          loadedData.siteCounty = details.deliveryCounty || '';
          loadedData.siteApn = details.deliveryApn || '';
          loadedData.totalUnits = details.totalUnits || 1;
          
        }
        
        // Add financials if available - convert cents to dollars
        if (financials) {
          loadedData.designFee = financials.designFee ? financials.designFee / 100 : 5000;
          loadedData.designRevisionRounds = financials.designRevisionRounds || 3;
          loadedData.preliminaryOffsiteCost = financials.prelimOffsite ? financials.prelimOffsite / 100 : 0;
          loadedData.preliminaryOnsiteCost = financials.prelimOnsite ? financials.prelimOnsite / 100 : 0;
          loadedData.deliveryInstallationPrice = financials.deliveryInstallCost ? financials.deliveryInstallCost / 100 : 25000;
          
          // CMOS-specific fields
          loadedData.sitePrepPrice = financials.sitePrepCost ? financials.sitePrepCost / 100 : 0;
          loadedData.utilitiesPrice = financials.utilitiesCost ? financials.utilitiesCost / 100 : 0;
          loadedData.completionPrice = financials.onsiteCompletionCost ? financials.onsiteCompletionCost / 100 : 0;
          
          // Milestones - stored as percentages (integers)
          loadedData.milestone1Percent = financials.milestone1Percent ?? 20;
          loadedData.milestone2Percent = financials.milestone2Percent ?? 20;
          loadedData.milestone3Percent = financials.milestone3Percent ?? 20;
          loadedData.milestone4Percent = financials.milestone4Percent ?? 20;
          loadedData.milestone5Percent = financials.milestone5Percent ?? 15;
          loadedData.retainagePercent = financials.retainagePercent ?? 5;
        }
        
        // Load LLC data if project has llcId
        if (project.llcId) {
          try {
            const llcRes = await fetch(`/api/llcs/${project.llcId}`);
            if (llcRes.ok) {
              const llc = await llcRes.json();
              loadedData.llcOption = 'existing';
              loadedData.selectedExistingLlcId = String(llc.id);
              loadedData.childLlcName = llc.name || '';
              loadedData.childLlcState = llc.state || 'DE';
              loadedData.childLlcEin = llc.ein || '';
            }
          } catch (llcError) {
            console.warn('Could not load LLC data:', llcError);
          }
        }
        
        // Load units from database, or build from details as fallback
        if (unitsData && Array.isArray(unitsData) && unitsData.length > 0) {
          loadedData.units = unitsData.map((u: any, index: number) => ({
            id: index + 1,
            model: u.modelName || u.model || '',
            squareFootage: u.squareFootage || 1500,
            bedrooms: u.bedrooms || 3,
            bathrooms: u.bathrooms || 2,
            price: u.basePrice ? u.basePrice / 100 : 0,
          }));
          loadedData.totalUnits = unitsData.length;
        } else if (details && (details.homeModel || details.homeSqFt)) {
          // Fallback: build units from project details if no units in DB
          const totalUnits = details.totalUnits || 1;
          const units = [];
          for (let i = 0; i < totalUnits; i++) {
            units.push({
              id: i + 1,
              model: details.homeModel || '',
              squareFootage: details.homeSqFt || 1500,
              bedrooms: details.homeBedrooms || 3,
              bathrooms: details.homeBathrooms || 2,
              price: 0,
            });
          }
          loadedData.units = units;
          loadedData.totalUnits = totalUnits;
        }
        
        // Load warranty terms - API uses dvele* field names
        if (warranty) {
          loadedData.warrantyFitFinishMonths = warranty.dveleFitFinishMonths || warranty.warrantyFitFinishMonths || 24;
          loadedData.warrantyBuildingEnvelopeMonths = warranty.dveleBuildingEnvelopeMonths || warranty.warrantyBuildingEnvelopeMonths || 60;
          loadedData.warrantyStructuralMonths = warranty.dveleStructuralMonths || warranty.warrantyStructuralMonths || 120;
          loadedData.warrantyStartDate = warranty.warrantyStartDate || '';
          loadedData.arbitrationProvider = warranty.arbitrationProvider || 'JAMS';
        }
        
        // Load contractor info
        if (contractors && Array.isArray(contractors)) {
          const manufacturer = contractors.find((c: any) => c.contractorType === 'manufacturer');
          const onsiteContractor = contractors.find((c: any) => c.contractorType === 'onsite_general');
          
          if (manufacturer) {
            loadedData.manufacturerName = manufacturer.legalName || '';
            loadedData.manufacturerAddress = manufacturer.address || '';
            loadedData.manufacturerEntityId = manufacturer.contractorEntityId || null;
          }
          
          if (onsiteContractor) {
            loadedData.onsiteContractorName = onsiteContractor.legalName || '';
            loadedData.onsiteContractorAddress = onsiteContractor.address || '';
            loadedData.onsiteContractorEntityId = onsiteContractor.contractorEntityId || null;
          }
        }
        
        // Load dates from details
        if (details) {
          loadedData.effectiveDate = details.agreementExecutionDate || '';
          loadedData.targetDeliveryDate = details.estimatedDeliveryDate || '';
          loadedData.manufacturingStartDate = details.productionStartDate || '';
          loadedData.projectState = details.governingLawState || '';
          // Exhibit C.2 Responsibility Matrix
          if (details.responsibilityMatrix) {
            try {
              loadedData.responsibilityMatrix = JSON.parse(details.responsibilityMatrix);
            } catch { loadedData.responsibilityMatrix = []; }
          }
          // Exhibit C.4 Interface Deadlines
          if (details.foundationReadyDays != null) loadedData.foundationReadyDays = details.foundationReadyDays;
          if (details.utilityStubbedDays != null) loadedData.utilityStubbedDays = details.utilityStubbedDays;
          if (details.siteAccessReadyDays != null) loadedData.siteAccessReadyDays = details.siteAccessReadyDays;
          if (details.permitsScheduledDays != null) loadedData.permitsScheduledDays = details.permitsScheduledDays;
          if (details.craneAccessReadyDays != null) loadedData.craneAccessReadyDays = details.craneAccessReadyDays;
          // Exhibit D.1/D.2 Target Dates
          loadedData.designKickoffDate = details.designKickoffDate || '';
          loadedData.schematicDesignDate = details.schematicDesignDate || '';
          loadedData.designDevelopmentDate = details.designDevelopmentDate || '';
          loadedData.permitSubmittalDate = details.permitSubmittalDate || '';
          loadedData.productionMidpointDate = details.productionMidpointDate || '';
          loadedData.productionCompleteDate = details.productionCompleteDate || '';
        }
        
        // Load schedule durations from project table
        // Map database field names to wizard field names
        if (project.designDuration) {
          loadedData.designPhaseDays = project.designDuration;
        }
        if (project.productionDuration) {
          loadedData.manufacturingDurationDays = project.productionDuration;
        }
        if (project.deliveryDuration) {
          loadedData.onsiteDurationDays = project.deliveryDuration;
        }
        
        // Ensure Step 8 validation fields have defaults if not loaded
        if (!loadedData.designPhaseDays) {
          loadedData.designPhaseDays = 60;
        }
        if (!loadedData.manufacturingDurationDays) {
          loadedData.manufacturingDurationDays = 120;
        }
        if (!loadedData.onsiteDurationDays) {
          loadedData.onsiteDurationDays = loadedData.serviceModel === 'CRC' ? 90 : 60;
        }
        if (!loadedData.estimatedCompletionMonths) {
          loadedData.estimatedCompletionMonths = 12;
        }
        if (!loadedData.estimatedCompletionUnit) {
          loadedData.estimatedCompletionUnit = 'months';
        }
        if (!loadedData.warrantyFitFinishMonths) {
          loadedData.warrantyFitFinishMonths = 24;
        }
        if (!loadedData.warrantyBuildingEnvelopeMonths) {
          loadedData.warrantyBuildingEnvelopeMonths = 60;
        }
        if (!loadedData.warrantyStructuralMonths) {
          loadedData.warrantyStructuralMonths = 120;
        }
        if ((!loadedData.responsibilityMatrix || loadedData.responsibilityMatrix.length === 0) && loadedData.serviceModel) {
          loadedData.responsibilityMatrix = getDefaultMatrix(loadedData.serviceModel as 'CRC' | 'CMOS');
        }
        if (!loadedData.arbitrationProvider) {
          loadedData.arbitrationProvider = 'JAMS';
        }
        
        // Set projectCounty from siteCounty if not set
        if (!loadedData.projectCounty && loadedData.siteCounty) {
          loadedData.projectCounty = loadedData.siteCounty;
        }
        
        // Set projectState from siteState if not set
        if (!loadedData.projectState && loadedData.siteState) {
          loadedData.projectState = loadedData.siteState;
        }
        
        // Auto-set federal district based on state
        if (!loadedData.projectFederalDistrict) {
          const state = loadedData.projectState || loadedData.siteState || '';
          const districts = FEDERAL_DISTRICTS[state] || [];
          if (districts.length > 0) {
            loadedData.projectFederalDistrict = districts[0];
          }
        }
        
        // For any resumed draft, mark all steps 1-8 as accessible
        // This allows users to click on any step when resuming/editing
        const stepsWithData = new Set<number>([1, 2, 3, 4, 5, 6, 7, 8]);
        
        // Update wizard state with loaded data AND completed steps
        setWizardState(prev => ({
          ...prev,
          projectData: { ...prev.projectData, ...loadedData },
          completedSteps: stepsWithData,
        }));
        
        // Set draftProjectId so autosave updates this project instead of creating new one
        setDraftProjectId(projectId);
        
        // Update lastSavedDataRef to prevent immediate autosave
        lastSavedDataRef.current = JSON.stringify({
          projectName: loadedData.projectName,
          projectNumber: loadedData.projectNumber,
          serviceModel: loadedData.serviceModel,
          clientLegalName: loadedData.clientLegalName,
          clientEmail: loadedData.clientEmail,
          siteAddress: loadedData.siteAddress,
          siteCity: loadedData.siteCity,
          siteState: loadedData.siteState,
          designFee: loadedData.designFee,
          preliminaryOffsiteCost: loadedData.preliminaryOffsiteCost,
          effectiveDate: loadedData.effectiveDate,
        });
        
        const projectName = project.name || loadedData.projectName || 'your project';
        toast({
          title: "Draft Loaded",
          description: `Resuming draft for "${projectName}"`,
        });
        
      } catch (error) {
        console.error('Failed to load draft:', error);
        toast({
          title: "Error Loading Draft",
          description: "Could not load the saved draft. Starting fresh.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingDraft(false);
      }
    };
    
    loadDraft();
  }, [loadProjectId, toast]);

  // Sync units array when totalUnits changes
  useEffect(() => {
    const { totalUnits, units } = wizardState.projectData;
    if (units.length < totalUnits) {
      const newUnits = [...units];
      for (let i = units.length; i < totalUnits; i++) {
        newUnits.push({
          id: i + 1,
          model: '',
          squareFootage: 1500,
          bedrooms: 3,
          bathrooms: 2,
          price: 0
        });
      }
      setWizardState(prev => ({
        ...prev,
        projectData: { ...prev.projectData, units: newUnits }
      }));
    } else if (units.length > totalUnits) {
      const trimmedUnits = units.slice(0, totalUnits);
      setWizardState(prev => ({
        ...prev,
        projectData: { ...prev.projectData, units: trimmedUnits }
      }));
    }
  }, [wizardState.projectData.totalUnits]);

  // Update preliminary offsite cost when unit prices change
  useEffect(() => {
    const totalPrice = wizardState.projectData.units.reduce((sum, unit) => sum + (unit.price || 0), 0);
    if (totalPrice !== wizardState.projectData.preliminaryOffsiteCost) {
      setWizardState(prev => ({
        ...prev,
        projectData: { ...prev.projectData, preliminaryOffsiteCost: totalPrice }
      }));
    }
  }, [wizardState.projectData.units]);

  // Auto-calculate total preliminary contract price
  useEffect(() => {
    const { serviceModel, preliminaryOffsiteCost, deliveryInstallationPrice, designFee,
            sitePrepPrice, utilitiesPrice, completionPrice } = wizardState.projectData;
    
    let total = preliminaryOffsiteCost + deliveryInstallationPrice + designFee;
    if (serviceModel === 'CMOS') {
      total += sitePrepPrice + utilitiesPrice + completionPrice;
    }
    
    if (total !== wizardState.projectData.totalPreliminaryContractPrice) {
      setWizardState(prev => ({
        ...prev,
        projectData: { ...prev.projectData, totalPreliminaryContractPrice: total }
      }));
    }
  }, [
    wizardState.projectData.serviceModel,
    wizardState.projectData.preliminaryOffsiteCost,
    wizardState.projectData.deliveryInstallationPrice,
    wizardState.projectData.designFee,
    wizardState.projectData.sitePrepPrice,
    wizardState.projectData.utilitiesPrice,
    wizardState.projectData.completionPrice
  ]);

  // Auto-sync manufacturing design payment with design fee
  useEffect(() => {
    const { designFee, manufacturingDesignPayment } = wizardState.projectData;
    if (designFee !== manufacturingDesignPayment) {
      setWizardState(prev => ({
        ...prev,
        projectData: { ...prev.projectData, manufacturingDesignPayment: designFee }
      }));
    }
  }, [wizardState.projectData.designFee]);

  // Sync contractPrice with totalPreliminaryContractPrice
  useEffect(() => {
    const { totalPreliminaryContractPrice, contractPrice } = wizardState.projectData;
    if (totalPreliminaryContractPrice !== contractPrice) {
      setWizardState(prev => ({
        ...prev,
        projectData: { ...prev.projectData, contractPrice: totalPreliminaryContractPrice }
      }));
    }
  }, [wizardState.projectData.totalPreliminaryContractPrice]);

  // Set default onsite duration based on service model
  useEffect(() => {
    const { serviceModel, onsiteDurationDays } = wizardState.projectData;
    const defaultDays = serviceModel === 'CMOS' ? 60 : 90;
    if ((serviceModel === 'CMOS' && onsiteDurationDays === 90) || 
        (serviceModel === 'CRC' && onsiteDurationDays === 60)) {
      setWizardState(prev => ({
        ...prev,
        projectData: { ...prev.projectData, onsiteDurationDays: defaultDays }
      }));
    }
  }, [wizardState.projectData.serviceModel]);

  // Check project number uniqueness
  const checkProjectNumberUniqueness = useCallback(async (projectNumber: string) => {
    if (!projectNumber || projectNumber.length < 4) {
      setNumberIsUnique(null);
      return;
    }
    
    setIsCheckingNumber(true);
    try {
      // Exclude current project when editing to avoid self-collision
      const excludeParam = draftProjectId ? `?excludeId=${draftProjectId}` : '';
      const response = await fetch(`/api/projects/check-number/${encodeURIComponent(projectNumber)}${excludeParam}`);
      const data = await response.json();
      setNumberIsUnique(data.isUnique);
    } catch (error) {
      console.error('Failed to check project number:', error);
      setNumberIsUnique(null);
    } finally {
      setIsCheckingNumber(false);
    }
  }, [draftProjectId]);

  // Create draft project mutation
  const createDraftProjectMutation = useMutation({
    mutationFn: async (projectData: { projectNumber: string; name: string; status: string; onSiteSelection: string }) => {
      const response = await apiRequest('POST', '/api/projects', projectData);
      return response.json();
    },
    onSuccess: (data) => {
      setDraftProjectId(data.id);
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
    },
  });

  // Update project mutation
  const updateProjectMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: number; [key: string]: any }) => {
      const response = await apiRequest('PATCH', `/api/projects/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
    },
  });

  // Autosave debounce ref
  const autosaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isAutosavingRef = useRef(false);
  const lastSavedDataRef = useRef<string>('');
  const pendingSaveRef = useRef(false); // Track if new data came in during save

  // Silent autosave function - saves all wizard data without notifications
  const performAutosave = useCallback(async () => {
    // If already saving, mark that new data came in so we retry after current save
    if (isAutosavingRef.current) {
      pendingSaveRef.current = true;
      return;
    }
    
    const pd = wizardState.projectData;
    
    // Need at least a project name to save
    if (!pd.projectName?.trim()) return;
    
    // Check if data has actually changed - include fields that are being saved
    const currentDataHash = JSON.stringify({
      // Project basics
      projectName: pd.projectName,
      projectNumber: pd.projectNumber,
      serviceModel: pd.serviceModel,
      contractType: pd.contractType,
      buyerType: pd.buyerType,
      storageFeePerDay: pd.storageFeePerDay,
      storageFreedays: pd.storageFreedays,
      adminFeePercent: pd.adminFeePercent,
      // Site info (saved to project details)
      siteAddress: pd.siteAddress,
      siteCity: pd.siteCity,
      siteState: pd.siteState,
      siteZip: pd.siteZip,
      siteCounty: pd.siteCounty,
      siteApn: pd.siteApn,
      // Client info
      clientLegalName: pd.clientLegalName,
      clientEntityType: pd.clientEntityType,
      clientAddress: pd.clientAddress,
      clientCity: pd.clientCity,
      clientState: pd.clientState,
      clientZip: pd.clientZip,
      clientEmail: pd.clientEmail,
      clientPhone: pd.clientPhone,
      clientSignerName: pd.clientSignerName,
      clientSignerTitle: pd.clientSignerTitle,
      // Contractors
      manufacturerName: pd.manufacturerName,
      manufacturerAddress: pd.manufacturerAddress,
      manufacturerEntityId: pd.manufacturerEntityId,
      onsiteContractorName: pd.onsiteContractorName,
      onsiteContractorAddress: pd.onsiteContractorAddress,
      onsiteContractorEntityId: pd.onsiteContractorEntityId,
      // Financials
      designFee: pd.designFee,
      designRevisionRounds: pd.designRevisionRounds,
      preliminaryOffsiteCost: pd.preliminaryOffsiteCost,
      deliveryInstallationPrice: pd.deliveryInstallationPrice,
      totalPreliminaryContractPrice: pd.totalPreliminaryContractPrice,
      // Project details/dates
      units: pd.units,
      totalUnits: pd.totalUnits,
      effectiveDate: pd.effectiveDate,
      targetDeliveryDate: pd.targetDeliveryDate,
      manufacturingStartDate: pd.manufacturingStartDate,
      projectState: pd.projectState,
      projectCounty: pd.projectCounty,
      // LLC
      llcOption: pd.llcOption,
      childLlcName: pd.childLlcName,
      childLlcState: pd.childLlcState,
      childLlcEin: pd.childLlcEin,
      // Warranty
      warrantyFitFinishMonths: pd.warrantyFitFinishMonths,
      warrantyBuildingEnvelopeMonths: pd.warrantyBuildingEnvelopeMonths,
      warrantyStructuralMonths: pd.warrantyStructuralMonths,
      warrantyStartDate: pd.warrantyStartDate,
      arbitrationProvider: pd.arbitrationProvider,
      // Schedule durations
      designPhaseDays: pd.designPhaseDays,
      manufacturingDurationDays: pd.manufacturingDurationDays,
      onsiteDurationDays: pd.onsiteDurationDays,
      permittingDurationDays: pd.permittingDurationDays,
      estimatedCompletionDate: pd.estimatedCompletionDate,
      // C.2 Responsibility Matrix
      responsibilityMatrix: pd.responsibilityMatrix,
      // C.4 Interface Deadlines
      foundationReadyDays: pd.foundationReadyDays,
      utilityStubbedDays: pd.utilityStubbedDays,
      siteAccessReadyDays: pd.siteAccessReadyDays,
      permitsScheduledDays: pd.permitsScheduledDays,
      craneAccessReadyDays: pd.craneAccessReadyDays,
      // D.1/D.2 Target Dates
      designKickoffDate: pd.designKickoffDate,
      schematicDesignDate: pd.schematicDesignDate,
      designDevelopmentDate: pd.designDevelopmentDate,
      permitSubmittalDate: pd.permitSubmittalDate,
      productionMidpointDate: pd.productionMidpointDate,
      productionCompleteDate: pd.productionCompleteDate,
    });
    
    if (currentDataHash === lastSavedDataRef.current) return;
    
    isAutosavingRef.current = true;
    
    try {
      let projectId = draftProjectId;
      
      // Create or update project
      if (!projectId) {
        // Generate unique project number for draft only if user hasn't entered one
        const uniqueId = Math.random().toString(36).substring(2, 8).toUpperCase();
        // Preserve user-entered project number, only add DRAFT suffix if not already a draft
        let draftProjectNumber = pd.projectNumber;
        if (!draftProjectNumber) {
          draftProjectNumber = `DRAFT-${Date.now()}-${uniqueId}`;
        } else if (!draftProjectNumber.includes('DRAFT')) {
          draftProjectNumber = `${pd.projectNumber}-DRAFT-${uniqueId}`;
        }
        
        const projectPayload = {
          projectNumber: draftProjectNumber,
          name: pd.projectName,
          status: 'Draft',
          state: pd.siteState || null,
          onSiteSelection: pd.serviceModel || 'CRC',
          contractType: pd.contractType || 'MASTER_EF',
          buyerType: pd.buyerType || 'end_customer',
          storageFeePerDay: pd.storageFeePerDay || 15000,
          storageFreedays: pd.storageFreedays || 14,
          adminFeePercent: pd.adminFeePercent || 10,
          // Schedule durations (will be 0 initially, updated in Step 6)
          designDuration: pd.designPhaseDays || 0,
          permittingDuration: pd.permittingDurationDays || 0,
          productionDuration: pd.manufacturingDurationDays || 0,
          deliveryDuration: pd.onsiteDurationDays || 0,
          completionDuration: (pd.designPhaseDays || 0) + (pd.manufacturingDurationDays || 0) + (pd.onsiteDurationDays || 0),
          estimatedDeliveryDate: pd.targetDeliveryDate || null,
          estimatedCompletionDate: pd.estimatedCompletionDate || null,
        };
        
        const projectResponse = await apiRequest('POST', '/api/projects', projectPayload);
        if (projectResponse.ok) {
          const project = await projectResponse.json();
          projectId = project.id;
          setDraftProjectId(project.id);
        }
      } else {
        // Update existing project including schedule durations
        await apiRequest('PATCH', `/api/projects/${projectId}`, {
          name: pd.projectName,
          state: pd.siteState || null,
          onSiteSelection: pd.serviceModel || 'CRC',
          contractType: pd.contractType || 'MASTER_EF',
          buyerType: pd.buyerType || 'end_customer',
          storageFeePerDay: pd.storageFeePerDay || 15000,
          storageFreedays: pd.storageFreedays || 14,
          adminFeePercent: pd.adminFeePercent || 10,
          // Schedule durations on project level
          designDuration: pd.designPhaseDays || 0,
          permittingDuration: pd.permittingDurationDays || 0,
          productionDuration: pd.manufacturingDurationDays || 0,
          deliveryDuration: pd.onsiteDurationDays || 0,
          completionDuration: (pd.designPhaseDays || 0) + (pd.manufacturingDurationDays || 0) + (pd.onsiteDurationDays || 0),
          estimatedDeliveryDate: pd.targetDeliveryDate || null,
          estimatedCompletionDate: pd.estimatedCompletionDate || null,
        });
      }
      
      if (projectId) {
        // Save/update client information (use PATCH for upsert behavior)
        if (pd.clientLegalName) {
          const clientPayload = {
            legalName: pd.clientLegalName,
            entityType: pd.clientEntityType,
            formationState: pd.clientState,
            address: pd.clientAddress,
            city: pd.clientCity,
            state: pd.clientState,
            zip: pd.clientZip,
            email: pd.clientEmail,
            phone: pd.clientPhone,
            trusteeName: pd.clientSignerName,
            trusteeTitle: pd.clientSignerTitle,
          };
          await apiRequest('PATCH', `/api/projects/${projectId}/client`, clientPayload);
        }
        
        // Save financial terms
        const hasFinancials = pd.designFee || pd.preliminaryOffsiteCost || pd.deliveryInstallationPrice;
        if (hasFinancials) {
          const financialsPayload = {
            projectId,
            designFee: pd.designFee ? Math.round(pd.designFee * 100) : null,
            designRevisionRounds: pd.designRevisionRounds || 3,
            prelimOffsite: pd.preliminaryOffsiteCost ? Math.round(pd.preliminaryOffsiteCost * 100) : null,
            prelimContractPrice: pd.totalPreliminaryContractPrice ? Math.round(pd.totalPreliminaryContractPrice * 100) : null,
          };
          await apiRequest('POST', `/api/projects/${projectId}/financials`, financialsPayload);
        }
        
        // Save project details (site address, dates, etc.)
        const detailsPayload: Record<string, any> = {
          projectId,
          deliveryAddress: pd.siteAddress || null,
          deliveryCity: pd.siteCity || null,
          deliveryState: pd.siteState || null,
          deliveryZip: pd.siteZip || null,
          deliveryCounty: pd.siteCounty || null,
          deliveryApn: pd.siteApn || null,
          totalUnits: pd.totalUnits || 1,
          agreementExecutionDate: pd.effectiveDate || null,
          estimatedDeliveryDate: pd.targetDeliveryDate || null,
          productionStartDate: pd.manufacturingStartDate || null,
          governingLawState: pd.projectState || pd.siteState || null,
          arbitrationLocation: pd.projectCounty ? `${pd.projectCounty}, ${pd.projectState}` : null,
          // Schedule durations
          designPhaseDays: pd.designPhaseDays || null,
          manufacturingDurationDays: pd.manufacturingDurationDays || null,
          onsiteDurationDays: pd.onsiteDurationDays || null,
          permittingDurationDays: pd.permittingDurationDays || null,
          estimatedCompletionDate: pd.estimatedCompletionDate || null,
          // Exhibit C.2 Responsibility Matrix
          responsibilityMatrix: pd.responsibilityMatrix?.length > 0 ? JSON.stringify(pd.responsibilityMatrix) : null,
          // Exhibit C.4 Interface Deadlines
          foundationReadyDays: pd.foundationReadyDays || null,
          utilityStubbedDays: pd.utilityStubbedDays || null,
          siteAccessReadyDays: pd.siteAccessReadyDays || null,
          permitsScheduledDays: pd.permitsScheduledDays || null,
          craneAccessReadyDays: pd.craneAccessReadyDays || null,
          // Exhibit D.1/D.2 Target Dates
          designKickoffDate: pd.designKickoffDate || null,
          schematicDesignDate: pd.schematicDesignDate || null,
          designDevelopmentDate: pd.designDevelopmentDate || null,
          permitSubmittalDate: pd.permitSubmittalDate || null,
          productionMidpointDate: pd.productionMidpointDate || null,
          productionCompleteDate: pd.productionCompleteDate || null,
        };
        // Add first unit details if available
        if (pd.units && pd.units.length > 0) {
          detailsPayload.homeModel = pd.units[0].model || null;
          detailsPayload.homeSqFt = pd.units[0].squareFootage || null;
          detailsPayload.homeBedrooms = pd.units[0].bedrooms || null;
          detailsPayload.homeBathrooms = pd.units[0].bathrooms || null;
        }
        await apiRequest('PATCH', `/api/projects/${projectId}/details`, detailsPayload);
        
        
        // Save manufacturer contractor (uses upsert on backend)
        if (pd.manufacturerName) {
          await apiRequest('POST', `/api/projects/${projectId}/contractors`, {
            projectId,
            contractorType: 'manufacturer',
            legalName: pd.manufacturerName,
            address: pd.manufacturerAddress || '',
            contractorEntityId: pd.manufacturerEntityId || null,
          });
        }
        
        // Save onsite contractor (uses upsert on backend)
        if (pd.onsiteContractorName) {
          await apiRequest('POST', `/api/projects/${projectId}/contractors`, {
            projectId,
            contractorType: 'onsite_general',
            legalName: pd.onsiteContractorName,
            address: pd.onsiteContractorAddress || '',
            contractorEntityId: pd.onsiteContractorEntityId || null,
          });
        }
        
        // Save warranty terms (uses upsert on backend)
        if (pd.warrantyFitFinishMonths || pd.warrantyBuildingEnvelopeMonths || pd.warrantyStructuralMonths) {
          await apiRequest('PATCH', `/api/projects/${projectId}/warranty-terms`, {
            warrantyFitFinishMonths: pd.warrantyFitFinishMonths || 12,
            warrantyBuildingEnvelopeMonths: pd.warrantyBuildingEnvelopeMonths || 24,
            warrantyStructuralMonths: pd.warrantyStructuralMonths || 120,
            warrantyStartDate: pd.warrantyStartDate || null,
            arbitrationProvider: pd.arbitrationProvider || 'JAMS',
          });
        }
        
        // Save LLC if creating new one
        const finalLlcName = pd.childLlcName || generateLLCName(pd.siteAddress || '', pd.projectName);
        if (pd.llcOption === 'new' && finalLlcName && pd.siteAddress) {
          const llcPayload = {
            name: finalLlcName,
            projectName: pd.projectName,
            projectAddress: pd.siteAddress,
            status: 'forming',
            stateOfFormation: US_STATES.find(s => s.value === pd.childLlcState)?.label || 'Delaware',
            einNumber: pd.childLlcEin || null,
            address: pd.siteAddress,
            city: pd.siteCity,
            state: pd.siteState,
            zip: pd.siteZip,
          };
          
          try {
            const llcResponse = await apiRequest('POST', '/api/llcs', llcPayload);
            if (llcResponse.ok) {
              const llcData = await llcResponse.json();
              await apiRequest('PATCH', `/api/projects/${projectId}`, { llcId: llcData.id });
            }
          } catch (e) {
            // LLC might already exist, ignore
          }
        }
        
        // Save to localStorage as backup
        localStorage.setItem('contractWizardDraft', JSON.stringify({
          projectData: wizardState.projectData,
          currentStep: wizardState.currentStep,
          completedSteps: Array.from(wizardState.completedSteps),
          draftProjectId: projectId,
        }));
        
        lastSavedDataRef.current = currentDataHash;
        
        // Silently invalidate queries in background
        queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
        queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      }
    } catch (error) {
      console.warn('Autosave failed:', error);
    } finally {
      isAutosavingRef.current = false;
      
      // If new data came in during save, schedule another save
      if (pendingSaveRef.current) {
        pendingSaveRef.current = false;
        setTimeout(() => performAutosave(), 500);
      }
    }
  }, [wizardState.projectData, wizardState.currentStep, wizardState.completedSteps, draftProjectId, queryClient]);

  // Debounced autosave on projectData changes
  useEffect(() => {
    // Clear existing timeout
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }
    
    // Set new debounced autosave (2 second delay)
    autosaveTimeoutRef.current = setTimeout(() => {
      performAutosave();
    }, 2000);
    
    // Cleanup on unmount
    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }
    };
  }, [wizardState.projectData, performAutosave]);

  // Fetch clause comparison data
  const { data: comparisonData, isLoading: comparisonLoading } = useQuery<ClauseComparison>({
    queryKey: ['/api/contracts/compare-service-models'],
    queryFn: async () => {
      const response = await fetch('/api/contracts/compare-service-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectData: { serviceModel: 'CRC' } }),
      });
      if (!response.ok) throw new Error('Failed to compare service models');
      return response.json();
    },
    enabled: showComparisonModal || wizardState.currentStep === 2,
    staleTime: 60000,
  });

  // Fetch existing LLCs for dropdown
  const { data: existingLlcs } = useQuery<LLCData[]>({
    queryKey: ['/api/llcs'],
    enabled: wizardState.currentStep === 3,
  });

  // Regenerate project number
  const regenerateProjectNumber = useCallback(async () => {
    const result = await refetchNextNumber();
    if (result.data?.projectNumber) {
      setWizardState(prev => ({
        ...prev,
        projectData: { ...prev.projectData, projectNumber: result.data.projectNumber },
        validationErrors: { ...prev.validationErrors, projectNumber: '' },
      }));
      setNumberIsUnique(true);
    }
  }, [refetchNextNumber]);

  // Update project data
  const updateProjectData = useCallback((updates: Partial<ProjectData>) => {
    setWizardState(prev => {
      const merged = { ...updates };
      if (merged.serviceModel && merged.serviceModel !== prev.projectData.serviceModel) {
        merged.responsibilityMatrix = getDefaultMatrix(merged.serviceModel);
      }
      return {
        ...prev,
        projectData: { ...prev.projectData, ...merged },
        validationErrors: {},
      };
    });
  }, []);

  // Update unit
  const updateUnit = useCallback((unitId: number, updates: Partial<UnitSpec>) => {
    setWizardState(prev => {
      const newUnits = prev.projectData.units.map(unit => 
        unit.id === unitId ? { ...unit, ...updates } : unit
      );
      return {
        ...prev,
        projectData: { ...prev.projectData, units: newUnits }
      };
    });
  }, []);

  // Add unit
  const addUnit = useCallback(() => {
    setWizardState(prev => {
      const maxId = Math.max(...prev.projectData.units.map(u => u.id), 0);
      const newUnit: UnitSpec = {
        id: maxId + 1,
        model: '',
        squareFootage: 1500,
        bedrooms: 3,
        bathrooms: 2,
        price: 0,
      };
      return {
        ...prev,
        projectData: { 
          ...prev.projectData, 
          units: [...prev.projectData.units, newUnit],
          totalUnits: prev.projectData.units.length + 1
        }
      };
    });
  }, []);

  // Remove unit
  const removeUnit = useCallback((unitId: number) => {
    setWizardState(prev => {
      const newUnits = prev.projectData.units.filter(unit => unit.id !== unitId);
      return {
        ...prev,
        projectData: { 
          ...prev.projectData, 
          units: newUnits,
          totalUnits: Math.max(1, newUnits.length)
        }
      };
    });
  }, []);

  // Set validation errors
  const setValidationErrors = useCallback((errors: Record<string, string>) => {
    setWizardState(prev => ({ ...prev, validationErrors: errors }));
  }, []);

  // Validate step  
  const validateStep = useCallback((stepNumber: number): { valid: boolean; errors: Record<string, string> } => {
    // Skip validation during shell testing phase
    if (SHELL_TESTING_MODE) {
      return { valid: true, errors: {} };
    }
    
    const errors: Record<string, string> = {};
    const data = wizardState.projectData;

    switch (stepNumber) {
      case 1:
        if (!data.projectNumber.trim()) {
          errors.projectNumber = 'Project number is required';
        } else if (!/^\d{4}-\d{3}$/.test(data.projectNumber)) {
          errors.projectNumber = 'Project number must be in format YYYY-### (e.g., 2026-001)';
        } else if (numberIsUnique === false) {
          errors.projectNumber = 'This project number already exists';
        }
        if (!data.projectName.trim()) {
          errors.projectName = 'Project name is required';
        } else if (data.projectName.trim().length < 3) {
          errors.projectName = 'Project name must be at least 3 characters';
        } else if (data.projectName.trim().length > 100) {
          errors.projectName = 'Project name must be 100 characters or less';
        }
        if (data.totalUnits < 1 || data.totalUnits > 50) {
          errors.totalUnits = 'Total units must be between 1 and 50';
        }
        if (!data.agreementDate) {
          errors.agreementDate = 'Agreement date is required';
        }
        // Site address validation (moved from Step 4)
        if (!data.siteAddress.trim()) errors.siteAddress = 'Site address is required';
        if (!data.siteCity.trim()) errors.siteCity = 'City is required';
        if (!data.siteState.trim()) errors.siteState = 'State is required';
        if (!data.siteZip.trim()) errors.siteZip = 'ZIP code is required';
        // Billing address validation (if different from site)
        if (data.billingAddressDifferent) {
          if (!data.billingAddress.trim()) errors.billingAddress = 'Billing address is required';
          if (!data.billingCity.trim()) errors.billingCity = 'Billing city is required';
          if (!data.billingState.trim()) errors.billingState = 'Billing state is required';
          if (!data.billingZip.trim()) errors.billingZip = 'Billing ZIP code is required';
        }
        break;
      case 2:
        if (!data.serviceModel) errors.serviceModel = 'Service model is required';
        break;
      case 3:
        if (!data.clientLegalName.trim()) errors.clientLegalName = 'Client legal name is required';
        if (data.clientLegalName.trim().length < 2) errors.clientLegalName = 'Client legal name must be at least 2 characters';
        if (!data.clientState) errors.clientState = 'Client state is required';
        if (!data.clientEntityType) errors.clientEntityType = 'Client entity type is required';
        if (data.llcOption === 'existing' && !data.selectedExistingLlcId) {
          errors.selectedExistingLlcId = 'Please select an existing LLC';
        }
        // Note: On-site contractor selection is optional on Step 3
        // Contractor details are captured when selecting from the entity list
        break;
      case 4:
        // Home Models validation (site address moved to Step 1)
        // Units are stored in the database - use dbUnitsCount
        if (dbUnitsCount < 1) {
          errors.units = 'At least one home model is required';
        }
        break;
      case 5:
        // Child LLC validation (moved from step 4 to step 5)
        // Use childLlcName or auto-generated name from project name/site address
        const llcName = data.childLlcName || generateLLCName(data.siteAddress || '', data.projectName);
        if (!llcName.trim()) errors.childLlcName = 'LLC name is required';
        break;
      case 6:
        if (!data.effectiveDate) errors.effectiveDate = 'Effective date is required';
        break;
      case 7:
        // Validate that pricing has been loaded from the pricing engine
        if (data.contractPrice <= 0) {
          errors.contractPrice = 'Pricing data is missing. Please go back to Step 4 and add units.';
        }
        // Validate milestone percentages sum to 95%
        const milestoneTotal = data.milestone1Percent + data.milestone2Percent + 
                              data.milestone3Percent + data.milestone4Percent + data.milestone5Percent;
        if (milestoneTotal !== 95) {
          errors.milestones = `Milestones must sum to 95% (currently ${milestoneTotal}%)`;
        }
        break;
      case 8:
        if (!data.effectiveDate) {
          errors.effectiveDate = 'Effective date is required';
        }
        if (data.estimatedCompletionUnit === 'weeks') {
          if (data.estimatedCompletionMonths < 1 || data.estimatedCompletionMonths > 104) {
            errors.estimatedCompletionMonths = 'Completion timeframe must be 1-104 weeks';
          }
        } else {
          if (data.estimatedCompletionMonths < 1 || data.estimatedCompletionMonths > 24) {
            errors.estimatedCompletionMonths = 'Completion timeframe must be 1-24 months';
          }
        }
        if (data.designPhaseDays < 30 || data.designPhaseDays > 180) {
          errors.designPhaseDays = 'Design phase must be 30-180 days';
        }
        if (data.manufacturingDurationDays < 60 || data.manufacturingDurationDays > 365) {
          errors.manufacturingDurationDays = 'Manufacturing must be 60-365 days';
        }
        if (data.onsiteDurationDays < 30 || data.onsiteDurationDays > 180) {
          errors.onsiteDurationDays = 'On-site must be 30-180 days';
        }
        if (data.warrantyFitFinishMonths < 12 || data.warrantyFitFinishMonths > 36) {
          errors.warrantyFitFinishMonths = 'Fit & finish warranty must be 12-36 months';
        }
        if (data.warrantyBuildingEnvelopeMonths < 24 || data.warrantyBuildingEnvelopeMonths > 120) {
          errors.warrantyBuildingEnvelopeMonths = 'Building envelope warranty must be 24-120 months';
        }
        if (data.warrantyStructuralMonths < 60 || data.warrantyStructuralMonths > 240) {
          errors.warrantyStructuralMonths = 'Structural warranty must be 60-240 months';
        }
        if (!data.siteState) {
          errors.siteState = 'Project state is required';
        }
        if (!data.projectCounty && !data.siteCounty) {
          errors.projectCounty = 'Project county is required';
        }
        if (!data.projectFederalDistrict) {
          errors.projectFederalDistrict = 'Federal judicial district is required';
        }
        if (!data.arbitrationProvider) {
          errors.arbitrationProvider = 'Arbitration provider is required';
        }
        break;
    }

    return { valid: Object.keys(errors).length === 0, errors };
  }, [wizardState.projectData, numberIsUnique]);

  // Next step
  const nextStep = useCallback(async () => {
    const { valid, errors } = validateStep(wizardState.currentStep);
    
    if (!valid) {
      setWizardState(prev => ({ ...prev, validationErrors: errors }));
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields before proceeding.",
        variant: "destructive",
      });
      return;
    }

    if (wizardState.currentStep === 1) {
      try {
        if (!draftProjectId) {
          await createDraftProjectMutation.mutateAsync({
            projectNumber: wizardState.projectData.projectNumber,
            name: wizardState.projectData.projectName,
            status: 'Draft',
            onSiteSelection: wizardState.projectData.serviceModel,
          });
        } else {
          await updateProjectMutation.mutateAsync({
            id: draftProjectId,
            projectNumber: wizardState.projectData.projectNumber,
            name: wizardState.projectData.projectName,
            onSiteSelection: wizardState.projectData.serviceModel,
          });
        }
      } catch (error) {
        console.error('Failed to save project:', error);
        toast({
          title: "Error",
          description: "Failed to save project. Please try again.",
          variant: "destructive",
        });
        return;
      }
    }

    setWizardState(prev => {
      const newCompletedSteps = new Set(Array.from(prev.completedSteps));
      newCompletedSteps.add(prev.currentStep);
      return {
        ...prev,
        currentStep: Math.min(prev.currentStep + 1, 9),
        completedSteps: newCompletedSteps,
        validationErrors: {},
      };
    });
  }, [wizardState.currentStep, wizardState.projectData, validateStep, toast, draftProjectId, createDraftProjectMutation, updateProjectMutation]);

  // Previous step - triggers autosave before navigating
  const prevStep = useCallback(() => {
    // Trigger immediate autosave before navigation
    performAutosave();
    
    setWizardState(prev => ({
      ...prev,
      currentStep: Math.max(prev.currentStep - 1, 1),
      validationErrors: {},
    }));
  }, [performAutosave]);

  // Go to step - triggers autosave before navigating
  const goToStep = useCallback((stepNumber: number) => {
    // In testing mode, allow navigation to any step
    const canNavigate = SHELL_TESTING_MODE || 
                       stepNumber < wizardState.currentStep || 
                       wizardState.completedSteps.has(stepNumber - 1) || 
                       stepNumber === 1;
    if (canNavigate) {
      // Trigger immediate autosave before navigation
      performAutosave();
      
      setWizardState(prev => ({
        ...prev,
        currentStep: stepNumber,
        validationErrors: {},
      }));
    }
  }, [wizardState.currentStep, wizardState.completedSteps, performAutosave]);

  // Save draft - persists to database
  const saveDraft = useCallback(async () => {
    try {
      const pd = wizardState.projectData;
      
      // Validate minimum required fields
      if (!pd.projectName?.trim()) {
        toast({
          title: "Cannot Save Draft",
          description: "Please enter a project name first.",
          variant: "destructive",
        });
        return;
      }
      
      // Generate unique project number for draft if not provided or if it might conflict
      const uniqueId = Math.random().toString(36).substring(2, 8).toUpperCase();
      const draftProjectNumber = pd.projectNumber 
        ? `${pd.projectNumber}-DRAFT-${uniqueId}` 
        : `DRAFT-${Date.now()}-${uniqueId}`;
      
      // Create project record
      const projectPayload = {
        projectNumber: draftProjectNumber,
        name: pd.projectName,
        status: 'Draft',
        state: pd.siteState || null,
        onSiteSelection: pd.serviceModel || 'CRC',
        contractType: pd.contractType || 'MASTER_EF',
        buyerType: pd.buyerType || 'end_customer',
        storageFeePerDay: pd.storageFeePerDay || 15000,
        storageFreedays: pd.storageFreedays || 14,
        adminFeePercent: pd.adminFeePercent || 10,
      };
      
      const projectResponse = await apiRequest('POST', '/api/projects', projectPayload);
      if (!projectResponse.ok) {
        const errorData = await projectResponse.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create project');
      }
      const project = await projectResponse.json();
      const projectId = project.id;
      
      // Save client information if provided
      if (pd.clientLegalName) {
        const clientPayload = {
          projectId,
          legalName: pd.clientLegalName,
          entityType: pd.clientEntityType,
          formationState: pd.clientState,
          address: pd.clientAddress,
          city: pd.clientCity,
          state: pd.clientState,
          zip: pd.clientZip,
          email: pd.clientEmail,
          phone: pd.clientPhone,
        };
        await apiRequest('POST', `/api/projects/${projectId}/client`, clientPayload);
      }
      
      // Save LLC information if provided
      const finalLlcName = pd.childLlcName || generateLLCName(pd.siteAddress || '', pd.projectName);
      if (pd.llcOption === 'new' && finalLlcName) {
        const llcPayload = {
          name: finalLlcName,
          projectName: pd.projectName,
          projectAddress: pd.siteAddress,
          status: 'forming',
          stateOfFormation: US_STATES.find(s => s.value === pd.childLlcState)?.label || 'Delaware',
          einNumber: pd.childLlcEin || null,
          address: pd.siteAddress,
          city: pd.siteCity,
          state: pd.siteState,
          zip: pd.siteZip,
        };
        
        try {
          const llcResponse = await apiRequest('POST', '/api/llcs', llcPayload);
          if (llcResponse.ok) {
            const llcData = await llcResponse.json();
            await apiRequest('PATCH', `/api/projects/${projectId}`, { llcId: llcData.id });
            queryClient.invalidateQueries({ queryKey: ['/api/llcs'] });
          }
        } catch (e) {
          console.warn('LLC creation warning:', e);
        }
      }
      
      // Save financial terms if any are provided
      const hasFinancials = pd.designFee || pd.preliminaryOffsiteCost || pd.deliveryInstallationPrice;
      if (hasFinancials) {
        const financialsPayload = {
          projectId,
          designFee: pd.designFee ? Math.round(pd.designFee * 100) : null,
          designRevisionRounds: pd.designRevisionRounds || 3,
          prelimOffsite: pd.preliminaryOffsiteCost ? Math.round(pd.preliminaryOffsiteCost * 100) : null,
          prelimContractPrice: pd.totalPreliminaryContractPrice ? Math.round(pd.totalPreliminaryContractPrice * 100) : null,
        };
        await apiRequest('POST', `/api/projects/${projectId}/financials`, financialsPayload);
      }
      
      // Save contractor information (manufacturer and onsite contractor)
      if (pd.manufacturerName) {
        const manufacturerPayload = {
          projectId,
          contractorType: 'manufacturer',
          legalName: pd.manufacturerName,
          address: pd.manufacturerAddress || '',
          contractorEntityId: pd.manufacturerEntityId || null,
        };
        await apiRequest('POST', `/api/projects/${projectId}/contractors`, manufacturerPayload);
      }
      
      if (pd.onsiteContractorName) {
        const onsitePayload = {
          projectId,
          contractorType: 'onsite_general',
          legalName: pd.onsiteContractorName,
          address: pd.onsiteContractorAddress || '',
          contractorEntityId: pd.onsiteContractorEntityId || null,
        };
        await apiRequest('POST', `/api/projects/${projectId}/contractors`, onsitePayload);
      }
      
      // Also save to localStorage for session recovery
      localStorage.setItem('contractWizardDraft', JSON.stringify({
        projectData: wizardState.projectData,
        currentStep: wizardState.currentStep,
        completedSteps: Array.from(wizardState.completedSteps),
      }));
      
      // Invalidate queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      
      toast({
        title: "Draft Saved",
        description: `Project "${pd.projectName}" has been saved as a draft.`,
      });
    } catch (error) {
      console.error('Failed to save draft:', error);
      toast({
        title: "Save Failed",
        description: "Could not save draft to database. Please try again.",
        variant: "destructive",
      });
    }
  }, [wizardState, toast, queryClient]);

  // Load draft
  const loadDraft = useCallback(() => {
    const saved = localStorage.getItem('contractWizardDraft');
    if (saved) {
      const parsed = JSON.parse(saved);
      setWizardState(prev => ({
        ...prev,
        projectData: parsed.projectData,
        currentStep: parsed.currentStep,
        completedSteps: new Set(parsed.completedSteps),
      }));
      
      // Restore draftProjectId if saved
      if (parsed.draftProjectId) {
        setDraftProjectId(parsed.draftProjectId);
      }
      
      // Update lastSavedDataRef to prevent immediate autosave
      lastSavedDataRef.current = JSON.stringify({
        projectName: parsed.projectData.projectName,
        projectNumber: parsed.projectData.projectNumber,
        serviceModel: parsed.projectData.serviceModel,
        clientLegalName: parsed.projectData.clientLegalName,
        clientEmail: parsed.projectData.clientEmail,
        siteAddress: parsed.projectData.siteAddress,
        siteCity: parsed.projectData.siteCity,
        siteState: parsed.projectData.siteState,
        designFee: parsed.projectData.designFee,
        preliminaryOffsiteCost: parsed.projectData.preliminaryOffsiteCost,
        effectiveDate: parsed.projectData.effectiveDate,
      });
      
      toast({
        title: "Draft Loaded",
        description: "Your previous progress has been restored.",
      });
    }
  }, [toast]);

  // Load test draft for faster testing
  const loadTestDraft = useCallback(() => {
    // Generate unique project number to avoid duplicates
    const uniqueProjectNumber = `TEST-${Date.now().toString(36).toUpperCase()}`;
    setWizardState(prev => ({
      ...prev,
      projectData: { ...prev.projectData, ...testDraftData, projectNumber: uniqueProjectNumber },
      currentStep: 9,
      completedSteps: new Set([1, 2, 3, 4, 5, 6, 7, 8]),
    }));
    toast({
      title: "Test Draft Loaded",
      description: "Pre-filled test data loaded. Now on Step 9.",
    });
  }, [toast]);

  // Toggle section
  const toggleSection = useCallback((section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  }, []);

  // Generate contracts
  const generateContracts = useCallback(async () => {
    setGenerationState('generating');
    setGenerationProgress(0);
    setCurrentGenerationStep(0);
    setGenerationError(null);
    
    const steps = [
      'Creating project record',
      'Saving client information',
      'Creating Child LLC',
      'Saving financial terms',
      'Generating contract documents',
      'Finalizing contract package'
    ];
    
    try {
      const pd = wizardState.projectData;
      
      // Step 0: Create or update project record
      setCurrentGenerationStep(0);
      setGenerationProgress(10);
      
      let projectId: number;
      
      // Check if we already have a draft project (from autosave)
      if (draftProjectId) {
        // Use existing draft project - just update it
        const projectPayload = {
          projectNumber: pd.projectNumber,
          name: pd.projectName,
          status: 'Draft',
          state: pd.siteState,
          onSiteSelection: pd.serviceModel || 'CRC',
          contractType: pd.contractType || 'MASTER_EF',
          buyerType: pd.buyerType || 'end_customer',
          storageFeePerDay: pd.storageFeePerDay || 15000,
          storageFreedays: pd.storageFreedays || 14,
          adminFeePercent: pd.adminFeePercent || 10,
        };
        
        const projectResponse = await apiRequest('PATCH', `/api/projects/${draftProjectId}`, projectPayload);
        if (!projectResponse.ok) {
          throw new Error('Failed to update project');
        }
        projectId = draftProjectId;
      } else {
        // Create new project
        const projectPayload = {
          projectNumber: pd.projectNumber,
          name: pd.projectName,
          status: 'Draft',
          state: pd.siteState,
          onSiteSelection: pd.serviceModel || 'CRC',
          contractType: pd.contractType || 'MASTER_EF',
          buyerType: pd.buyerType || 'end_customer',
          storageFeePerDay: pd.storageFeePerDay || 15000,
          storageFreedays: pd.storageFreedays || 14,
          adminFeePercent: pd.adminFeePercent || 10,
        };
        
        const projectResponse = await apiRequest('POST', '/api/projects', projectPayload);
        if (!projectResponse.ok) {
          throw new Error('Failed to create project');
        }
        const project = await projectResponse.json();
        projectId = project.id;
      }
      
      setGenerationProgress(20);
      
      // Step 1: Save client information
      setCurrentGenerationStep(1);
      
      const clientPayload = {
        projectId,
        legalName: pd.clientLegalName || 'Client',
        entityType: pd.clientEntityType,
        formationState: pd.clientState,
        address: pd.clientAddress,
        city: pd.clientCity,
        state: pd.clientState,
        zip: pd.clientZip,
        email: pd.clientEmail,
        phone: pd.clientPhone,
      };
      
      await apiRequest('POST', `/api/projects/${projectId}/client`, clientPayload);
      setGenerationProgress(35);
      
      // Step 2: Handle LLC (create new or use existing)
      setCurrentGenerationStep(2);
      let linkedLlcId: number | null = null;
      let llcName: string = '';
      
      if (pd.llcOption === 'existing' && pd.selectedExistingLlcId) {
        // Use existing LLC - link to project
        linkedLlcId = parseInt(pd.selectedExistingLlcId);
        llcName = 'existing LLC';
        
        // Update project with LLC link
        await apiRequest('PATCH', `/api/projects/${projectId}`, { llcId: linkedLlcId });
        
        // Also create child_llcs record using existing LLC's data for backwards compatibility
        // Fetch the existing LLC details first
        try {
          const llcDetailsResponse = await fetch(`/api/llcs/${linkedLlcId}`);
          if (llcDetailsResponse.ok) {
            const existingLlc = await llcDetailsResponse.json();
            // API returns snake_case - handle both snake_case and camelCase field names
            const childLlcPayload = {
              projectId,
              legalName: existingLlc.name,
              formationState: existingLlc.state_of_formation || existingLlc.stateOfFormation || 'Delaware',
              entityType: 'LLC',
              ein: existingLlc.ein_number || existingLlc.einNumber || null,
              address: existingLlc.address || pd.siteAddress,
              city: existingLlc.city || pd.siteCity,
              state: existingLlc.state || pd.siteState,
              zip: existingLlc.zip || pd.siteZip,
            };
            await apiRequest('POST', `/api/projects/${projectId}/child-llc`, childLlcPayload);
            llcName = existingLlc.name;
          } else {
            throw new Error('Failed to fetch LLC details');
          }
        } catch (e) {
          console.error('Child LLC creation from existing LLC failed:', e);
          // Continue with generation but warn user
          toast({
            title: "Warning",
            description: "LLC data may be incomplete. Please verify contract details.",
            variant: "destructive",
          });
        }
      } else if (pd.llcOption === 'new') {
        // Use provided name or auto-generate from site address / project name
        const finalLlcName = pd.childLlcName || generateLLCName(pd.siteAddress || '', pd.projectName);
        
        if (finalLlcName) {
          // Create new LLC in llcs table (for LLC Admin)
          const llcPayload = {
            name: finalLlcName,
            projectName: pd.projectName,
            projectAddress: pd.siteAddress,
            status: 'forming',
            stateOfFormation: US_STATES.find(s => s.value === pd.childLlcState)?.label || 'Delaware',
            einNumber: pd.childLlcEin || null,
            address: pd.siteAddress,
            city: pd.siteCity,
            state: pd.siteState,
            zip: pd.siteZip,
          };
          
          try {
            const llcResponse = await apiRequest('POST', '/api/llcs', llcPayload);
            if (llcResponse.ok) {
              const llcData = await llcResponse.json();
              linkedLlcId = llcData.id;
              llcName = finalLlcName;
              queryClient.invalidateQueries({ queryKey: ['/api/llcs'] });
              
              // Update project with LLC link
              await apiRequest('PATCH', `/api/projects/${projectId}`, { llcId: linkedLlcId });
            }
          } catch (e) {
            console.warn('LLC creation warning:', e);
          }
        }
      }
      setGenerationProgress(50);
      
      // Step 3: Save financial terms
      setCurrentGenerationStep(3);
      
      const financialsPayload = {
        projectId,
        designFee: pd.designFee ? Math.round(pd.designFee * 100) : null,
        designRevisionRounds: pd.designRevisionRounds,
        prelimOffsite: pd.preliminaryOffsiteCost ? Math.round(pd.preliminaryOffsiteCost * 100) : null,
      };
      
      await apiRequest('POST', `/api/projects/${projectId}/financials`, financialsPayload);
      setGenerationProgress(60);
      
      // Save project details (site/home specs)
      const projectDetailsPayload: Record<string, any> = {
        projectId,
        deliveryAddress: pd.siteAddress,
        deliveryCity: pd.siteCity,
        deliveryState: pd.siteState,
        deliveryZip: pd.siteZip,
        deliveryCounty: pd.siteCounty,
        deliveryApn: pd.siteApn,
        homeModel: pd.units[0]?.model || pd.homeModel,
        homeSqFt: pd.units[0]?.squareFootage || pd.homeSquareFootage,
        homeBedrooms: pd.units[0]?.bedrooms || pd.homeBedrooms,
        homeBathrooms: pd.units[0]?.bathrooms || pd.homeBathrooms,
        totalUnits: pd.totalUnits,
        agreementExecutionDate: pd.effectiveDate,
        estimatedDeliveryDate: pd.targetDeliveryDate,
        productionStartDate: pd.manufacturingStartDate,
        governingLawState: pd.projectState || pd.siteState,
        arbitrationLocation: pd.projectCounty ? `${pd.projectCounty}, ${pd.projectState}` : pd.arbitrationProvider,
        responsibilityMatrix: pd.responsibilityMatrix?.length > 0 ? JSON.stringify(pd.responsibilityMatrix) : null,
      };
      
      await apiRequest('PATCH', `/api/projects/${projectId}/details`, projectDetailsPayload);
      setGenerationProgress(65);
      
      // Save contractor information (manufacturer and onsite contractor)
      // Save manufacturer contractor
      if (pd.manufacturerName) {
        const manufacturerPayload = {
          projectId,
          contractorType: 'manufacturer',
          legalName: pd.manufacturerName,
          address: pd.manufacturerAddress || '',
          contractorEntityId: pd.manufacturerEntityId || null,
        };
        await apiRequest('POST', `/api/projects/${projectId}/contractors`, manufacturerPayload);
      }
      
      // Save onsite contractor
      if (pd.onsiteContractorName) {
        const onsitePayload = {
          projectId,
          contractorType: 'onsite_general',
          legalName: pd.onsiteContractorName,
          address: pd.onsiteContractorAddress || '',
          contractorEntityId: pd.onsiteContractorEntityId || null,
        };
        await apiRequest('POST', `/api/projects/${projectId}/contractors`, onsitePayload);
      }
      setGenerationProgress(70);
      
      // Step 4: Generate contract documents and save to database
      setCurrentGenerationStep(4);
      
      console.log('Contract Generation - contractType:', pd.contractType);
      
      const contractTypes: string[] = ['master_ef'];
      
      // Fetch available templates and map to contract types
      const templateMap: Record<string, number> = {};
      try {
        const templatesResponse = await fetch('/api/contract-templates');
        if (templatesResponse.ok) {
          const templates = await templatesResponse.json();
          // Build a map of contract_type -> template_id
          for (const t of templates) {
            if (t.contract_type && t.id) {
              templateMap[t.contract_type.toUpperCase()] = t.id;
              // Also map lowercase variants
              templateMap[t.contract_type.toLowerCase()] = t.id;
            }
          }
        }
      } catch (templateError) {
        console.warn('Could not fetch templates, using defaults:', templateError);
      }
      
      if (!templateMap['MASTER_EF']) templateMap['MASTER_EF'] = 26;
      templateMap['master_ef'] = templateMap['MASTER_EF'];
      
      const generatedContractsList: GeneratedContract[] = [];
      const timestamp = new Date().toISOString();
      
      for (const contractType of contractTypes) {
        // Get correct template based on contract type
        const templateId = templateMap[contractType] || templateMap['MASTER_EF'] || 26;
        
        const contractPayload = {
          projectId,
          contractType,
          templateId,
          status: 'Draft',
          generatedBy: 'wizard',
          templateVersion: '1.0',
          fileName: `${pd.projectName?.replace(/\s+/g, '_') || 'Project'}_${contractType}_${pd.projectNumber}.docx`,
        };
        
        const contractResponse = await apiRequest('POST', '/api/contracts', contractPayload);
        if (contractResponse.ok) {
          const contract = await contractResponse.json();
          generatedContractsList.push({
            id: String(contract.id),
            type: contractType,
            filename: contract.fileName || contract.file_name || contractPayload.fileName,
            downloadUrl: `/api/contracts/${contract.id}/download`,
            size: 200000,
            generatedAt: timestamp,
            clauseCount: contract.clauseCount || 0,
          });
        }
      }
      
      setGenerationProgress(90);
      
      // Step 5: Finalize
      setCurrentGenerationStep(5);
      setGenerationProgress(100);
      
      setGeneratedContracts(generatedContractsList);
      setGeneratedProjectId(String(projectId));
      setGenerationState('success');
      
      // Invalidate caches to refresh data across the app
      queryClient.invalidateQueries({ queryKey: ['/api/contracts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/llcs'] });
      
      const llcMessage = linkedLlcId 
        ? pd.llcOption === 'new' 
          ? ` Child LLC "${llcName}" was created.`
          : ` Linked to existing LLC.`
        : '';
      
      toast({
        title: "Contracts Generated Successfully",
        description: `Your contract package has been saved and is ready for review.${llcMessage}`,
      });
      
    } catch (error) {
      console.error('Contract generation error:', error);
      setGenerationError(error instanceof Error ? error.message : 'An unknown error occurred');
      setGenerationState('error');
      
      toast({
        title: "Generation Failed",
        description: "There was an error generating your contracts. Please try again.",
        variant: "destructive",
      });
    }
  }, [wizardState.projectData, toast, queryClient]);

  // Context value
  const contextValue: WizardContextType = {
    wizardState,
    draftProjectId,
    generationState,
    generationProgress,
    currentGenerationStep,
    generationError,
    generatedContracts,
    generatedProjectId,
    showComparisonModal,
    showClausePreview,
    confirmationChecked,
    expandedSections,
    isCheckingNumber,
    numberIsUnique,
    isLoadingNumber,
    isLoadingDraft,
    existingLlcs,
    comparisonData,
    comparisonLoading,
    updateProjectData,
    setValidationErrors,
    validateStep,
    nextStep,
    prevStep,
    goToStep,
    saveDraft,
    loadDraft,
    loadTestDraft,
    generateContracts,
    setShowComparisonModal,
    setShowClausePreview,
    setConfirmationChecked,
    toggleSection,
    setGenerationState,
    regenerateProjectNumber,
    checkProjectNumberUniqueness,
    updateUnit,
    addUnit,
    removeUnit,
    dbUnitsCount,
    setDbUnitsCount,
  };
  
  return (
    <WizardContext.Provider value={contextValue}>
      {children}
    </WizardContext.Provider>
  );
};

// Custom hook to use wizard context
export const useWizard = () => {
  const context = useContext(WizardContext);
  if (!context) {
    throw new Error('useWizard must be used within WizardProvider');
  }
  return context;
};
