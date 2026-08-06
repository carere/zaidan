import { Card, CardContent, CardHeader } from "@/registry/kobalte/ui/card";
import { Skeleton } from "@/registry/kobalte/ui/skeleton";

export default function SkeletonCard() {
  return (
    <Card class="w-full max-w-xs">
      <CardHeader>
        <Skeleton class="h-4 w-2/3" />
        <Skeleton class="h-4 w-1/2" />
      </CardHeader>
      <CardContent>
        <Skeleton class="aspect-video w-full" />
      </CardContent>
    </Card>
  );
}
