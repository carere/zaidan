import { PreviewBadgeNav } from "@/components/preview-badge-nav";

export function Preview({ slug }: { slug: string }) {
  let iframeRef: HTMLIFrameElement | undefined;

  return (
    <div class="relative z-0 mx-auto 3xl:max-h-[1200px] w-full 3xl:max-w-[1800px] flex-1 overflow-hidden rounded-2xl ring-1 ring-foreground/15">
      <iframe
        ref={iframeRef}
        src={`/preview/kobalte/${slug}`}
        class="z-10 size-full rounded-lg"
        title="Preview"
      />
      <PreviewBadgeNav slug={slug} class="absolute right-2 bottom-2 isolate z-10" />
    </div>
  );
}
