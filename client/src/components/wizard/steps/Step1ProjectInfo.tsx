import { useState, useEffect, useRef } from 'react';
import { useWizard, US_STATES } from '../WizardContext';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle, RefreshCw, AlertTriangle, CheckCircle, Home, MapPin } from 'lucide-react';

interface ProjectUnit {
  id: number;
  projectId: number;
  modelId: number;
  unitLabel: string;
  basePriceSnapshot: number;
  customizationTotal: number;
  model: {
    id: number;
    name: string;
    modelCode: string;
    bedrooms: number;
    bathrooms: number;
    sqFt: number;
  };
}

export const Step1ProjectInfo: React.FC = () => {
  const { 
    wizardState, 
    updateProjectData,
    draftProjectId
  } = useWizard();
  
  const [projectNumberStatus, setProjectNumberStatus] = useState<'idle' | 'checking' | 'exists' | 'available'>('idle');
  const checkTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const { projectData, validationErrors } = wizardState;

  const { data: projectUnits = [] } = useQuery<ProjectUnit[]>({
    queryKey: ['/api/projects', draftProjectId, 'units'],
    enabled: !!draftProjectId,
  });

  useEffect(() => {
    if (projectUnits.length !== projectData.totalUnits) {
      updateProjectData({ totalUnits: projectUnits.length || 1 });
    }
  }, [projectUnits.length]);
  
  const generateProjectNumber = () => {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 900) + 100;
    return `${year}-${random}`;
  };
  
  useEffect(() => {
    const projectNumber = projectData.projectNumber;
    
    if (checkTimeoutRef.current) {
      clearTimeout(checkTimeoutRef.current);
    }
    
    if (!projectNumber || projectNumber.length < 4 || projectNumber.includes('DRAFT')) {
      setProjectNumberStatus('idle');
      return;
    }
    
    setProjectNumberStatus('checking');
    
    const numberToCheck = projectNumber;
    checkTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await fetch(`/api/projects/check-number/${encodeURIComponent(numberToCheck)}`);
        if (projectData.projectNumber !== numberToCheck) {
          return;
        }
        if (response.ok) {
          const data = await response.json();
          setProjectNumberStatus(data.exists ? 'exists' : 'available');
        } else {
          setProjectNumberStatus('idle');
        }
      } catch (error) {
        console.error('Failed to check project number:', error);
        setProjectNumberStatus('idle');
      }
    }, 500);
    
    return () => {
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current);
      }
    };
  }, [projectData.projectNumber]);
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Project Information</CardTitle>
          <CardDescription>
            Enter the basic details for your project
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="projectNumber" className="flex items-center gap-2">
              Project Number <span className="text-red-500">*</span>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Format: YYYY-### (e.g., 2025-042)</p>
                </TooltipContent>
              </Tooltip>
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="projectNumber"
                  value={projectData.projectNumber}
                  onChange={(e) => updateProjectData({ projectNumber: e.target.value })}
                  placeholder="2025-042"
                  className={`${validationErrors.projectNumber || projectNumberStatus === 'exists' ? 'border-red-500' : projectNumberStatus === 'available' ? 'border-green-500' : ''} pr-10`}
                  data-testid="input-project-number"
                />
                {projectNumberStatus === 'checking' && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                )}
                {projectNumberStatus === 'exists' && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  </div>
                )}
                {projectNumberStatus === 'available' && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </div>
                )}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => updateProjectData({ projectNumber: generateProjectNumber() })}
                data-testid="button-regenerate-number"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            {projectNumberStatus === 'exists' && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                This project number already exists. Please use a different number or resume the existing draft.
              </p>
            )}
            {projectNumberStatus === 'available' && (
              <p className="text-sm text-green-600 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Project number is available
              </p>
            )}
            {validationErrors.projectNumber && (
              <p className="text-sm text-red-500">{validationErrors.projectNumber}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="projectName" className="flex items-center gap-2">
              Project Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="projectName"
              value={projectData.projectName}
              onChange={(e) => updateProjectData({ projectName: e.target.value })}
              placeholder="e.g., Smith Residence"
              className={validationErrors.projectName ? 'border-red-500' : ''}
              data-testid="input-project-name"
            />
            {validationErrors.projectName && (
              <p className="text-sm text-red-500">{validationErrors.projectName}</p>
            )}
            <p className="text-xs text-muted-foreground">
              A descriptive name for the project
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="projectType" className="flex items-center gap-2">
              Project Type
            </Label>
            <Select 
              value={projectData.projectType || 'Single Family Residence'} 
              onValueChange={(value) => updateProjectData({ projectType: value })}
            >
              <SelectTrigger data-testid="select-project-type">
                <SelectValue placeholder="Select project type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Single Family Residence">Single Family Residence</SelectItem>
                <SelectItem value="Multi-Family Residence">Multi-Family Residence</SelectItem>
                <SelectItem value="Accessory Dwelling Unit (ADU)">Accessory Dwelling Unit (ADU)</SelectItem>
                <SelectItem value="Mixed Use">Mixed Use</SelectItem>
                <SelectItem value="Commercial">Commercial</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              The type of construction project
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="buyerType" className="flex items-center gap-2">
              Buyer Type
            </Label>
            <Select
              value={projectData.buyerType || 'end_customer'}
              onValueChange={(value) => updateProjectData({ buyerType: value as 'end_customer' | 'developer' })}
            >
              <SelectTrigger data-testid="select-buyer-type">
                <SelectValue placeholder="Select buyer type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="end_customer">End Customer</SelectItem>
                <SelectItem value="developer">Developer</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Determines contract language for the buyer classification
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="agreementDate" className="flex items-center gap-2">
              Agreement Execution Date <span className="text-red-500">*</span>
            </Label>
            <Input
              id="agreementDate"
              type="date"
              value={projectData.agreementDate}
              onChange={(e) => updateProjectData({ agreementDate: e.target.value })}
              className={validationErrors.agreementDate ? 'border-red-500' : ''}
              data-testid="input-agreement-date"
            />
            {validationErrors.agreementDate && (
              <p className="text-sm text-red-500">{validationErrors.agreementDate}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Date when the contract will be signed
            </p>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              Total Units
            </Label>
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="text-lg px-4 py-1" data-testid="badge-total-units">
                {draftProjectId ? projectUnits.length : (projectData.totalUnits || 0)}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {draftProjectId 
                  ? (projectUnits.length === 0 
                      ? 'Add units in the Home Models step'
                      : `${projectUnits.length} unit${projectUnits.length > 1 ? 's' : ''} configured`)
                  : 'Save project to add units'
                }
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Units are configured in Step 4 (Home Models)
            </p>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Site Address
          </CardTitle>
          <CardDescription>
            Property location for the modular home installation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="siteAddress">
              Street Address <span className="text-red-500">*</span>
            </Label>
            <Input
              id="siteAddress"
              value={projectData.siteAddress}
              onChange={(e) => updateProjectData({ siteAddress: e.target.value })}
              placeholder="e.g., 123 Main Street"
              className={validationErrors.siteAddress ? 'border-red-500' : ''}
              data-testid="input-site-address"
            />
            {validationErrors.siteAddress && (
              <p className="text-sm text-red-500">{validationErrors.siteAddress}</p>
            )}
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="siteCity">
                City <span className="text-red-500">*</span>
              </Label>
              <Input
                id="siteCity"
                value={projectData.siteCity}
                onChange={(e) => updateProjectData({ siteCity: e.target.value })}
                placeholder="City"
                className={validationErrors.siteCity ? 'border-red-500' : ''}
                data-testid="input-site-city"
              />
              {validationErrors.siteCity && (
                <p className="text-sm text-red-500">{validationErrors.siteCity}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="siteState">
                State <span className="text-red-500">*</span>
              </Label>
              <Select
                value={projectData.siteState}
                onValueChange={(value) => updateProjectData({ siteState: value })}
              >
                <SelectTrigger
                  id="siteState"
                  className={validationErrors.siteState ? 'border-red-500' : ''}
                  data-testid="select-site-state"
                >
                  <SelectValue placeholder="State" />
                </SelectTrigger>
                <SelectContent>
                  {US_STATES.map(state => (
                    <SelectItem key={state.value} value={state.value}>{state.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {validationErrors.siteState && (
                <p className="text-sm text-red-500">{validationErrors.siteState}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="siteZip">
                ZIP Code <span className="text-red-500">*</span>
              </Label>
              <Input
                id="siteZip"
                value={projectData.siteZip}
                onChange={(e) => updateProjectData({ siteZip: e.target.value })}
                placeholder="ZIP"
                className={validationErrors.siteZip ? 'border-red-500' : ''}
                data-testid="input-site-zip"
              />
              {validationErrors.siteZip && (
                <p className="text-sm text-red-500">{validationErrors.siteZip}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="siteCounty">
                County
              </Label>
              <Input
                id="siteCounty"
                value={projectData.siteCounty}
                onChange={(e) => updateProjectData({ siteCounty: e.target.value })}
                placeholder="County"
                data-testid="input-site-county"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="siteApn">
              APN (Assessor's Parcel Number)
            </Label>
            <Input
              id="siteApn"
              value={projectData.siteApn}
              onChange={(e) => updateProjectData({ siteApn: e.target.value })}
              placeholder="e.g., 123-456-789"
              data-testid="input-site-apn"
            />
            <p className="text-xs text-muted-foreground">
              Optional - helps identify the exact parcel
            </p>
          </div>
          
          <div className="flex items-center space-x-2 pt-2 border-t">
            <Checkbox
              id="billingAddressDifferent"
              checked={projectData.billingAddressDifferent}
              onCheckedChange={(checked) => updateProjectData({ billingAddressDifferent: !!checked })}
              data-testid="checkbox-billing-different"
            />
            <Label htmlFor="billingAddressDifferent" className="text-sm font-normal cursor-pointer">
              Billing address is different from site address
            </Label>
          </div>
          
          {projectData.billingAddressDifferent && (
            <div className="space-y-4 pt-4 border-t">
              <h4 className="font-medium text-sm">Client Billing Address</h4>
              <div className="space-y-2">
                <Label htmlFor="billingAddress">
                  Street Address <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="billingAddress"
                  value={projectData.billingAddress}
                  onChange={(e) => updateProjectData({ billingAddress: e.target.value })}
                  placeholder="e.g., 456 Oak Avenue"
                  className={validationErrors.billingAddress ? 'border-red-500' : ''}
                  data-testid="input-billing-address"
                />
                {validationErrors.billingAddress && (
                  <p className="text-sm text-red-500">{validationErrors.billingAddress}</p>
                )}
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="billingCity">
                    City <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="billingCity"
                    value={projectData.billingCity}
                    onChange={(e) => updateProjectData({ billingCity: e.target.value })}
                    placeholder="City"
                    className={validationErrors.billingCity ? 'border-red-500' : ''}
                    data-testid="input-billing-city"
                  />
                  {validationErrors.billingCity && (
                    <p className="text-sm text-red-500">{validationErrors.billingCity}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="billingState">
                    State <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={projectData.billingState}
                    onValueChange={(value) => updateProjectData({ billingState: value })}
                  >
                    <SelectTrigger
                      id="billingState"
                      className={validationErrors.billingState ? 'border-red-500' : ''}
                      data-testid="select-billing-state"
                    >
                      <SelectValue placeholder="State" />
                    </SelectTrigger>
                    <SelectContent>
                      {US_STATES.map(state => (
                        <SelectItem key={state.value} value={state.value}>{state.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {validationErrors.billingState && (
                    <p className="text-sm text-red-500">{validationErrors.billingState}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="billingZip">
                    ZIP Code <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="billingZip"
                    value={projectData.billingZip}
                    onChange={(e) => updateProjectData({ billingZip: e.target.value })}
                    placeholder="ZIP"
                    className={validationErrors.billingZip ? 'border-red-500' : ''}
                    data-testid="input-billing-zip"
                  />
                  {validationErrors.billingZip && (
                    <p className="text-sm text-red-500">{validationErrors.billingZip}</p>
                  )}
                </div>
              </div>
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
                This step populates 10+ contract variables
              </p>
            </div>
            <Badge variant="secondary" className="text-xs">
              PROJECT_NUMBER, PROJECT_NAME, BUYER_TYPE, SITE_ADDRESS, SITE_CITY, SITE_STATE...
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
