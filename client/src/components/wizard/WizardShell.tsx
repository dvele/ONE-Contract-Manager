import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useWizard, SHELL_TESTING_MODE } from './WizardContext';
import { Step1ProjectInfo } from './steps/Step1ProjectInfo';
import { Step2ServiceModel } from './steps/Step2ServiceModel';
import { Step3PartyInfo } from './steps/Step3PartyInfo';
import { Step4SiteAndHome } from './steps/Step4SiteAndHome';
import { Step5ChildLLC } from './steps/Step5ChildLLC';
import { Step6DatesSchedule } from './steps/Step6DatesSchedule';
import { Step7Pricing } from './steps/Step7Pricing';
import { Step8ScheduleWarranty } from './steps/Step8ScheduleWarranty';
import { Step9ReviewGenerate } from './steps/Step9ReviewGenerate';
import { 
  Check, 
  ChevronLeft, 
  ChevronRight, 
  Save,
  FileText,
  Settings2,
  Users,
  Building2,
  Home,
  Calendar,
  DollarSign,
  Shield,
  ClipboardCheck,
  Zap
} from 'lucide-react';

const STEPS = [
  { number: 1, title: "Project Info", description: "Basic project details", icon: FileText },
  { number: 2, title: "Service Model", description: "CRC or CMOS selection", icon: Settings2 },
  { number: 3, title: "Party Info", description: "Client & SPV details", icon: Users },
  { number: 4, title: "Home Models", description: "Unit selection", icon: Home },
  { number: 5, title: "Company Entity", description: "LLC entity setup", icon: Building2 },
  { number: 6, title: "Dates & Schedule", description: "Timeline", icon: Calendar },
  { number: 7, title: "Pricing", description: "Financial terms", icon: DollarSign },
  { number: 8, title: "Schedule & Warranty", description: "Timeline & terms", icon: Shield },
  { number: 9, title: "Review & Generate", description: "Final review", icon: ClipboardCheck },
];

export const WizardShell: React.FC = () => {
  const { 
    wizardState, 
    nextStep, 
    prevStep, 
    goToStep, 
    saveDraft,
    loadTestDraft,
    validateStep,
    isLoadingDraft
  } = useWizard();
  
  // Show loading state while draft is being loaded
  if (isLoadingDraft) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">Loading draft...</p>
          </div>
        </div>
      </div>
    );
  }
  
  const currentStepInfo = STEPS[wizardState.currentStep - 1];
  const validationResult = validateStep(wizardState.currentStep);
  const canProceed = validationResult.valid;
  const CurrentIcon = currentStepInfo.icon;
  
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Progress Indicator */}
      <Card className="p-6">
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              Step {wizardState.currentStep} of {STEPS.length}
            </span>
            <span className="text-sm text-muted-foreground">
              {Math.round((wizardState.currentStep / STEPS.length) * 100)}% Complete
            </span>
          </div>
          <Progress value={(wizardState.currentStep / STEPS.length) * 100} />
        </div>
        
        {/* Step Pills */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2">
          {STEPS.map((step, index) => {
            const isCompleted = wizardState.completedSteps.has(step.number);
            const isCurrent = step.number === wizardState.currentStep;
            const isAccessible = SHELL_TESTING_MODE || 
                                step.number === 1 || 
                                isCompleted || 
                                wizardState.completedSteps.has(step.number - 1) ||
                                step.number < wizardState.currentStep;
            const StepIcon = step.icon;
            
            return (
              <div key={step.number} className="flex items-center">
                <Button
                  variant={isCurrent ? "default" : isCompleted ? "ghost" : "ghost"}
                  onClick={() => isAccessible && goToStep(step.number)}
                  disabled={!isAccessible}
                  className={`
                    h-auto flex flex-col items-center gap-1 p-2 rounded-lg
                    ${isCurrent ? 'bg-primary text-primary-foreground' : ''}
                    ${isCompleted && !isCurrent ? 'bg-green-500/10 text-green-600 dark:text-green-400' : ''}
                    ${!isCurrent && !isCompleted && isAccessible ? 'text-muted-foreground' : ''}
                  `}
                  data-testid={`step-indicator-${step.number}`}
                >
                  <div className={`
                    flex items-center justify-center w-10 h-10 rounded-full border-2
                    ${isCurrent ? 'border-primary-foreground' : ''}
                    ${isCompleted && !isCurrent ? 'border-green-600 bg-green-500' : ''}
                    ${!isCurrent && !isCompleted ? 'border-border' : ''}
                  `}>
                    {isCompleted && !isCurrent ? (
                      <Check className="h-5 w-5 text-white" />
                    ) : (
                      <StepIcon className="h-5 w-5" />
                    )}
                  </div>
                  <div className="text-center min-w-[80px]">
                    <div className="text-xs font-medium truncate">{step.title}</div>
                    <div className="text-[10px] truncate">{step.description}</div>
                  </div>
                </Button>
                
                {/* Connector Line */}
                {index < STEPS.length - 1 && (
                  <div className={`
                    h-0.5 w-8 mx-1 
                    ${isCompleted ? 'bg-green-500' : 'bg-border'}
                  `} />
                )}
              </div>
            );
          })}
        </div>
      </Card>
      
      {/* Current Step Title */}
      <div className="text-center">
        <h2 className="text-2xl font-bold">{currentStepInfo.title}</h2>
        <p className="text-muted-foreground">{currentStepInfo.description}</p>
      </div>
      
      {/* Step Content */}
      <div>
        {wizardState.currentStep === 1 && <Step1ProjectInfo />}
        {wizardState.currentStep === 2 && <Step2ServiceModel />}
        {wizardState.currentStep === 3 && <Step3PartyInfo />}
        {wizardState.currentStep === 4 && <Step4SiteAndHome />}
        {wizardState.currentStep === 5 && <Step5ChildLLC />}
        {wizardState.currentStep === 6 && <Step6DatesSchedule />}
        {wizardState.currentStep === 7 && <Step7Pricing />}
        {wizardState.currentStep === 8 && <Step8ScheduleWarranty />}
        {wizardState.currentStep === 9 && <Step9ReviewGenerate />}
      </div>
      
      {/* Navigation Buttons - hidden on Step 9 as it has its own controls */}
      {wizardState.currentStep < 9 && (
        <div className="flex items-center justify-between gap-4">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={wizardState.currentStep === 1}
            data-testid="button-prev-step"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={saveDraft}
              data-testid="button-save-draft"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Draft
            </Button>
            
            {wizardState.currentStep === 1 && (
              <Button
                variant="secondary"
                onClick={loadTestDraft}
                data-testid="button-load-test-draft"
              >
                <Zap className="h-4 w-4 mr-2" />
                Load Test Draft
              </Button>
            )}
          </div>
          
          <Button
            onClick={nextStep}
            disabled={!canProceed}
            data-testid="button-next-step"
          >
            {wizardState.currentStep === 8 ? 'Review' : 'Next'}
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      )}
      
      {/* Back button on Step 9 */}
      {wizardState.currentStep === 9 && (
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={prevStep}
            data-testid="button-prev-step"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
      )}
      
      {/* Validation Errors Display */}
      {Object.keys(wizardState.validationErrors).length > 0 && (
        <Card className="border-red-500 bg-red-500/5">
          <div className="p-4">
            <h4 className="font-semibold text-red-600 mb-2">Please fix the following errors:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-red-600">
              {Object.entries(wizardState.validationErrors).map(([field, error]) => (
                <li key={field}>{error}</li>
              ))}
            </ul>
          </div>
        </Card>
      )}
    </div>
  );
};
