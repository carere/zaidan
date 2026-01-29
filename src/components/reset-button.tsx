import { useNavigate } from "@tanstack/solid-router";
import { Undo2 } from "lucide-solid";
import { DEFAULT_CONFIG } from "@/lib/config";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/registry/ui/alert-dialog";
import { Button } from "@/registry/ui/button";

export function ResetButton() {
  const navigate = useNavigate();

  const handleReset = () => {
    navigate({
      to: ".",
      search: (prev) => ({
        ...prev,
        style: DEFAULT_CONFIG.style,
        baseColor: DEFAULT_CONFIG.baseColor,
        theme: DEFAULT_CONFIG.theme,
        font: DEFAULT_CONFIG.font,
        radius: DEFAULT_CONFIG.radius,
        menuAccent: DEFAULT_CONFIG.menuAccent,
      }),
    });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger
        as={Button}
        variant="ghost"
        size="sm"
        class="hidden h-[calc(--spacing(13.5))] w-[140px] touch-manipulation select-none justify-between rounded-xl border border-foreground/10 bg-muted/50 focus-visible:border-transparent focus-visible:ring-1 sm:rounded-lg md:flex md:w-full md:rounded-lg md:border-transparent md:bg-transparent md:pr-3.5! md:pl-2! md:hover:bg-muted"
      >
        <div class="flex flex-col justify-start text-left">
          <div class="text-muted-foreground text-xs">Reset</div>
          <div class="font-medium text-foreground text-sm">Start Over</div>
        </div>
        <Undo2 class="-translate-x-0.5" />
      </AlertDialogTrigger>
      <AlertDialogContent class="dialog-ring p-4 sm:max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle>Reset to defaults?</AlertDialogTitle>
          <AlertDialogDescription>
            This will reset all customization options to their default values. This action cannot be
            undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel class="rounded-lg">Cancel</AlertDialogCancel>
          <AlertDialogAction class="rounded-lg" onClick={handleReset}>
            Reset
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
