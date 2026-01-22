import { Badge } from "@/registry/ui/badge";

export function Preview({ slug }: { slug: string }) {
  let iframeRef: HTMLIFrameElement | undefined;

  return (
    <>
      <iframe
        ref={iframeRef}
        src={`/preview/kobalte/${slug}`}
        class="z-10 size-full rounded-lg"
        title="Preview"
      />
      <Badge class="absolute right-2 bottom-2 isolate z-10" variant="secondary">
        Preview
      </Badge>
    </>
  );
}
