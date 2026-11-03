import { useWizard } from '../WizardContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Factory, Truck, Briefcase, HelpCircle, Building2 } from 'lucide-react';
import { DELIVERY_MODEL_LABELS, toDeliveryModel, type DeliveryModel } from '@shared/deliveryModel';

const DELIVERY_OPTIONS: Array<{
  model: DeliveryModel;
  testId: string;
  Icon: typeof Factory;
  badge: string;
  badgeVariant: 'outline' | 'secondary';
  description: string;
  bullets: string[];
  highlight: string;
}> = [
  {
    model: 'FOB',
    testId: 'option-fob',
    Icon: Factory,
    badge: 'Buyer Pickup',
    badgeVariant: 'outline',
    description: 'Buyer takes delivery at the factory and arranges transport, set and all on-site work',
    bullets: [
      'Buyer collects the homes at the factory',
      'Buyer hires and manages its own licensed general contractor',
      'Shipping and on-site costs are separate from Dvele contract',
    ],
    highlight: "Buyer's General Contractor info required in Step 3",
  },
  {
    model: 'CRC',
    testId: 'option-crc',
    Icon: Truck,
    badge: 'Dvele Transport',
    badgeVariant: 'outline',
    description: "Dvele delivers and sets the homes; Buyer's general contractor handles all on-site work",
    bullets: [
      'Dvele transports and sets the homes at the site',
      "Buyer hires and manages its own licensed general contractor",
      'On-site costs are separate from Dvele contract',
    ],
    highlight: "Buyer's General Contractor info required in Step 3",
  },
  {
    model: 'CMOS',
    testId: 'option-cmos',
    Icon: Briefcase,
    badge: 'Turnkey',
    badgeVariant: 'secondary',
    description: 'Dvele coordinates and manages all on-site construction work through its GC Affiliate',
    bullets: [
      'Dvele manages all on-site contractors and scheduling',
      'Single point of contact for entire project',
      'On-site costs included in total contract price',
    ],
    highlight: 'Includes site prep, utilities, and completion pricing',
  },
];

const EXPLANATIONS: Record<DeliveryModel, string[]> = {
  FOB: [
    "You'll provide the Buyer's General Contractor in the next step",
    'Excludes shipping and on-site pricing from the Master Purchase Agreement',
    'Buyer arranges pickup, transport and set',
    'Includes FOB Factory content in the agreement',
  ],
  CRC: [
    "You'll provide the Buyer's General Contractor in the next step",
    "On-site work will be between the Buyer and the Buyer's General Contractor",
    'Excludes on-site pricing from the Master Purchase Agreement',
    'Includes Delivered to Site content in the agreement',
  ],
  CMOS: [
    'You will enter the GC Affiliate in the next step',
    'On-site work will be managed by Dvele',
    'Includes site prep, utilities, and completion pricing',
    'Includes Dvele GC content in the agreement',
  ],
};

export const Step2ServiceModel: React.FC = () => {
  const { 
    wizardState, 
    updateProjectData
  } = useWizard();
  
  const { projectData, validationErrors } = wizardState;
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Agreement Type</CardTitle>
          <CardDescription>
            All projects use the Master Purchase Agreement
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className="relative p-4 border-2 border-primary bg-primary/5 shadow-md rounded-lg overflow-visible"
            data-testid="option-master-ef"
          >
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full border-2 border-primary bg-primary flex items-center justify-center mt-0.5">
                <div className="w-2.5 h-2.5 rounded-full bg-white" />
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <Building2 className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold">Master Purchase Agreement</h3>
                  <Badge variant="secondary" className="text-xs">Exhibit-First</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Consolidated exhibit-first master purchase agreement with integrated exhibits
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Delivery Model Selection</CardTitle>
          <CardDescription>
            Choose how the homes are delivered and who manages on-site construction work
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {validationErrors.serviceModel && (
            <p className="text-sm text-red-500">{validationErrors.serviceModel}</p>
          )}
          
          {DELIVERY_OPTIONS.map(({ model, testId, Icon, badge, badgeVariant, description, bullets, highlight }) => (
            <div
              key={model}
              className={`
                relative p-6 border-2 rounded-lg cursor-pointer transition-all overflow-visible
                ${projectData.serviceModel === model 
                  ? 'border-primary bg-primary/5 shadow-md' 
                  : 'border-border hover-elevate'
                }
              `}
              onClick={() => updateProjectData({ serviceModel: model })}
              data-testid={testId}
            >
              <div className="flex items-start gap-4">
                <div className={`
                  w-6 h-6 rounded-full border-2 flex items-center justify-center mt-1
                  ${projectData.serviceModel === model 
                    ? 'border-primary bg-primary' 
                    : 'border-muted-foreground'
                  }
                `}>
                  {projectData.serviceModel === model && (
                    <div className="w-3 h-3 rounded-full bg-white" />
                  )}
                </div>
                
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <Icon className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">{DELIVERY_MODEL_LABELS[model]}</h3>
                    <Badge variant={badgeVariant}>{badge}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">{description}</p>
                  
                  <div className="space-y-2 text-sm">
                    {bullets.map((text) => (
                      <div key={text} className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                        <span>{text}</span>
                      </div>
                    ))}
                    <div className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                      <span className="font-medium text-primary">{highlight}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          <Card className="bg-muted/30 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <HelpCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-sm mb-2">How this affects your contracts:</p>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    {EXPLANATIONS[toDeliveryModel(projectData.serviceModel)].map((line) => (
                      <p key={line}>{line}</p>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
      
      <Card className="bg-muted/30">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Contract Variables</p>
              <p className="text-xs text-muted-foreground">
                This step populates 1 contract variable
              </p>
            </div>
            <Badge variant="secondary">
              ON_SITE_SERVICES_SELECTION
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
