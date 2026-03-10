import { Badge } from "@/components/ui/badge";
import { CheckSquare } from "lucide-react";

interface ContractTypeOption {
  value: string;
  label: string;
}

interface ContractTypePickerProps {
  options: ContractTypeOption[];
  value: string[] | null | undefined;
  onChange: (value: string[]) => void;
  className?: string;
}

export function ContractTypePicker({ options, value, onChange, className }: ContractTypePickerProps) {
  const selected = value || [];

  const toggle = (type: string) => {
    if (selected.includes(type)) {
      onChange(selected.filter((t) => t !== type));
    } else {
      onChange([...selected, type]);
    }
  };

  return (
    <div className={`flex flex-wrap gap-1 ${className ?? ""}`}>
      {options.map((type) => (
        <Badge
          key={type.value}
          variant={selected.includes(type.value) ? "default" : "outline"}
          className="toggle-elevate cursor-pointer text-xs"
          onClick={() => toggle(type.value)}
          data-testid={`badge-contract-type-${type.value}`}
        >
          {selected.includes(type.value) && <CheckSquare className="mr-1 h-3 w-3" />}
          {type.label}
        </Badge>
      ))}
    </div>
  );
}
