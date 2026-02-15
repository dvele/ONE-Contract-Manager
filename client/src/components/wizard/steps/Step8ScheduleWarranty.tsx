import { useEffect, useMemo, useState } from 'react';
import { useWizard, FEDERAL_DISTRICTS, US_STATES } from '../WizardContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Shield, Scale, Calendar, Clock, Info } from 'lucide-react';
import { ResponsibilityMatrix } from '../ResponsibilityMatrix';

export const Step8ScheduleWarranty: React.FC = () => {
  const { 
    wizardState, 
    updateProjectData
  } = useWizard();
  
  const { projectData, validationErrors } = wizardState;
  
  // Use projectData field to persist override preference
  const overrideJurisdiction = projectData.overrideJurisdiction || false;
  const setOverrideJurisdiction = (checked: boolean) => {
    updateProjectData({ overrideJurisdiction: checked });
  };
  
  // Initialize default values on mount to ensure validation passes
  useEffect(() => {
    const updates: Partial<typeof projectData> = {};
    
    // Default warranty periods if not set
    if (!projectData.warrantyFitFinishMonths) {
      updates.warrantyFitFinishMonths = 24;
    }
    if (!projectData.warrantyBuildingEnvelopeMonths) {
      updates.warrantyBuildingEnvelopeMonths = 60;
    }
    if (!projectData.warrantyStructuralMonths) {
      updates.warrantyStructuralMonths = 120;
    }
    
    // Default arbitration provider if not set
    if (!projectData.arbitrationProvider) {
      updates.arbitrationProvider = 'JAMS';
    }
    
    // Default effectiveDate from agreementDate if not set
    if (!projectData.effectiveDate && projectData.agreementDate) {
      updates.effectiveDate = projectData.agreementDate;
    } else if (!projectData.effectiveDate) {
      updates.effectiveDate = new Date().toISOString().split('T')[0];
    }
    
    if (Object.keys(updates).length > 0) {
      updateProjectData(updates);
    }
  }, []);
  
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };
  
  const totalDays = (projectData.designPhaseDays || 0) + 
                    (projectData.manufacturingDurationDays || 0) + 
                    (projectData.onsiteDurationDays || 0);
  
  const designPercent = totalDays > 0 ? ((projectData.designPhaseDays || 0) / totalDays) * 100 : 0;
  const mfgPercent = totalDays > 0 ? ((projectData.manufacturingDurationDays || 0) / totalDays) * 100 : 0;
  const onsitePercent = totalDays > 0 ? ((projectData.onsiteDurationDays || 0) / totalDays) * 100 : 0;
  
  const projectDates = useMemo(() => {
    if (!projectData.effectiveDate) return null;
    
    const startDate = new Date(projectData.effectiveDate);
    const designComplete = new Date(startDate);
    designComplete.setDate(designComplete.getDate() + (projectData.designPhaseDays || 0));
    
    const mfgComplete = new Date(designComplete);
    mfgComplete.setDate(mfgComplete.getDate() + (projectData.manufacturingDurationDays || 0));
    
    const projectComplete = new Date(mfgComplete);
    projectComplete.setDate(projectComplete.getDate() + (projectData.onsiteDurationDays || 0));
    
    return { startDate, designComplete, mfgComplete, projectComplete };
  }, [
    projectData.effectiveDate,
    projectData.designPhaseDays,
    projectData.manufacturingDurationDays,
    projectData.onsiteDurationDays
  ]);
  
  const warrantyDates = useMemo(() => {
    if (!projectDates) return null;
    
    const fitFinishExpires = new Date(projectDates.projectComplete);
    fitFinishExpires.setMonth(fitFinishExpires.getMonth() + (projectData.warrantyFitFinishMonths || 24));
    
    const envelopeExpires = new Date(projectDates.projectComplete);
    envelopeExpires.setMonth(envelopeExpires.getMonth() + (projectData.warrantyBuildingEnvelopeMonths || 60));
    
    const structuralExpires = new Date(projectDates.projectComplete);
    structuralExpires.setMonth(structuralExpires.getMonth() + (projectData.warrantyStructuralMonths || 120));
    
    return { fitFinishExpires, envelopeExpires, structuralExpires };
  }, [
    projectDates,
    projectData.warrantyFitFinishMonths,
    projectData.warrantyBuildingEnvelopeMonths,
    projectData.warrantyStructuralMonths
  ]);
  
  const availableDistricts = useMemo(() => {
    const state = projectData.projectState || projectData.siteState || '';
    return FEDERAL_DISTRICTS[state] || [];
  }, [projectData.siteState, projectData.projectState]);
  
  // Auto-set jurisdiction defaults from site address on initial load
  useEffect(() => {
    const updates: Partial<typeof projectData> = {};
    
    // Default projectState from siteState
    if (!projectData.projectState && projectData.siteState) {
      updates.projectState = projectData.siteState;
    }
    
    // Default projectCounty from siteCounty
    if (!projectData.projectCounty && projectData.siteCounty) {
      updates.projectCounty = projectData.siteCounty;
    }
    
    if (Object.keys(updates).length > 0) {
      updateProjectData(updates);
    }
  }, [projectData.siteState, projectData.siteCounty, projectData.projectState, projectData.projectCounty]);
  
  // Auto-set federal district when state changes or when district is empty
  useEffect(() => {
    // If current district is invalid for the state, or no district is set, auto-select first available
    if (availableDistricts.length > 0) {
      if (!projectData.projectFederalDistrict || !availableDistricts.includes(projectData.projectFederalDistrict)) {
        updateProjectData({ projectFederalDistrict: availableDistricts[0] });
      }
    }
  }, [availableDistricts, projectData.projectFederalDistrict]);
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Project Timeline
          </CardTitle>
          <CardDescription>
            Set the effective date and review project phases
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="effectiveDate">
                Effective Date
              </Label>
              <Input
                id="effectiveDate"
                type="date"
                value={projectData.effectiveDate || ''}
                readOnly={true}
                className="bg-muted cursor-not-allowed"
                data-testid="input-effective-date"
              />
              <p className="text-xs text-muted-foreground">
                Set in Step 6 (Dates & Schedule)
              </p>
            </div>
            <div className="flex items-end">
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Total Project Duration</span>
                  <span className="font-medium">{totalDays} days</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-2 pt-2 border-t">
            <div className="h-8 flex rounded-md overflow-hidden border">
              <div 
                className="bg-primary/70 dark:bg-primary/50 flex items-center justify-center text-xs text-primary-foreground font-medium"
                style={{ width: `${designPercent}%` }}
              >
                {designPercent > 15 && 'Design'}
              </div>
              <div 
                className="bg-secondary dark:bg-secondary/80 flex items-center justify-center text-xs text-secondary-foreground font-medium"
                style={{ width: `${mfgPercent}%` }}
              >
                {mfgPercent > 15 && 'Manufacturing'}
              </div>
              <div 
                className="bg-muted dark:bg-muted/80 flex items-center justify-center text-xs text-muted-foreground font-medium"
                style={{ width: `${onsitePercent}%` }}
              >
                {onsitePercent > 15 && 'On-Site'}
              </div>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Design: {projectData.designPhaseDays || 0}d</span>
              <span>Manufacturing: {projectData.manufacturingDurationDays || 0}d</span>
              <span>On-Site: {projectData.onsiteDurationDays || 0}d</span>
            </div>
          </div>
          
          {projectDates && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Project Start</p>
                <p className="font-medium">{formatDate(projectDates.startDate)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Design Complete</p>
                <p className="font-medium">{formatDate(projectDates.designComplete)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Manufacturing Complete</p>
                <p className="font-medium">{formatDate(projectDates.mfgComplete)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Project Complete</p>
                <p className="font-medium text-primary">{formatDate(projectDates.projectComplete)}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Warranty Periods
          </CardTitle>
          <CardDescription>
            Standard warranty terms for different building components
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="warrantyFitFinishMonths">
                Fit & Finish <span className="text-red-500">*</span>
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="warrantyFitFinishMonths"
                  type="number"
                  value={projectData.warrantyFitFinishMonths || 24}
                  onChange={(e) => updateProjectData({ warrantyFitFinishMonths: parseInt(e.target.value) || 24 })}
                  className={validationErrors.warrantyFitFinishMonths ? 'border-red-500' : ''}
                  min={12}
                  max={36}
                  data-testid="input-warranty-fit-finish"
                />
                <span className="text-muted-foreground whitespace-nowrap">months</span>
              </div>
              {validationErrors.warrantyFitFinishMonths && (
                <p className="text-sm text-red-500">{validationErrors.warrantyFitFinishMonths}</p>
              )}
              {warrantyDates && (
                <p className="text-xs text-muted-foreground">
                  Expires: {formatDate(warrantyDates.fitFinishExpires)}
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="warrantyBuildingEnvelopeMonths">
                Building Envelope <span className="text-red-500">*</span>
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="warrantyBuildingEnvelopeMonths"
                  type="number"
                  value={projectData.warrantyBuildingEnvelopeMonths || 60}
                  onChange={(e) => updateProjectData({ warrantyBuildingEnvelopeMonths: parseInt(e.target.value) || 60 })}
                  className={validationErrors.warrantyBuildingEnvelopeMonths ? 'border-red-500' : ''}
                  min={24}
                  max={120}
                  data-testid="input-warranty-envelope"
                />
                <span className="text-muted-foreground whitespace-nowrap">months</span>
              </div>
              {validationErrors.warrantyBuildingEnvelopeMonths && (
                <p className="text-sm text-red-500">{validationErrors.warrantyBuildingEnvelopeMonths}</p>
              )}
              {warrantyDates && (
                <p className="text-xs text-muted-foreground">
                  Expires: {formatDate(warrantyDates.envelopeExpires)}
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="warrantyStructuralMonths">
                Structural <span className="text-red-500">*</span>
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="warrantyStructuralMonths"
                  type="number"
                  value={projectData.warrantyStructuralMonths || 120}
                  onChange={(e) => updateProjectData({ warrantyStructuralMonths: parseInt(e.target.value) || 120 })}
                  className={validationErrors.warrantyStructuralMonths ? 'border-red-500' : ''}
                  min={60}
                  max={240}
                  data-testid="input-warranty-structural"
                />
                <span className="text-muted-foreground whitespace-nowrap">months</span>
              </div>
              {validationErrors.warrantyStructuralMonths && (
                <p className="text-sm text-red-500">{validationErrors.warrantyStructuralMonths}</p>
              )}
              {warrantyDates && (
                <p className="text-xs text-muted-foreground">
                  Expires: {formatDate(warrantyDates.structuralExpires)}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 pt-2">
            <Badge variant="outline" className="gap-1">
              <Clock className="h-3 w-3" />
              Fit & Finish: {projectData.warrantyFitFinishMonths || 24}mo
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Clock className="h-3 w-3" />
              Envelope: {projectData.warrantyBuildingEnvelopeMonths || 60}mo
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Clock className="h-3 w-3" />
              Structural: {projectData.warrantyStructuralMonths || 120}mo
            </Badge>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            Legal Jurisdiction & Venue
          </CardTitle>
          <CardDescription>
            Governing law and dispute resolution settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2 mb-4 p-3 bg-muted/50 rounded-lg">
            <Checkbox
              id="overrideJurisdiction"
              checked={overrideJurisdiction}
              onCheckedChange={(checked) => setOverrideJurisdiction(checked === true)}
              data-testid="checkbox-override-jurisdiction"
            />
            <Label htmlFor="overrideJurisdiction" className="text-sm cursor-pointer">
              Override Default Jurisdiction
            </Label>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="projectState">
                Governing State <span className="text-red-500">*</span>
              </Label>
              <Select
                value={projectData.projectState || projectData.siteState || ''}
                onValueChange={(value) => updateProjectData({ projectState: value })}
                disabled={!overrideJurisdiction}
              >
                <SelectTrigger
                  id="projectState"
                  className={`${validationErrors.projectState ? 'border-red-500' : ''} ${!overrideJurisdiction ? 'bg-muted' : ''}`}
                  data-testid="select-project-state"
                >
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {US_STATES.map(state => (
                    <SelectItem key={state.value} value={state.value}>{state.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {validationErrors.projectState && (
                <p className="text-sm text-red-500">{validationErrors.projectState}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="projectCounty">
                County <span className="text-red-500">*</span>
              </Label>
              <Input
                id="projectCounty"
                value={projectData.projectCounty || ''}
                onChange={(e) => updateProjectData({ projectCounty: e.target.value })}
                placeholder="e.g., Los Angeles"
                className={`${validationErrors.projectCounty ? 'border-red-500' : ''} ${!overrideJurisdiction ? 'bg-muted' : ''}`}
                readOnly={!overrideJurisdiction}
                data-testid="input-project-county"
              />
              {validationErrors.projectCounty && (
                <p className="text-sm text-red-500">{validationErrors.projectCounty}</p>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="projectFederalDistrict">
                Federal Judicial District <span className="text-red-500">*</span>
              </Label>
              <Select
                value={projectData.projectFederalDistrict || ''}
                onValueChange={(value) => updateProjectData({ projectFederalDistrict: value })}
                disabled={availableDistricts.length === 0 || !overrideJurisdiction}
              >
                <SelectTrigger
                  id="projectFederalDistrict"
                  className={`${validationErrors.projectFederalDistrict ? 'border-red-500' : ''} ${!overrideJurisdiction ? 'bg-muted' : ''}`}
                  data-testid="select-federal-district"
                >
                  <SelectValue placeholder={availableDistricts.length === 0 ? 'Select state first' : 'Select district'} />
                </SelectTrigger>
                <SelectContent>
                  {availableDistricts.map(district => (
                    <SelectItem key={district} value={district}>{district}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {validationErrors.projectFederalDistrict && (
                <p className="text-sm text-red-500">{validationErrors.projectFederalDistrict}</p>
              )}
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                <Info className="h-3 w-3" />
                <span>Auto-selected based on Site State. Check to override.</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="arbitrationProvider">
                Arbitration Provider <span className="text-red-500">*</span>
              </Label>
              <Select
                value={projectData.arbitrationProvider || 'JAMS'}
                onValueChange={(value: 'JAMS' | 'AAA') => updateProjectData({ arbitrationProvider: value })}
              >
                <SelectTrigger
                  id="arbitrationProvider"
                  className={validationErrors.arbitrationProvider ? 'border-red-500' : ''}
                  data-testid="select-arbitration-provider"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="JAMS">JAMS</SelectItem>
                  <SelectItem value="AAA">AAA (American Arbitration Association)</SelectItem>
                </SelectContent>
              </Select>
              {validationErrors.arbitrationProvider && (
                <p className="text-sm text-red-500">{validationErrors.arbitrationProvider}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      
      <ResponsibilityMatrix />

      <Card className="bg-muted/30">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Contract Variables</p>
              <p className="text-xs text-muted-foreground">
                This step populates warranty, jurisdiction, and responsibility matrix variables
              </p>
            </div>
            <Badge variant="secondary" className="text-xs">
              WARRANTY_FIT_FINISH, WARRANTY_ENVELOPE, WARRANTY_STRUCTURAL, FEDERAL_DISTRICT, RESPONSIBILITY_MATRIX_TABLE
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
