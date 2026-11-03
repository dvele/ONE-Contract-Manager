import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useWizard, US_STATES, ENTITY_TYPES } from '../WizardContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { UserCheck, Mail, Phone, Briefcase, Shield, AlertCircle, Factory, HardHat, Plus, Pencil, Building } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { billsOnsite, toDeliveryModel } from '@shared/deliveryModel';

interface ContractorEntity {
  id: number;
  contractorType: string;
  legalName: string;
  formationState?: string;
  entityType?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  licenseNumber?: string;
  licenseState?: string;
  licenseExpiration?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  bondAmount?: number;
  insuranceAmount?: number;
  insuranceExpiration?: string;
  insuranceCarrier?: string;
  isActive: boolean;
}

interface ContractorFormData {
  legalName: string;
  entityType: string;
  formationState: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  licenseNumber: string;
  licenseState: string;
  licenseExpiration: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  bondAmount: string;
  insuranceAmount: string;
  insuranceExpiration: string;
  insuranceCarrier: string;
}

const emptyContractorForm: ContractorFormData = {
  legalName: '',
  entityType: '',
  formationState: '',
  address: '',
  city: '',
  state: '',
  zip: '',
  licenseNumber: '',
  licenseState: '',
  licenseExpiration: '',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  bondAmount: '',
  insuranceAmount: '',
  insuranceExpiration: '',
  insuranceCarrier: '',
};

export const Step3PartyInfo: React.FC = () => {
  const { 
    wizardState, 
    updateProjectData
  } = useWizard();
  
  const { projectData, validationErrors } = wizardState;
  
  // Dvele GC projects use Dvele's GC Affiliate; every other model uses the Buyer's own GC.
  const gcHeading = billsOnsite(toDeliveryModel(projectData.serviceModel)) ? 'GC Affiliate' : "Buyer's General Contractor";
  
  // State for contractor dialogs
  const [showManufacturerDialog, setShowManufacturerDialog] = useState(false);
  const [showOnsiteDialog, setShowOnsiteDialog] = useState(false);
  const [contractorForm, setContractorForm] = useState<ContractorFormData>(emptyContractorForm);
  const [editingContractorId, setEditingContractorId] = useState<number | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Fetch manufacturer entities
  const { data: manufacturers = [] } = useQuery<ContractorEntity[]>({
    queryKey: ['/api/contractor-entities/type/manufacturer'],
  });
  
  // Fetch onsite contractor entities
  const { data: onsiteContractors = [] } = useQuery<ContractorEntity[]>({
    queryKey: ['/api/contractor-entities/type/onsite'],
  });
  
  // Create contractor entity mutation
  const createContractorMutation = useMutation({
    mutationFn: async (data: Partial<ContractorEntity> & { contractorType: string; legalName: string }) => {
      const response = await apiRequest('POST', '/api/contractor-entities', data);
      if (!response.ok) {
        throw new Error('Failed to create contractor entity');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contractor-entities'] });
      queryClient.invalidateQueries({ queryKey: ['/api/contractor-entities/type/manufacturer'] });
      queryClient.invalidateQueries({ queryKey: ['/api/contractor-entities/type/onsite'] });
    },
    onError: (error) => {
      console.error('Failed to create contractor entity:', error);
    }
  });
  
  // Update contractor entity mutation
  const updateContractorMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<ContractorEntity> }) => {
      const response = await apiRequest('PATCH', `/api/contractor-entities/${id}`, data);
      if (!response.ok) {
        throw new Error('Failed to update contractor entity');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contractor-entities'] });
      queryClient.invalidateQueries({ queryKey: ['/api/contractor-entities/type/manufacturer'] });
      queryClient.invalidateQueries({ queryKey: ['/api/contractor-entities/type/onsite'] });
    },
    onError: (error) => {
      console.error('Failed to update contractor entity:', error);
    }
  });
  
  // Helper to convert entity to form data
  const entityToFormData = (entity: ContractorEntity): ContractorFormData => ({
    legalName: entity.legalName || '',
    entityType: entity.entityType || '',
    formationState: entity.formationState || '',
    address: entity.address || '',
    city: entity.city || '',
    state: entity.state || '',
    zip: entity.zip || '',
    licenseNumber: entity.licenseNumber || '',
    licenseState: entity.licenseState || '',
    licenseExpiration: entity.licenseExpiration || '',
    contactName: entity.contactName || '',
    contactEmail: entity.contactEmail || '',
    contactPhone: entity.contactPhone || '',
    bondAmount: entity.bondAmount?.toString() || '',
    insuranceAmount: entity.insuranceAmount?.toString() || '',
    insuranceExpiration: entity.insuranceExpiration || '',
    insuranceCarrier: entity.insuranceCarrier || '',
  });
  
  // Helper to convert form data to entity payload
  const formDataToPayload = (form: ContractorFormData) => ({
    legalName: form.legalName,
    entityType: form.entityType || undefined,
    formationState: form.formationState || undefined,
    address: form.address || undefined,
    city: form.city || undefined,
    state: form.state || undefined,
    zip: form.zip || undefined,
    licenseNumber: form.licenseNumber || undefined,
    licenseState: form.licenseState || undefined,
    licenseExpiration: form.licenseExpiration || undefined,
    contactName: form.contactName || undefined,
    contactEmail: form.contactEmail || undefined,
    contactPhone: form.contactPhone || undefined,
    bondAmount: form.bondAmount ? parseInt(form.bondAmount) : undefined,
    insuranceAmount: form.insuranceAmount ? parseInt(form.insuranceAmount) : undefined,
    insuranceExpiration: form.insuranceExpiration || undefined,
    insuranceCarrier: form.insuranceCarrier || undefined,
  });
  
  // Handle manufacturer selection
  const handleManufacturerChange = (value: string) => {
    if (value === 'add-new') {
      setContractorForm(emptyContractorForm);
      setEditingContractorId(null);
      setIsEditMode(false);
      setShowManufacturerDialog(true);
      return;
    }
    const selected = manufacturers.find(m => m.id.toString() === value);
    if (selected) {
      updateProjectData({
        manufacturerEntityId: selected.id,
        manufacturerName: selected.legalName,
        manufacturerAddress: selected.address || ''
      });
    }
  };
  
  // Handle onsite contractor selection
  const handleOnsiteChange = (value: string) => {
    if (value === 'add-new') {
      setContractorForm(emptyContractorForm);
      setEditingContractorId(null);
      setIsEditMode(false);
      setShowOnsiteDialog(true);
      return;
    }
    const selected = onsiteContractors.find(c => c.id.toString() === value);
    if (selected) {
      updateProjectData({
        onsiteContractorEntityId: selected.id,
        onsiteContractorName: selected.legalName,
        onsiteContractorAddress: selected.address || ''
      });
    }
  };
  
  // Open edit dialog for manufacturer
  const handleEditManufacturer = () => {
    const entity = manufacturers.find(m => m.id === projectData.manufacturerEntityId);
    if (entity) {
      setContractorForm(entityToFormData(entity));
      setEditingContractorId(entity.id);
      setIsEditMode(true);
      setShowManufacturerDialog(true);
    }
  };
  
  // Open edit dialog for onsite contractor
  const handleEditOnsite = () => {
    const entity = onsiteContractors.find(c => c.id === projectData.onsiteContractorEntityId);
    if (entity) {
      setContractorForm(entityToFormData(entity));
      setEditingContractorId(entity.id);
      setIsEditMode(true);
      setShowOnsiteDialog(true);
    }
  };
  
  // Save manufacturer (create or update)
  const handleSaveManufacturer = async () => {
    try {
      if (isEditMode && editingContractorId) {
        const result = await updateContractorMutation.mutateAsync({
          id: editingContractorId,
          data: formDataToPayload(contractorForm)
        });
        updateProjectData({
          manufacturerName: result.legalName,
          manufacturerAddress: result.address || ''
        });
      } else {
        const result = await createContractorMutation.mutateAsync({
          contractorType: 'manufacturer',
          ...formDataToPayload(contractorForm)
        });
        updateProjectData({
          manufacturerEntityId: result.id,
          manufacturerName: result.legalName,
          manufacturerAddress: result.address || ''
        });
      }
      setShowManufacturerDialog(false);
      setContractorForm(emptyContractorForm);
      setEditingContractorId(null);
      setIsEditMode(false);
    } catch (error) {
      console.error('Failed to save manufacturer:', error);
    }
  };
  
  // Save onsite contractor (create or update)
  const handleSaveOnsite = async () => {
    try {
      if (isEditMode && editingContractorId) {
        const result = await updateContractorMutation.mutateAsync({
          id: editingContractorId,
          data: formDataToPayload(contractorForm)
        });
        updateProjectData({
          onsiteContractorName: result.legalName,
          onsiteContractorAddress: result.address || ''
        });
      } else {
        const result = await createContractorMutation.mutateAsync({
          contractorType: 'onsite',
          ...formDataToPayload(contractorForm)
        });
        updateProjectData({
          onsiteContractorEntityId: result.id,
          onsiteContractorName: result.legalName,
          onsiteContractorAddress: result.address || ''
        });
      }
      setShowOnsiteDialog(false);
      setContractorForm(emptyContractorForm);
      setEditingContractorId(null);
      setIsEditMode(false);
    } catch (error) {
      console.error('Failed to save onsite contractor:', error);
    }
  };
  
  // Update form field
  const updateFormField = (field: keyof ContractorFormData, value: string) => {
    setContractorForm(prev => ({ ...prev, [field]: value }));
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" />
            Client Information
          </CardTitle>
          <CardDescription>
            Enter details about the client purchasing the home
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="clientLegalName">
              Client Legal Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="clientLegalName"
              value={projectData.clientLegalName}
              onChange={(e) => updateProjectData({ clientLegalName: e.target.value })}
              placeholder="e.g., John and Jane Smith"
              className={validationErrors.clientLegalName ? 'border-red-500' : ''}
              data-testid="input-client-legal-name"
            />
            {validationErrors.clientLegalName && (
              <p className="text-sm text-red-500">{validationErrors.clientLegalName}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Full legal name(s) as they should appear on the contract
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="clientState">
                Client State <span className="text-red-500">*</span>
              </Label>
              <Select
                value={projectData.clientState}
                onValueChange={(value) => updateProjectData({ clientState: value })}
              >
                <SelectTrigger
                  id="clientState"
                  className={validationErrors.clientState ? 'border-red-500' : ''}
                  data-testid="select-client-state"
                >
                  <SelectValue placeholder="Select a state..." />
                </SelectTrigger>
                <SelectContent>
                  {US_STATES.map(state => (
                    <SelectItem key={state.value} value={state.value}>{state.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {validationErrors.clientState && (
                <p className="text-sm text-red-500">{validationErrors.clientState}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="clientEntityType">
                Client Entity Type <span className="text-red-500">*</span>
              </Label>
              <Select
                value={projectData.clientEntityType}
                onValueChange={(value) => updateProjectData({ clientEntityType: value })}
              >
                <SelectTrigger
                  id="clientEntityType"
                  className={validationErrors.clientEntityType ? 'border-red-500' : ''}
                  data-testid="select-client-entity-type"
                >
                  <SelectValue placeholder="Select entity type..." />
                </SelectTrigger>
                <SelectContent>
                  {ENTITY_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {validationErrors.clientEntityType && (
                <p className="text-sm text-red-500">{validationErrors.clientEntityType}</p>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="clientEmail" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Client Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="clientEmail"
                type="email"
                value={projectData.clientEmail}
                onChange={(e) => updateProjectData({ clientEmail: e.target.value })}
                placeholder="e.g., client@example.com"
                className={validationErrors.clientEmail ? 'border-red-500' : ''}
                data-testid="input-client-email"
              />
              {validationErrors.clientEmail && (
                <p className="text-sm text-red-500">{validationErrors.clientEmail}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="clientPhone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Client Phone
              </Label>
              <Input
                id="clientPhone"
                type="tel"
                value={projectData.clientPhone}
                onChange={(e) => updateProjectData({ clientPhone: e.target.value })}
                placeholder="e.g., (555) 123-4567"
                data-testid="input-client-phone"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="clientSignerName">
              Client Signer Name (for signature) <span className="text-red-500">*</span>
            </Label>
            <Input
              id="clientSignerName"
              value={projectData.clientSignerName}
              onChange={(e) => updateProjectData({ clientSignerName: e.target.value })}
              placeholder="Full name of person signing the contract"
              className={validationErrors.clientSignerName ? 'border-red-500' : ''}
              data-testid="input-client-signer-name"
            />
            {validationErrors.clientSignerName && (
              <p className="text-sm text-red-500">{validationErrors.clientSignerName}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Used for: CLIENT_SIGNER_NAME variable
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="clientFullName">
              Client Full Name (for documents)
            </Label>
            <Input
              id="clientFullName"
              value={projectData.clientFullName}
              onChange={(e) => updateProjectData({ clientFullName: e.target.value })}
              placeholder="Defaults to Client Legal Name"
              data-testid="input-client-full-name"
            />
            <p className="text-xs text-muted-foreground">
              Used for: CLIENT_FULL_NAME variable (leave blank to use Legal Name)
            </p>
          </div>
          
          {projectData.clientEntityType !== 'Individual' && (
            <div className="space-y-2">
              <Label htmlFor="clientTitle">
                Client Title
              </Label>
              <Input
                id="clientTitle"
                value={projectData.clientSignerTitle}
                onChange={(e) => updateProjectData({ clientSignerTitle: e.target.value })}
                placeholder={
                  projectData.clientEntityType === 'LLC' ? 'e.g., Managing Member' : 
                  projectData.clientEntityType === 'Corporation' ? 'e.g., President, CEO' :
                  projectData.clientEntityType === 'Trust' ? 'e.g., Trustee' : 
                  'e.g., Partner'
                }
                data-testid="input-client-title"
              />
              <p className="text-xs text-muted-foreground">
                Used for: CLIENT_TITLE variable
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      
      
      {/* Manufacturer Selection - Always shown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Factory className="h-5 w-5 text-primary" />
            Manufacturer
            <Badge variant="outline" className="ml-2">Subcontract</Badge>
          </CardTitle>
          <CardDescription>
            Select the manufacturing company for the modular home production
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="manufacturerSelect">
              Manufacturer <span className="text-red-500">*</span>
            </Label>
            <Select
              value={projectData.manufacturerEntityId?.toString() || ''}
              onValueChange={handleManufacturerChange}
            >
              <SelectTrigger
                id="manufacturerSelect"
                className={validationErrors.manufacturerName ? 'border-red-500' : ''}
                data-testid="select-manufacturer"
              >
                <SelectValue placeholder="Select a manufacturer..." />
              </SelectTrigger>
              <SelectContent>
                {manufacturers.map(m => (
                  <SelectItem key={m.id} value={m.id.toString()}>
                    {m.legalName}
                    {m.formationState && <span className="text-muted-foreground ml-2">({m.formationState})</span>}
                  </SelectItem>
                ))}
                <SelectItem value="add-new" className="text-primary font-medium">
                  <span className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add New Manufacturer
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
            {validationErrors.manufacturerName && (
              <p className="text-sm text-red-500">{validationErrors.manufacturerName}</p>
            )}
          </div>
          
          {projectData.manufacturerName && (
            <div className="p-3 bg-muted/50 rounded-md flex items-start justify-between gap-2">
              <div className="space-y-1">
                <p className="text-sm font-medium">{projectData.manufacturerName}</p>
                {projectData.manufacturerAddress && (
                  <p className="text-xs text-muted-foreground">{projectData.manufacturerAddress}</p>
                )}
                {(() => {
                  const entity = manufacturers.find(m => m.id === projectData.manufacturerEntityId);
                  if (entity?.insuranceAmount || entity?.insuranceCarrier) {
                    return (
                      <div className="flex items-center gap-2 mt-1">
                        <Shield className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {entity.insuranceCarrier || 'Insurance'}: ${entity.insuranceAmount?.toLocaleString() || 'N/A'}
                          {entity.insuranceExpiration && ` (exp: ${entity.insuranceExpiration})`}
                        </span>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleEditManufacturer}
                data-testid="button-edit-manufacturer"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* On-Site Contractor Selection - Always shown (GC Affiliate for Dvele GC, Buyer's GC otherwise) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardHat className="h-5 w-5 text-primary" />
            {gcHeading}
            <Badge variant="outline" className="ml-2">Subcontract</Badge>
          </CardTitle>
          <CardDescription>
            Select the {gcHeading} for the on-site work (leave empty to add later)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="onsiteSelect">
              {gcHeading}
            </Label>
            <Select
              value={projectData.onsiteContractorEntityId?.toString() || ''}
              onValueChange={handleOnsiteChange}
            >
              <SelectTrigger
                id="onsiteSelect"
                data-testid="select-onsite-contractor"
              >
                <SelectValue placeholder={`Select ${gcHeading}...`} />
              </SelectTrigger>
              <SelectContent>
                {onsiteContractors.map(c => (
                  <SelectItem key={c.id} value={c.id.toString()}>
                    {c.legalName}
                    {c.formationState && <span className="text-muted-foreground ml-2">({c.formationState})</span>}
                  </SelectItem>
                ))}
                <SelectItem value="add-new" className="text-primary font-medium">
                  <span className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add New {gcHeading}
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {projectData.onsiteContractorName && (
            <div className="p-3 bg-muted/50 rounded-md flex items-start justify-between gap-2">
              <div className="space-y-1">
                <p className="text-sm font-medium">{projectData.onsiteContractorName}</p>
                {projectData.onsiteContractorAddress && (
                  <p className="text-xs text-muted-foreground">{projectData.onsiteContractorAddress}</p>
                )}
                {(() => {
                  const entity = onsiteContractors.find(c => c.id === projectData.onsiteContractorEntityId);
                  if (entity?.insuranceAmount || entity?.insuranceCarrier) {
                    return (
                      <div className="flex items-center gap-2 mt-1">
                        <Shield className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {entity.insuranceCarrier || 'Insurance'}: ${entity.insuranceAmount?.toLocaleString() || 'N/A'}
                          {entity.insuranceExpiration && ` (exp: ${entity.insuranceExpiration})`}
                        </span>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleEditOnsite}
                data-testid="button-edit-onsite-contractor"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      
      <Card className="bg-muted/30">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Contract Variables</p>
              <p className="text-xs text-muted-foreground">
                This step populates {billsOnsite(toDeliveryModel(projectData.serviceModel)) ? '10+' : '12+'} contract variables
              </p>
            </div>
            <Badge variant="secondary" className="text-xs">
              CLIENT_LEGAL_NAME, MANUFACTURER_NAME, ONSITE_CONTRACTOR_NAME, etc.
            </Badge>
          </div>
        </CardContent>
      </Card>
      
      {/* Manufacturer Dialog */}
      <Dialog open={showManufacturerDialog} onOpenChange={setShowManufacturerDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{isEditMode ? 'Edit Manufacturer' : 'Add New Manufacturer'}</DialogTitle>
            <DialogDescription>
              {isEditMode ? 'Update manufacturer details' : 'Create a new manufacturer entity for subcontracts'}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="licensing">Licensing</TabsTrigger>
                <TabsTrigger value="insurance">Insurance</TabsTrigger>
              </TabsList>
              <TabsContent value="basic" className="space-y-4 p-1">
                <div className="space-y-2">
                  <Label>Legal Name <span className="text-red-500">*</span></Label>
                  <Input
                    value={contractorForm.legalName}
                    onChange={(e) => updateFormField('legalName', e.target.value)}
                    placeholder="e.g., ABC Manufacturing, LLC"
                    data-testid="input-contractor-legal-name"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Entity Type</Label>
                    <Select value={contractorForm.entityType} onValueChange={(v) => updateFormField('entityType', v)}>
                      <SelectTrigger data-testid="select-contractor-entity-type">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {ENTITY_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Formation State</Label>
                    <Select value={contractorForm.formationState} onValueChange={(v) => updateFormField('formationState', v)}>
                      <SelectTrigger data-testid="select-contractor-formation-state">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {US_STATES.map(state => (
                          <SelectItem key={state.value} value={state.value}>{state.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Street Address</Label>
                  <Input
                    value={contractorForm.address}
                    onChange={(e) => updateFormField('address', e.target.value)}
                    placeholder="e.g., 123 Factory Dr"
                    data-testid="input-contractor-address"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>City</Label>
                    <Input
                      value={contractorForm.city}
                      onChange={(e) => updateFormField('city', e.target.value)}
                      placeholder="City"
                      data-testid="input-contractor-city"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>State</Label>
                    <Select value={contractorForm.state} onValueChange={(v) => updateFormField('state', v)}>
                      <SelectTrigger data-testid="select-contractor-state">
                        <SelectValue placeholder="State" />
                      </SelectTrigger>
                      <SelectContent>
                        {US_STATES.map(state => (
                          <SelectItem key={state.value} value={state.value}>{state.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>ZIP</Label>
                    <Input
                      value={contractorForm.zip}
                      onChange={(e) => updateFormField('zip', e.target.value)}
                      placeholder="ZIP"
                      data-testid="input-contractor-zip"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Contact Name</Label>
                    <Input
                      value={contractorForm.contactName}
                      onChange={(e) => updateFormField('contactName', e.target.value)}
                      placeholder="Contact name"
                      data-testid="input-contractor-contact-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Contact Email</Label>
                    <Input
                      type="email"
                      value={contractorForm.contactEmail}
                      onChange={(e) => updateFormField('contactEmail', e.target.value)}
                      placeholder="Email"
                      data-testid="input-contractor-contact-email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Contact Phone</Label>
                    <Input
                      type="tel"
                      value={contractorForm.contactPhone}
                      onChange={(e) => updateFormField('contactPhone', e.target.value)}
                      placeholder="Phone"
                      data-testid="input-contractor-contact-phone"
                    />
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="licensing" className="space-y-4 p-1">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>License Number</Label>
                    <Input
                      value={contractorForm.licenseNumber}
                      onChange={(e) => updateFormField('licenseNumber', e.target.value)}
                      placeholder="e.g., MFG-12345"
                      data-testid="input-contractor-license-number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>License State</Label>
                    <Select value={contractorForm.licenseState} onValueChange={(v) => updateFormField('licenseState', v)}>
                      <SelectTrigger data-testid="select-contractor-license-state">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {US_STATES.map(state => (
                          <SelectItem key={state.value} value={state.value}>{state.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>License Expiration</Label>
                  <Input
                    type="date"
                    value={contractorForm.licenseExpiration}
                    onChange={(e) => updateFormField('licenseExpiration', e.target.value)}
                    data-testid="input-contractor-license-expiration"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Bond Amount ($)</Label>
                  <Input
                    type="number"
                    value={contractorForm.bondAmount}
                    onChange={(e) => updateFormField('bondAmount', e.target.value)}
                    placeholder="e.g., 500000"
                    data-testid="input-contractor-bond-amount"
                  />
                </div>
              </TabsContent>
              <TabsContent value="insurance" className="space-y-4 p-1">
                <div className="space-y-2">
                  <Label>Insurance Carrier</Label>
                  <Input
                    value={contractorForm.insuranceCarrier}
                    onChange={(e) => updateFormField('insuranceCarrier', e.target.value)}
                    placeholder="e.g., State Farm, Liberty Mutual"
                    data-testid="input-contractor-insurance-carrier"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Insurance Amount ($)</Label>
                    <Input
                      type="number"
                      value={contractorForm.insuranceAmount}
                      onChange={(e) => updateFormField('insuranceAmount', e.target.value)}
                      placeholder="e.g., 1000000"
                      data-testid="input-contractor-insurance-amount"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Insurance Expiration</Label>
                    <Input
                      type="date"
                      value={contractorForm.insuranceExpiration}
                      onChange={(e) => updateFormField('insuranceExpiration', e.target.value)}
                      data-testid="input-contractor-insurance-expiration"
                    />
                  </div>
                </div>
                <div className="p-3 bg-muted/50 rounded-md">
                  <p className="text-xs text-muted-foreground">
                    Insurance information is used in the Manufacturing Sub and On-Site Sub contracts.
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowManufacturerDialog(false)}>Cancel</Button>
            <Button 
              onClick={handleSaveManufacturer} 
              disabled={!contractorForm.legalName || createContractorMutation.isPending || updateContractorMutation.isPending}
              data-testid="button-save-manufacturer"
            >
              {(createContractorMutation.isPending || updateContractorMutation.isPending) ? 'Saving...' : (isEditMode ? 'Update' : 'Save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* On-Site Contractor Dialog */}
      <Dialog open={showOnsiteDialog} onOpenChange={setShowOnsiteDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{isEditMode ? `Edit ${gcHeading}` : `Add New ${gcHeading}`}</DialogTitle>
            <DialogDescription>
              {isEditMode ? 'Update contractor details' : 'Create a new on-site contractor entity for subcontracts'}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="licensing">Licensing</TabsTrigger>
                <TabsTrigger value="insurance">Insurance</TabsTrigger>
              </TabsList>
              <TabsContent value="basic" className="space-y-4 p-1">
                <div className="space-y-2">
                  <Label>Legal Name <span className="text-red-500">*</span></Label>
                  <Input
                    value={contractorForm.legalName}
                    onChange={(e) => updateFormField('legalName', e.target.value)}
                    placeholder="e.g., XYZ Construction, Inc."
                    data-testid="input-onsite-legal-name"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Entity Type</Label>
                    <Select value={contractorForm.entityType} onValueChange={(v) => updateFormField('entityType', v)}>
                      <SelectTrigger data-testid="select-onsite-entity-type">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {ENTITY_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Formation State</Label>
                    <Select value={contractorForm.formationState} onValueChange={(v) => updateFormField('formationState', v)}>
                      <SelectTrigger data-testid="select-onsite-formation-state">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {US_STATES.map(state => (
                          <SelectItem key={state.value} value={state.value}>{state.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Street Address</Label>
                  <Input
                    value={contractorForm.address}
                    onChange={(e) => updateFormField('address', e.target.value)}
                    placeholder="e.g., 456 Builder Blvd"
                    data-testid="input-onsite-address"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>City</Label>
                    <Input
                      value={contractorForm.city}
                      onChange={(e) => updateFormField('city', e.target.value)}
                      placeholder="City"
                      data-testid="input-onsite-city"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>State</Label>
                    <Select value={contractorForm.state} onValueChange={(v) => updateFormField('state', v)}>
                      <SelectTrigger data-testid="select-onsite-state">
                        <SelectValue placeholder="State" />
                      </SelectTrigger>
                      <SelectContent>
                        {US_STATES.map(state => (
                          <SelectItem key={state.value} value={state.value}>{state.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>ZIP</Label>
                    <Input
                      value={contractorForm.zip}
                      onChange={(e) => updateFormField('zip', e.target.value)}
                      placeholder="ZIP"
                      data-testid="input-onsite-zip"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Contact Name</Label>
                    <Input
                      value={contractorForm.contactName}
                      onChange={(e) => updateFormField('contactName', e.target.value)}
                      placeholder="Contact name"
                      data-testid="input-onsite-contact-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Contact Email</Label>
                    <Input
                      type="email"
                      value={contractorForm.contactEmail}
                      onChange={(e) => updateFormField('contactEmail', e.target.value)}
                      placeholder="Email"
                      data-testid="input-onsite-contact-email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Contact Phone</Label>
                    <Input
                      type="tel"
                      value={contractorForm.contactPhone}
                      onChange={(e) => updateFormField('contactPhone', e.target.value)}
                      placeholder="Phone"
                      data-testid="input-onsite-contact-phone"
                    />
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="licensing" className="space-y-4 p-1">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>License Number</Label>
                    <Input
                      value={contractorForm.licenseNumber}
                      onChange={(e) => updateFormField('licenseNumber', e.target.value)}
                      placeholder="e.g., CSLB-67890"
                      data-testid="input-onsite-license-number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>License State</Label>
                    <Select value={contractorForm.licenseState} onValueChange={(v) => updateFormField('licenseState', v)}>
                      <SelectTrigger data-testid="select-onsite-license-state">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {US_STATES.map(state => (
                          <SelectItem key={state.value} value={state.value}>{state.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>License Expiration</Label>
                  <Input
                    type="date"
                    value={contractorForm.licenseExpiration}
                    onChange={(e) => updateFormField('licenseExpiration', e.target.value)}
                    data-testid="input-onsite-license-expiration"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Bond Amount ($)</Label>
                  <Input
                    type="number"
                    value={contractorForm.bondAmount}
                    onChange={(e) => updateFormField('bondAmount', e.target.value)}
                    placeholder="e.g., 500000"
                    data-testid="input-onsite-bond-amount"
                  />
                </div>
              </TabsContent>
              <TabsContent value="insurance" className="space-y-4 p-1">
                <div className="space-y-2">
                  <Label>Insurance Carrier</Label>
                  <Input
                    value={contractorForm.insuranceCarrier}
                    onChange={(e) => updateFormField('insuranceCarrier', e.target.value)}
                    placeholder="e.g., State Farm, Liberty Mutual"
                    data-testid="input-onsite-insurance-carrier"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Insurance Amount ($)</Label>
                    <Input
                      type="number"
                      value={contractorForm.insuranceAmount}
                      onChange={(e) => updateFormField('insuranceAmount', e.target.value)}
                      placeholder="e.g., 1000000"
                      data-testid="input-onsite-insurance-amount"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Insurance Expiration</Label>
                    <Input
                      type="date"
                      value={contractorForm.insuranceExpiration}
                      onChange={(e) => updateFormField('insuranceExpiration', e.target.value)}
                      data-testid="input-onsite-insurance-expiration"
                    />
                  </div>
                </div>
                <div className="p-3 bg-muted/50 rounded-md">
                  <p className="text-xs text-muted-foreground">
                    Insurance information is used in the Manufacturing Sub and On-Site Sub contracts.
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOnsiteDialog(false)}>Cancel</Button>
            <Button 
              onClick={handleSaveOnsite} 
              disabled={!contractorForm.legalName || createContractorMutation.isPending || updateContractorMutation.isPending}
              data-testid="button-save-onsite"
            >
              {(createContractorMutation.isPending || updateContractorMutation.isPending) ? 'Saving...' : (isEditMode ? 'Update' : 'Save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
