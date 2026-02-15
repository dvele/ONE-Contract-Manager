import { useWizard } from './WizardContext';
import type { ResponsibilityItem } from './WizardContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  RESPONSIBILITY_CATEGORIES, 
  getDefaultMatrix 
} from './data/responsibilityDefaults';
import { RotateCcw, ClipboardCheck } from 'lucide-react';

export const ResponsibilityMatrix: React.FC = () => {
  const { wizardState, updateProjectData } = useWizard();
  const { projectData } = wizardState;
  const serviceModel = projectData.serviceModel;
  
  const matrix = projectData.responsibilityMatrix.length > 0
    ? projectData.responsibilityMatrix
    : getDefaultMatrix(serviceModel);
  
  if (projectData.responsibilityMatrix.length === 0 && matrix.length > 0) {
    updateProjectData({ responsibilityMatrix: matrix });
  }
  
  const handleToggle = (itemId: string, assignTo: 'company' | 'client_gc') => {
    const updated = matrix.map((item: ResponsibilityItem) =>
      item.id === itemId ? { ...item, assignedTo: assignTo } : item
    );
    updateProjectData({ responsibilityMatrix: updated });
  };
  
  const handleResetDefaults = () => {
    updateProjectData({ responsibilityMatrix: getDefaultMatrix(serviceModel) });
  };
  
  const defaults = getDefaultMatrix(serviceModel);
  const hasOverrides = matrix.some((item: ResponsibilityItem) => {
    const defaultItem = defaults.find((d: ResponsibilityItem) => d.id === item.id);
    return defaultItem && defaultItem.assignedTo !== item.assignedTo;
  });
  
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
              Assign responsibility for each on-site task. Defaults are based on your
              {' '}<Badge variant="outline">{serviceModel}</Badge>{' '}service model selection.
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
            Reset to {serviceModel} Defaults
          </Button>
        </div>
        {hasOverrides && (
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
            Some items have been manually overridden from the {serviceModel} defaults.
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {RESPONSIBILITY_CATEGORIES.map(category => {
          const categoryItems = matrix.filter((item: ResponsibilityItem) => item.category === category.name);
          
          return (
            <div key={category.name} className="space-y-1">
              <h4 className="font-semibold text-sm border-b pb-1 mb-1">{category.name}</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm" data-testid={`table-responsibility-${category.name.replace(/\s+/g, '-').toLowerCase()}`}>
                  <thead>
                    <tr className="text-xs text-muted-foreground">
                      <th className="text-left py-1 pr-4 font-medium">Task</th>
                      <th className="text-center py-1 px-3 font-medium w-24">Company</th>
                      <th className="text-center py-1 px-3 font-medium w-24">Client/GC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoryItems.map((item: ResponsibilityItem) => {
                      const defaultItem = defaults.find((d: ResponsibilityItem) => d.id === item.id);
                      const isOverridden = defaultItem && defaultItem.assignedTo !== item.assignedTo;
                      
                      return (
                        <tr 
                          key={item.id}
                          className={isOverridden 
                            ? 'bg-amber-50 dark:bg-amber-950/30' 
                            : 'hover:bg-muted/50'}
                          data-testid={`row-responsibility-${item.id}`}
                        >
                          <td className={`py-1.5 pr-4 ${isOverridden ? 'text-amber-900 dark:text-amber-200' : ''}`}>
                            {item.label}
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
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
