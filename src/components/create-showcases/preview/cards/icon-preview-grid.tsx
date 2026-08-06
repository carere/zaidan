import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  Copy,
  Loader2,
  Minus,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  Share,
  ShoppingBag,
  Trash,
} from "lucide-solid";
import { For } from "solid-js";
import { Dynamic } from "solid-js/web";
import { Card, CardContent } from "@/registry/kobalte/ui/card";

const PREVIEW_ICONS = [
  Copy,
  CircleAlert,
  Trash,
  Share,
  ShoppingBag,
  MoreHorizontal,
  Loader2,
  Plus,
  Minus,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronRight,
  Search,
  Settings,
];

export function IconPreviewGrid() {
  return (
    <Card>
      <CardContent>
        <div class="grid grid-cols-8 place-items-center gap-4">
          <For each={PREVIEW_ICONS}>
            {(Icon) => (
              <div class="flex size-8 items-center justify-center rounded-md ring ring-border style-sera:rounded-none *:[svg]:size-4">
                <Dynamic component={Icon} />
              </div>
            )}
          </For>
        </div>
      </CardContent>
    </Card>
  );
}
