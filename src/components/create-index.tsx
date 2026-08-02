import { AccountAccess } from "@/components/home/cards/account-access";
import { AnalyticsCard } from "@/components/home/cards/analytics-card";
import { ClaimableBalance } from "@/components/home/cards/claimable-balance";
import { ContributionHistory } from "@/components/home/cards/contribution-history";
import { DividendIncome } from "@/components/home/cards/dividend-income";
import { EmptyDistributeTrack } from "@/components/home/cards/empty-distribute-track";
import { MessageScrollerPlaceholder } from "@/components/home/cards/message-scroller-placeholder";
import { NewMilestone } from "@/components/home/cards/new-milestone";
import { NotificationSettings } from "@/components/home/cards/notification-settings";
import { Payments } from "@/components/home/cards/payments";
import { PayoutThreshold } from "@/components/home/cards/payout-threshold";
import { PowerUsage } from "@/components/home/cards/power-usage";
import { QrConnect } from "@/components/home/cards/qr-connect";
import { SavingsTargets } from "@/components/home/cards/savings-targets";
import { SidebarNav } from "@/components/home/cards/sidebar-nav";
import { UIElements } from "@/components/home/cards/ui-elements";

export function CreateIndex() {
  return (
    <div class="overflow-x-auto overflow-y-hidden bg-muted contain-[paint] [--gap:--spacing(4)] md:[--gap:--spacing(10)] 3xl:[--gap:--spacing(12)] dark:bg-background style-lyra:md:[--gap:--spacing(6)] style-mira:md:[--gap:--spacing(6)]">
      <div class="flex w-full min-w-max justify-center">
        <div
          data-slot="capture-target"
          class="grid w-[2400px] grid-cols-7 items-start gap-(--gap) bg-muted p-(--gap) md:w-[3000px] dark:bg-background style-lyra:md:w-[2600px] style-mira:md:w-[2600px] *:[div]:gap-(--gap)"
        >
          <div class="flex flex-col p-1 [contain-intrinsic-size:380px_1200px] [content-visibility:auto]">
            <ContributionHistory />
            <EmptyDistributeTrack />
            <QrConnect />
            <DividendIncome />
          </div>
          <div class="flex flex-col p-1 [contain-intrinsic-size:380px_1200px] [content-visibility:auto]">
            <PayoutThreshold />
            <ClaimableBalance />
            <PowerUsage />
            <NotificationSettings />
          </div>
          <div class="col-span-2 flex flex-col p-1 [contain-intrinsic-size:760px_1200px] [content-visibility:auto]">
            <SavingsTargets />
            <div class="grid grid-cols-2 items-start gap-(--gap)">
              <div class="flex flex-col gap-(--gap)">
                <SidebarNav />
                <AccountAccess />
              </div>
              <div class="flex flex-col gap-(--gap)">
                <Payments />
                <MessageScrollerPlaceholder />
              </div>
            </div>
            <AnalyticsCard />
          </div>
          <div class="flex flex-col p-1 [contain-intrinsic-size:380px_1200px] [content-visibility:auto]">
            <AccountAccess />
            <UIElements />
            <NewMilestone />
          </div>
          <div class="flex flex-col p-1 [contain-intrinsic-size:380px_1200px] [content-visibility:auto]">
            <PowerUsage />
            <Payments />
            <QrConnect />
          </div>
          <div class="flex flex-col p-1 [contain-intrinsic-size:380px_1200px] [content-visibility:auto]">
            <AnalyticsCard />
            <NotificationSettings />
            <ClaimableBalance />
            <NewMilestone />
          </div>
        </div>
      </div>
    </div>
  );
}
