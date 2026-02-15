import { useEffect, useMemo } from 'react';
import { useWizard } from '../WizardContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, Info, AlertTriangle, Target } from 'lucide-react';

export const Step6DatesSchedule: React.FC = () => {
  const { 
    wizardState, 
    updateProjectData
  } = useWizard();
  
  const { projectData, validationErrors } = wizardState;
  
  // Use project's existing start date (from Step 1)
  // agreementDate comes from Step 1, defaults to today if not set
  const projectStartDate = useMemo(() => {
    if (projectData.agreementDate) return new Date(projectData.agreementDate);
    return new Date(); // Default to today
  }, [projectData.agreementDate]);
  
  // Auto-set effectiveDate from agreementDate on mount or when agreementDate changes
  useEffect(() => {
    if (!projectData.effectiveDate && projectData.agreementDate) {
      updateProjectData({ effectiveDate: projectData.agreementDate });
    } else if (!projectData.effectiveDate && !projectData.agreementDate) {
      // Default to today if no dates are set
      const today = new Date().toISOString().split('T')[0];
      updateProjectData({ effectiveDate: today });
    }
  }, [projectData.agreementDate, projectData.effectiveDate, updateProjectData]);
  
  useEffect(() => {
    if (!projectData.onsiteDurationDays) {
      const defaultDays = projectData.serviceModel === 'CRC' ? 90 : 60;
      updateProjectData({ onsiteDurationDays: defaultDays });
    }
  }, [projectData.serviceModel]);
  
  useEffect(() => {
    const updates: Partial<typeof projectData> = {};
    if (!projectData.designPhaseDays) {
      updates.designPhaseDays = 60;
    }
    if (!projectData.manufacturingDurationDays) {
      updates.manufacturingDurationDays = 120;
    }
    if (Object.keys(updates).length > 0) {
      updateProjectData(updates);
    }
  }, []);
  
  // Calculate delivery and completion dates based on start date + durations
  const { deliveryDate, completionDate } = useMemo(() => {
    const startDate = new Date(projectStartDate);
    
    // Delivery = start + design + manufacturing
    const deliveryDays = (projectData.designPhaseDays || 0) + 
                         (projectData.manufacturingDurationDays || 0);
    const delivery = new Date(startDate);
    delivery.setDate(delivery.getDate() + deliveryDays);
    
    // Completion = start + design + manufacturing + onsite
    const totalDays = deliveryDays + (projectData.onsiteDurationDays || 0);
    const completion = new Date(startDate);
    completion.setDate(completion.getDate() + totalDays);
    
    return { deliveryDate: delivery, completionDate: completion };
  }, [projectStartDate, projectData.designPhaseDays, projectData.manufacturingDurationDays, projectData.onsiteDurationDays]);
  
  // Auto-save estimated dates to project data when they change
  useEffect(() => {
    const deliveryStr = deliveryDate.toISOString().split('T')[0];
    const completionStr = completionDate.toISOString().split('T')[0];
    
    if (projectData.targetDeliveryDate !== deliveryStr || 
        projectData.estimatedCompletionDate !== completionStr) {
      updateProjectData({ 
        targetDeliveryDate: deliveryStr,
        estimatedCompletionDate: completionStr
      });
    }
  }, [deliveryDate, completionDate]);
  
  const totalDays = (projectData.designPhaseDays || 0) + 
                    (projectData.manufacturingDurationDays || 0) + 
                    (projectData.onsiteDurationDays || 0);
  
  const formatDate = (date: Date | null) => {
    if (!date) return 'Not calculated';
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };
  
  const designPercent = totalDays > 0 ? ((projectData.designPhaseDays || 0) / totalDays) * 100 : 0;
  const mfgPercent = totalDays > 0 ? ((projectData.manufacturingDurationDays || 0) / totalDays) * 100 : 0;
  const onsitePercent = totalDays > 0 ? ((projectData.onsiteDurationDays || 0) / totalDays) * 100 : 0;
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Key Dates
          </CardTitle>
          <CardDescription>
            Set the project timeline and key milestones
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 bg-muted/30 rounded-lg border flex items-start gap-3">
            <Info className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium">Project Start Date</p>
              <p className="text-lg font-semibold">{formatDate(projectStartDate)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Based on the agreement date from Step 1 (or project creation date)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Phase Durations
          </CardTitle>
          <CardDescription>
            Configure the length of each project phase
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="designPhaseDays">
                Design Phase (days)
              </Label>
              <Input
                id="designPhaseDays"
                type="number"
                value={projectData.designPhaseDays || ''}
                onChange={(e) => updateProjectData({ designPhaseDays: parseInt(e.target.value) || 0 })}
                placeholder="e.g., 60"
                min={30}
                max={180}
                className={validationErrors.designPhaseDays ? 'border-red-500' : ''}
                data-testid="input-design-days"
              />
              {validationErrors.designPhaseDays && (
                <p className="text-sm text-red-500">{validationErrors.designPhaseDays}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Typical: 30-90 days
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="manufacturingDurationDays">
                Manufacturing (days)
              </Label>
              <Input
                id="manufacturingDurationDays"
                type="number"
                value={projectData.manufacturingDurationDays || ''}
                onChange={(e) => updateProjectData({ manufacturingDurationDays: parseInt(e.target.value) || 0 })}
                placeholder="e.g., 120"
                min={60}
                max={365}
                className={validationErrors.manufacturingDurationDays ? 'border-red-500' : ''}
                data-testid="input-manufacturing-days"
              />
              {validationErrors.manufacturingDurationDays && (
                <p className="text-sm text-red-500">{validationErrors.manufacturingDurationDays}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Typical: 90-180 days
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="onsiteDurationDays" className="flex items-center gap-2">
                On-Site (days)
                {projectData.serviceModel === 'CRC' && (
                  <Badge variant="outline" className="text-xs">CRC</Badge>
                )}
              </Label>
              <Input
                id="onsiteDurationDays"
                type="number"
                value={projectData.onsiteDurationDays || ''}
                onChange={(e) => updateProjectData({ onsiteDurationDays: parseInt(e.target.value) || 0 })}
                placeholder={projectData.serviceModel === 'CRC' ? '90' : '60'}
                min={30}
                max={180}
                className={validationErrors.onsiteDurationDays ? 'border-red-500' : ''}
                data-testid="input-onsite-days"
              />
              {validationErrors.onsiteDurationDays && (
                <p className="text-sm text-red-500">{validationErrors.onsiteDurationDays}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {projectData.serviceModel === 'CRC' 
                  ? 'Default: 90 days (client-managed)' 
                  : 'Default: 60 days (Dvele-managed)'
                }
              </p>
            </div>
          </div>
          
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total Duration</span>
              <span className="font-medium">{totalDays} days ({Math.round(totalDays / 30)} months)</span>
            </div>
            
            <div className="h-4 bg-muted rounded-full overflow-hidden flex">
              <div 
                className="bg-blue-500 h-full transition-all"
                style={{ width: `${designPercent}%` }}
                title={`Design: ${projectData.designPhaseDays || 0} days`}
              />
              <div 
                className="bg-amber-500 h-full transition-all"
                style={{ width: `${mfgPercent}%` }}
                title={`Manufacturing: ${projectData.manufacturingDurationDays || 0} days`}
              />
              <div 
                className="bg-green-500 h-full transition-all"
                style={{ width: `${onsitePercent}%` }}
                title={`On-Site: ${projectData.onsiteDurationDays || 0} days`}
              />
            </div>
            
            <div className="flex flex-wrap gap-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-blue-500" />
                <span>Design ({projectData.designPhaseDays || 0}d)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-amber-500" />
                <span>Manufacturing ({projectData.manufacturingDurationDays || 0}d)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-green-500" />
                <span>On-Site ({projectData.onsiteDurationDays || 0}d)</span>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Estimated Delivery Date</p>
                  <p className="text-lg font-semibold text-amber-600">{formatDate(deliveryDate)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Start + Design + Manufacturing
                  </p>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Estimated Completion Date</p>
                  <p className="text-lg font-semibold text-primary">{formatDate(completionDate)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Start + Design + Manufacturing + On-Site
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-primary" />
            Interface Deadlines
            <Badge variant="outline" className="text-xs">Exhibit C.4</Badge>
          </CardTitle>
          <CardDescription>
            Days before module delivery that each site condition must be ready
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="foundationReadyDays">Foundation Ready (days)</Label>
              <Input
                id="foundationReadyDays"
                type="number"
                value={projectData.foundationReadyDays || ''}
                onChange={(e) => updateProjectData({ foundationReadyDays: parseInt(e.target.value) || 0 })}
                placeholder="14"
                min={1}
                max={90}
                data-testid="input-foundation-ready-days"
              />
              <p className="text-xs text-muted-foreground">Default: 14 days</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="utilityStubbedDays">Utilities Stubbed (days)</Label>
              <Input
                id="utilityStubbedDays"
                type="number"
                value={projectData.utilityStubbedDays || ''}
                onChange={(e) => updateProjectData({ utilityStubbedDays: parseInt(e.target.value) || 0 })}
                placeholder="14"
                min={1}
                max={90}
                data-testid="input-utility-stubbed-days"
              />
              <p className="text-xs text-muted-foreground">Default: 14 days</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="siteAccessReadyDays">Site Access Ready (days)</Label>
              <Input
                id="siteAccessReadyDays"
                type="number"
                value={projectData.siteAccessReadyDays || ''}
                onChange={(e) => updateProjectData({ siteAccessReadyDays: parseInt(e.target.value) || 0 })}
                placeholder="7"
                min={1}
                max={60}
                data-testid="input-site-access-ready-days"
              />
              <p className="text-xs text-muted-foreground">Default: 7 days</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="permitsScheduledDays">Permits Scheduled (days)</Label>
              <Input
                id="permitsScheduledDays"
                type="number"
                value={projectData.permitsScheduledDays || ''}
                onChange={(e) => updateProjectData({ permitsScheduledDays: parseInt(e.target.value) || 0 })}
                placeholder="30"
                min={1}
                max={120}
                data-testid="input-permits-scheduled-days"
              />
              <p className="text-xs text-muted-foreground">Default: 30 days</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="craneAccessReadyDays">Crane Access Ready (days)</Label>
              <Input
                id="craneAccessReadyDays"
                type="number"
                value={projectData.craneAccessReadyDays || ''}
                onChange={(e) => updateProjectData({ craneAccessReadyDays: parseInt(e.target.value) || 0 })}
                placeholder="7"
                min={1}
                max={60}
                data-testid="input-crane-access-ready-days"
              />
              <p className="text-xs text-muted-foreground">Default: 7 days</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Milestone Target Dates
            <Badge variant="outline" className="text-xs">Exhibit D.1 / D.2</Badge>
          </CardTitle>
          <CardDescription>
            Target dates for design, permitting, and production milestones (leave blank for TBD)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <p className="text-sm font-medium mb-3">D.1 - Design / Pre-Production</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="designKickoffDate">Design Kickoff</Label>
                <Input
                  id="designKickoffDate"
                  type="date"
                  value={projectData.designKickoffDate || ''}
                  onChange={(e) => updateProjectData({ designKickoffDate: e.target.value })}
                  data-testid="input-design-kickoff-date"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="schematicDesignDate">Schematic Design Complete</Label>
                <Input
                  id="schematicDesignDate"
                  type="date"
                  value={projectData.schematicDesignDate || ''}
                  onChange={(e) => updateProjectData({ schematicDesignDate: e.target.value })}
                  data-testid="input-schematic-design-date"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="designDevelopmentDate">Design Development Complete</Label>
                <Input
                  id="designDevelopmentDate"
                  type="date"
                  value={projectData.designDevelopmentDate || ''}
                  onChange={(e) => updateProjectData({ designDevelopmentDate: e.target.value })}
                  data-testid="input-design-development-date"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="permitSubmittalDate">Permit Submittal</Label>
                <Input
                  id="permitSubmittalDate"
                  type="date"
                  value={projectData.permitSubmittalDate || ''}
                  onChange={(e) => updateProjectData({ permitSubmittalDate: e.target.value })}
                  data-testid="input-permit-submittal-date"
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-3">D.2 - Production Milestones</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="productionMidpointDate">Production Midpoint</Label>
                <Input
                  id="productionMidpointDate"
                  type="date"
                  value={projectData.productionMidpointDate || ''}
                  onChange={(e) => updateProjectData({ productionMidpointDate: e.target.value })}
                  data-testid="input-production-midpoint-date"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="productionCompleteDate">Production Complete</Label>
                <Input
                  id="productionCompleteDate"
                  type="date"
                  value={projectData.productionCompleteDate || ''}
                  onChange={(e) => updateProjectData({ productionCompleteDate: e.target.value })}
                  data-testid="input-production-complete-date"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-muted/30">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Contract Variables</p>
              <p className="text-xs text-muted-foreground">
                This step populates schedule, deadline, and milestone variables
              </p>
            </div>
            <Badge variant="secondary" className="text-xs">
              EFFECTIVE_DATE, DESIGN_DAYS, MFG_DAYS, ONSITE_DAYS, C.4 deadlines, D.1/D.2 dates
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
