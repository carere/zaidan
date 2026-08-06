import { UploadCloud } from "lucide-solid";
import { Button } from "@/registry/kobalte/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/registry/kobalte/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/registry/kobalte/ui/empty";

export function FileUpload() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>File Upload</CardTitle>
        <CardDescription>Drag and drop or browse</CardDescription>
      </CardHeader>
      <CardContent>
        <Empty class="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UploadCloud />
            </EmptyMedia>
            <EmptyTitle>Upload files</EmptyTitle>
            <EmptyDescription>PNG, JPG, PDF up to 10MB</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button>Browse Files</Button>
          </EmptyContent>
        </Empty>
      </CardContent>
    </Card>
  );
}
