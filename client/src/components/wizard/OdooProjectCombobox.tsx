// client/src/components/wizard/OdooProjectCombobox.tsx
import { useState } from 'react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ChevronsUpDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface OdooProject {
  id: number;
  projectNumber: string;
  projectName: string;
  displayName: string;
}

interface Props {
  projects: OdooProject[];
  isLoading: boolean;
  onSelect: (projectNumber: string, projectName: string) => void;
  onManualEntry: () => void;
}

export function OdooProjectCombobox({ projects, isLoading, onSelect, onManualEntry }: Props) {
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const selectedProject = projects.find((p) => p.id === selectedId);

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
            disabled={isLoading}
            data-testid="combobox-odoo-project"
          >
            {isLoading
              ? 'Loading projects...'
              : selectedProject
              ? selectedProject.displayName
              : 'Search projects...'}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search by number or name..." />
            <CommandList>
              <CommandEmpty>No projects found.</CommandEmpty>
              <CommandGroup>
                {projects.map((project) => (
                  <CommandItem
                    key={project.id}
                    value={project.displayName}
                    onSelect={() => {
                      setSelectedId(project.id);
                      setOpen(false);
                      onSelect(project.projectNumber, project.projectName);
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        selectedId === project.id ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    {project.displayName}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <button
        type="button"
        className="text-xs text-muted-foreground underline hover:text-foreground"
        onClick={onManualEntry}
        data-testid="link-manual-entry"
      >
        Enter manually instead
      </button>
    </div>
  );
}
