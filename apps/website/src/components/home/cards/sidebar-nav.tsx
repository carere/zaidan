import {
  Activity,
  ArrowRightLeft,
  Bell,
  BookOpen,
  Calendar,
  ChartBar,
  ChartNoAxesCombined,
  ChartPie,
  CircleHelp,
  CreditCard,
  FileText,
  Globe,
  Landmark,
  MessageCircle,
  Palette,
  Shield,
  Target,
  TrendingUp,
  User,
  Wallet,
} from "lucide-solid";
import type { JSX } from "solid-js";
import { splitProps } from "solid-js";
import { cn } from "@/lib/utils";
import { Card } from "@/registry/kobalte/ui/card";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/registry/kobalte/ui/sidebar";

type SidebarSectionProps = {
  label: string;
  children: JSX.Element;
  class?: string;
};

function SidebarSection(props: SidebarSectionProps) {
  const [local] = splitProps(props, ["label", "children", "class"]);

  return (
    <Card class={cn("w-full overflow-hidden rounded-3xl py-0", local.class)}>
      <SidebarProvider class="min-h-0">
        <Sidebar collapsible="none" class="w-full bg-transparent">
          <SidebarContent class="gap-0 overflow-hidden">
            <SidebarGroup>
              <SidebarGroupLabel>{local.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu class="gap-1">{local.children}</SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
      </SidebarProvider>
    </Card>
  );
}

export function SidebarNav() {
  return (
    <div class="grid w-full grid-cols-2 gap-4 xl:gap-6">
      <SidebarSection label="Overview" class="xl:col-start-1 xl:row-start-2">
        <SidebarMenuItem>
          <SidebarMenuButton isActive>
            <ChartNoAxesCombined />
            Analytics
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton>
            <ArrowRightLeft />
            Transactions
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton>
            <TrendingUp />
            Investments
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton>
            <Landmark />
            Accounts
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton>
            <ChartPie />
            Spending
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarSection>

      <SidebarSection label="Planning" class="xl:col-start-1 xl:row-start-1">
        <SidebarMenuItem>
          <SidebarMenuButton>
            <FileText />
            Documents
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton>
            <Wallet />
            Budget
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton>
            <ChartBar />
            Reports
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton>
            <Target />
            Goals
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton>
            <Calendar />
            Calendar
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarSection>

      <SidebarSection label="Support" class="flex xl:col-start-2 xl:row-start-1">
        <SidebarMenuItem>
          <SidebarMenuButton>
            <CircleHelp />
            Help Center
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton>
            <BookOpen />
            Docs
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton>
            <MessageCircle />
            Contact Us
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton>
            <Activity />
            Status
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton>
            <Globe />
            Community
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarSection>

      <SidebarSection label="Account" class="flex xl:col-start-2 xl:row-start-2">
        <SidebarMenuItem>
          <SidebarMenuButton>
            <User />
            Profile
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton isActive>
            <CreditCard />
            Billing
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton>
            <Bell />
            Notifications
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton>
            <Shield />
            Security
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton>
            <Palette />
            Appearance
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarSection>
    </div>
  );
}
