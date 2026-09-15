import { ContributionHistory } from "@/components/home/cards/contribution-history";
import { DividendIncome } from "@/components/home/cards/dividend-income";
import { NotificationSettings } from "@/components/home/cards/notification-settings";
import { PowerUsage } from "@/components/home/cards/power-usage";
import { QrConnect } from "@/components/home/cards/qr-connect";
import {
  KitchenIsland,
  PayoutThresholdCard,
  RollerShades,
  StockPerformance,
  UpcomingPayments,
} from "../manual-cards";
import { AccountAccess } from "./cards/account-access";
import { CardOverview } from "./cards/card-overview";
import { ClaimableBalance } from "./cards/claimable-balance";
import { CoverArt } from "./cards/cover-art";
import { EmptyConnectBank } from "./cards/empty-connect-bank";
import { EmptyDistributeTrack } from "./cards/empty-distribute-track";
import { EmptyExploreCatalog } from "./cards/empty-explore-catalog";
import { Faq } from "./cards/faq";
import { FrontDoor } from "./cards/front-door";
import { IndexInvesting } from "./cards/index-investing";
import { LoadingCard } from "./cards/loading-card";
import { NewMilestone } from "./cards/new-milestone";
import { Payments } from "./cards/payments";
import { Preferences } from "./cards/preferences";
import { ReceivingMethod } from "./cards/receiving-method";
import { RecentTransactions } from "./cards/recent-transactions";
import { ReleaseCatalog } from "./cards/release-catalog";
import { SavingsProgress } from "./cards/savings-progress";
import { SavingsTargets } from "./cards/savings-targets";
import { SidebarNav } from "./cards/sidebar-nav";
import { SocialLinks } from "./cards/social-links";
import { SyncingState } from "./cards/syncing-state";
import { TransferFunds } from "./cards/transfer-funds";

export function Preview02Showcase() {
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
            <IndexInvesting />
            <SyncingState />
          </div>
          <div class="flex flex-col p-1 [contain-intrinsic-size:380px_1200px] [content-visibility:auto]">
            <PayoutThresholdCard />
            <ClaimableBalance />
            <Preferences />
            <SavingsProgress />
            <KitchenIsland />
          </div>
          <div class="col-span-2 flex flex-col p-1 [contain-intrinsic-size:760px_1200px] [content-visibility:auto]">
            <SavingsTargets />
            <RecentTransactions />
            <div class="grid grid-cols-2 items-start gap-(--gap)">
              <div class="flex flex-col gap-(--gap)">
                <SidebarNav />
                <Faq />
              </div>
              <div class="flex flex-col gap-(--gap)">
                <Payments />
                <FrontDoor />
              </div>
            </div>
            <ReleaseCatalog />
          </div>
          <div class="flex flex-col p-1 [contain-intrinsic-size:380px_1200px] [content-visibility:auto]">
            <AccountAccess />
            <CardOverview />
            <TransferFunds />
            <CoverArt />
            <LoadingCard />
          </div>
          <div class="flex flex-col p-1 [contain-intrinsic-size:380px_1200px] [content-visibility:auto]">
            <ReceivingMethod />
            <PowerUsage />
            <EmptyConnectBank />
            <UpcomingPayments />
            <RollerShades />
          </div>
          <div class="flex flex-col p-1 [contain-intrinsic-size:380px_1200px] [content-visibility:auto]">
            <StockPerformance />
            <EmptyExploreCatalog />
            <NewMilestone />
            <SocialLinks />
            <NotificationSettings />
          </div>
        </div>
      </div>
    </div>
  );
}
