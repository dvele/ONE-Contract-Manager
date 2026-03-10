import { cn } from "@/lib/utils";

function highlightVariables(html: string): string {
  return html
    .replace(
      /\{\{(BLOCK_[A-Z_]+)\}\}/g,
      '<span class="inline-block bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300 px-1.5 py-0.5 rounded text-xs font-mono mx-0.5">{{$1}}</span>'
    )
    .replace(
      /\{\{(TABLE_[A-Z_]+)\}\}/g,
      '<span class="inline-block bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300 px-1.5 py-0.5 rounded text-xs font-mono mx-0.5">{{$1}}</span>'
    )
    .replace(
      /\{\{([A-Z_]+)\}\}/g,
      '<span class="inline-block bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 px-1.5 py-0.5 rounded text-xs font-mono mx-0.5">{{$1}}</span>'
    );
}

interface VariablePreviewProps {
  html: string;
  className?: string;
  "data-testid"?: string;
}

export function VariablePreview({ html, className, "data-testid": testId }: VariablePreviewProps) {
  return (
    <div
      className={cn("prose prose-sm max-w-none dark:prose-invert", className)}
      dangerouslySetInnerHTML={{ __html: highlightVariables(html) }}
      data-testid={testId}
    />
  );
}
