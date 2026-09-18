import { GitBranchIcon, GitForkIcon } from "lucide-solid";
import { Button } from "@/registry/kobalte/ui/button";

export default function ButtonWithIcon() {
  return (
    <div class="flex gap-2">
      <Button variant="outline">
        <GitBranchIcon data-icon="inline-start" />
        New Branch
      </Button>
      <Button variant="outline">
        Fork
        <GitForkIcon data-icon="inline-end" />
      </Button>
    </div>
  );
}
