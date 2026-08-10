import * as React from "react";
import { ChevronDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Select nativo (no Base UI): el Select de Base UI necesita un prop `items` explícito para
 * resolver la etiqueta del valor seleccionado; sin él muestra el value crudo (el id, "all",
 * etc.) en vez del texto de la opción. Un <select> nativo no tiene ese problema (el navegador
 * siempre muestra el texto de la <option> seleccionada) y además participa en submits de
 * formularios GET sin JS, igual que los demás filtros de estas páginas.
 */
function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <div className="relative">
      <select
        data-slot="native-select"
        className={cn(
          "h-8 w-full min-w-0 appearance-none rounded-lg border border-input bg-transparent px-2.5 py-1 pr-7 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30",
          className
        )}
        {...props}
      />
      <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-2 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

export { NativeSelect };
