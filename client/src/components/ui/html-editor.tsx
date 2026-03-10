import { Textarea } from "@/components/ui/textarea";
import { HtmlRichTextEditor } from "@/components/ui/rich-text-editor";
import { cn } from "@/lib/utils";

interface HtmlEditorProps {
  value: string;
  onChange: (html: string) => void;
  mode: "source" | "visual";
  className?: string;
  placeholder?: string;
  "data-testid"?: string;
}

export function HtmlEditor({ value, onChange, mode, className, placeholder, "data-testid": testId }: HtmlEditorProps) {
  if (mode === "source") {
    return (
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn("min-h-[200px] font-mono text-sm", className)}
        data-testid={testId}
      />
    );
  }
  return (
    <HtmlRichTextEditor
      content={value}
      onChange={onChange}
      className={cn("min-h-[200px]", className)}
    />
  );
}
