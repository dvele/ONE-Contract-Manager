import { useEffect } from 'react';
import { useWizard } from './WizardContext';
import type { ResponsibilityItem } from './WizardContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  C2_WORK_CATEGORIES,
  getC2DefaultMatrix,
  isC2Matrix
} from './data/responsibilityDefaults';
import { DELIVERY_MODEL_LABELS, toDeliveryModel } from '@shared/deliveryModel';
import { RotateCcw, ClipboardCheck } from 'lucide-react';

export const ResponsibilityMatrix: React.FC = () => {
  const { wizardState, updateProjectData } = useWizard();
  const { projectData } = wizardState;
  const deliveryModel = toDeliveryModel(projectData.serviceModel);
  const modelLabel = DELIVERY_MODEL_LABELS[deliveryModel];
  const defaults = getC2DefaultMatrix(deliveryModel);
  
  // This edits the agreement's C.2 only. A project with no C.2 matrix yet is
  // seeded with the defaults; an old-list matrix lives in
  // legacyResponsibilityMatrix and is saved back untouched. isC2Matrix is true
  // for [], so the length check is separate.
  const stored = projectData.responsibilityMatrix;
  const storedIsC2 = stored.length > 0 && isC2Matrix(stored);
  const matrix = storedIsC2 ? stored : defaults;
  
  useEffect(() => {
    if (!storedIsC2) {
      updateProjectData({ responsibilityMatrix: getC2DefaultMatrix(deliveryModel) });
    }
  }, [storedIsC2, deliveryModel]);
  
  const handleToggle = (itemId: string, assignTo: 'company' | 'client_gc') => {
    const updated = matrix.map((item: ResponsibilityItem) =>
      item.id === itemId ? { ...item, assignedTo: assignTo } : item
    );
    updateProjectData({ responsibilityMatrix: updated });
  };
  
  const handleResetDefaults = () => {
    updateProjectData({ responsibilityMatrix: getC2DefaultMatrix(deliveryModel) });
  };
  
  const isOverriddenItem = (item: ResponsibilityItem) => {
    const defaultItem = defaults.find((d: ResponsibilityItem) => d.id === item.id);
    return !!defaultItem && defaultItem.assignedTo !== item.assignedTo;
  };
  const hasOverrides = matrix.some(isOverriddenItem);
  
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              Responsibility Matrix (Exhibit C.2)
            </CardTitle>
            <CardDescription>
              Assign responsibility for each work category. Defaults are based on your
              {' '}<Badge variant="outline">{modelLabel}</Badge>{' '}Delivery Model selection.
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleResetDefaults}
            className="gap-1"
            data-testid="button-reset-responsibility-defaults"
          >
            <RotateCcw className="h-3 w-3" />
            Reset to {modelLabel} Defaults
          </Button>
        </div>
        {hasOverrides && (
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
            Some items have been manually overridden from the {modelLabel} defaults.
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="table-responsibility-c2">
            <thead>
              <tr className="text-xs text-muted-foreground">
                <th className="text-left py-1 pr-4 font-medium">Work Category</th>
                <th className="text-center py-1 px-3 font-medium w-24">Dvele</th>
                <th className="text-center py-1 px-3 font-medium w-24">Buyer/GC</th>
                <th className="text-left py-1 pl-4 font-medium">Note</th>
              </tr>
            </thead>
            <tbody>
              {C2_WORK_CATEGORIES.map((category) => {
                const item = matrix.find((m: ResponsibilityItem) => m.id === category.id);
                if (!item) return null;
                const isOverridden = isOverriddenItem(item);
                
                return (
                  <tr 
                    key={item.id}
                    className={isOverridden 
                      ? 'bg-amber-50 dark:bg-amber-950/30' 
                      : 'hover:bg-muted/50'}
                    data-testid={`row-responsibility-${item.id}`}
                  >
                    <td className={`py-1.5 pr-4 ${isOverridden ? 'text-amber-900 dark:text-amber-200' : ''}`}>
                      {category.label}
                    </td>
                    <td className="text-center py-1.5 px-3">
                      <input
                        type="radio"
                        name={`responsibility-${item.id}`}
                        checked={item.assignedTo === 'company'}
                        onChange={() => handleToggle(item.id, 'company')}
                        className="h-4 w-4 cursor-pointer accent-primary"
                        data-testid={`radio-company-${item.id}`}
                      />
                    </td>
                    <td className="text-center py-1.5 px-3">
                      <input
                        type="radio"
                        name={`responsibility-${item.id}`}
                        checked={item.assignedTo === 'client_gc'}
                        onChange={() => handleToggle(item.id, 'client_gc')}
                        className="h-4 w-4 cursor-pointer accent-primary"
                        data-testid={`radio-clientgc-${item.id}`}
                      />
                    </td>
                    <td className="py-1.5 pl-4 text-muted-foreground" data-testid={`note-responsibility-${item.id}`}>
                      {category.note}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};
