import { UIElements } from "@/components/home/cards/ui-elements";
import type { DesignSystemConfig } from "@/lib/types";
import {
  BarChartCard,
  CodespacesCard,
  LiveWaveformCard,
  StyleOverview,
  TypographySpecimen,
} from "../manual-cards";
import { ActivateAgentDialog } from "./cards/activate-agent-dialog";
import { AnalyticsCard } from "./cards/analytics-card";
import { AnomalyAlert } from "./cards/anomaly-alert";
import { BookAppointment } from "./cards/book-appointment";
import { ContributionsActivity } from "./cards/contributions-activity";
import { Contributors } from "./cards/contributors";
import { EnvironmentVariables } from "./cards/environment-variables";
import { FeedbackForm } from "./cards/feedback-form";
import { FileUpload } from "./cards/file-upload";
import { GithubProfile } from "./cards/github-profile";
import { IconPreviewGrid } from "./cards/icon-preview-grid";
import { InviteTeam } from "./cards/invite-team";
import { Invoice } from "./cards/invoice";
import { NoTeamMembers } from "./cards/no-team-members";
import { NotFound } from "./cards/not-found";
import { ObservabilityCard } from "./cards/observability-card";
import { PieChartCard } from "./cards/pie-chart-card";
import { ReportBug } from "./cards/report-bug";
import { ShippingAddress } from "./cards/shipping-address";
import { Shortcuts } from "./cards/shortcuts";
import { SkeletonLoading } from "./cards/skeleton-loading";
import { SleepReport } from "./cards/sleep-report";
import { UsageCard } from "./cards/usage-card";
import { Visitors } from "./cards/visitors";
import { WeeklyFitnessSummary } from "./cards/weekly-fitness-summary";

export function PreviewShowcase(props: { config: DesignSystemConfig }) {
  return (
    <div class="overflow-x-auto overflow-y-hidden bg-muted contain-[paint] [--gap:--spacing(4)] md:[--gap:--spacing(10)] 3xl:[--gap:--spacing(12)] dark:bg-background style-lyra:md:[--gap:--spacing(6)] style-mira:md:[--gap:--spacing(6)]">
      <div class="flex w-full min-w-max justify-center">
        <div
          data-slot="capture-target"
          class="grid w-[2400px] grid-cols-7 items-start gap-(--gap) bg-muted p-(--gap) md:w-[3000px] dark:bg-background style-lyra:md:w-[2600px] style-mira:md:w-[2600px] *:[div]:gap-(--gap)"
        >
          <div class="flex flex-col p-px [contain-intrinsic-size:380px_1200px] [content-visibility:auto]">
            <StyleOverview config={props.config} />
            <TypographySpecimen config={props.config} />
            <div class="md:hidden">
              <UIElements />
            </div>
            <CodespacesCard />
            <Invoice />
          </div>
          <div class="flex flex-col p-px [contain-intrinsic-size:380px_1200px] [content-visibility:auto]">
            <IconPreviewGrid />
            <div class="hidden w-full md:flex">
              <UIElements />
            </div>
            <ObservabilityCard />
            <ShippingAddress />
          </div>
          <div class="flex flex-col p-px [contain-intrinsic-size:380px_1200px] [content-visibility:auto]">
            <EnvironmentVariables />
            <BarChartCard config={props.config} />
            <InviteTeam />
            <ActivateAgentDialog />
          </div>
          <div class="flex flex-col p-px [contain-intrinsic-size:380px_1200px] [content-visibility:auto]">
            <SkeletonLoading />
            <PieChartCard />
            <NoTeamMembers />
            <ReportBug />
            <Contributors />
          </div>
          <div class="flex flex-col p-px [contain-intrinsic-size:380px_1200px] [content-visibility:auto]">
            <FeedbackForm />
            <BookAppointment />
            <SleepReport />
            <GithubProfile />
          </div>
          <div class="flex flex-col p-px [contain-intrinsic-size:380px_1200px] [content-visibility:auto]">
            <WeeklyFitnessSummary />
            <FileUpload />
            <AnalyticsCard />
            <UsageCard />
            <Shortcuts />
          </div>
          <div class="flex flex-col p-px [contain-intrinsic-size:380px_1200px] [content-visibility:auto]">
            <AnomalyAlert />
            <LiveWaveformCard />
            <Visitors />
            <ContributionsActivity />
            <NotFound />
          </div>
        </div>
      </div>
    </div>
  );
}
