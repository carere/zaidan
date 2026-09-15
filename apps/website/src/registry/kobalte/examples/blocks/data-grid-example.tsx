import type {
  ColumnDef,
  ColumnFiltersState,
  ColumnVisibilityState,
  PaginationState,
  RowPinningState,
  RowSelectionState,
  SortingState,
} from "@tanstack/solid-table";
import { createTable, filterFn_arrHas, filterFn_includesString } from "@tanstack/solid-table";
import {
  ArrowDownToLine,
  Banknote,
  CircleCheck,
  CircleDashed,
  Clock,
  Copy,
  Ellipsis,
  Eye,
  RotateCcw,
  Search,
  Send,
  Settings2,
  TriangleAlert,
  X,
} from "lucide-solid";
import { createSignal, Show } from "solid-js";
import { Example, ExampleWrapper } from "@/components/example";
import {
  DataGrid,
  DataGridColumnFilter,
  DataGridColumnHeader,
  DataGridColumnVisibility,
  DataGridContainer,
  type DataGridFeatures,
  DataGridPagination,
  DataGridScrollArea,
  DataGridTable,
  DataGridTableFootRow,
  DataGridTableFootRowCell,
  DataGridTableRowPin,
  DataGridTableRowSelect,
  DataGridTableRowSelectAll,
  dataGridFeatures,
} from "@/registry/kobalte/blocks/data-grid";
import { Avatar, AvatarFallback, AvatarImage } from "@/registry/kobalte/ui/avatar";
import { Badge } from "@/registry/kobalte/ui/badge";
import { Button } from "@/registry/kobalte/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/registry/kobalte/ui/dropdown-menu";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/registry/kobalte/ui/input-group";

export default function DataGridExample() {
  return (
    <ExampleWrapper class="lg:grid-cols-1 2xl:grid-cols-1">
      <Example title="Billing / Invoices" class="p-4 sm:p-6">
        <InvoicesDataGrid />
      </Example>
    </ExampleWrapper>
  );
}

type InvoiceStatus = "paid" | "open" | "overdue" | "draft" | "refunded";
type InvoicePlan = "Starter" | "Growth" | "Scale" | "Enterprise";

interface Invoice {
  id: string;
  number: string;
  customer: string;
  email: string;
  avatar: string;
  plan: InvoicePlan;
  status: InvoiceStatus;
  issuedAt: string;
  amount: number;
}

const avatarHandles = ["carere", "shadcn", "evilrabbit", "maxleiter", "pranathip", "leerob"];

const invoiceSeed: Omit<Invoice, "avatar">[] = [
  {
    id: "inv_2481",
    number: "INV-2481",
    customer: "Priya Raghunathan",
    email: "priya@northwind.dev",
    plan: "Scale",
    status: "paid",
    issuedAt: "2026-07-28",
    amount: 4820,
  },
  {
    id: "inv_2480",
    number: "INV-2480",
    customer: "Marcus Feld",
    email: "marcus@lumenlabs.io",
    plan: "Growth",
    status: "overdue",
    issuedAt: "2026-07-27",
    amount: 1290,
  },
  {
    id: "inv_2479",
    number: "INV-2479",
    customer: "Hana Okabe",
    email: "hana@fernstack.jp",
    plan: "Enterprise",
    status: "open",
    issuedAt: "2026-07-26",
    amount: 12400,
  },
  {
    id: "inv_2478",
    number: "INV-2478",
    customer: "Tomas Ferreira",
    email: "tomas@velaship.pt",
    plan: "Starter",
    status: "draft",
    issuedAt: "2026-07-25",
    amount: 290,
  },
  {
    id: "inv_2477",
    number: "INV-2477",
    customer: "Aisha Bello",
    email: "aisha@kobostudio.co",
    plan: "Growth",
    status: "paid",
    issuedAt: "2026-07-24",
    amount: 1290,
  },
  {
    id: "inv_2476",
    number: "INV-2476",
    customer: "Lena Hoffmann",
    email: "lena@meridian.de",
    plan: "Scale",
    status: "refunded",
    issuedAt: "2026-07-23",
    amount: 4820,
  },
  {
    id: "inv_2475",
    number: "INV-2475",
    customer: "Diego Salcedo",
    email: "diego@altamar.mx",
    plan: "Growth",
    status: "overdue",
    issuedAt: "2026-07-21",
    amount: 1740,
  },
  {
    id: "inv_2474",
    number: "INV-2474",
    customer: "Ingrid Vale",
    email: "ingrid@northsound.no",
    plan: "Enterprise",
    status: "paid",
    issuedAt: "2026-07-20",
    amount: 15600,
  },
  {
    id: "inv_2473",
    number: "INV-2473",
    customer: "Samuel Oduya",
    email: "samuel@tidepool.co",
    plan: "Starter",
    status: "open",
    issuedAt: "2026-07-19",
    amount: 290,
  },
  {
    id: "inv_2472",
    number: "INV-2472",
    customer: "Camille Ruiz",
    email: "camille@petitjardin.fr",
    plan: "Growth",
    status: "paid",
    issuedAt: "2026-07-18",
    amount: 1290,
  },
  {
    id: "inv_2471",
    number: "INV-2471",
    customer: "Noah Bergstrom",
    email: "noah@fjordbyte.se",
    plan: "Scale",
    status: "open",
    issuedAt: "2026-07-16",
    amount: 5240,
  },
  {
    id: "inv_2470",
    number: "INV-2470",
    customer: "Wei Zhang",
    email: "wei@hanzogrid.com",
    plan: "Enterprise",
    status: "paid",
    issuedAt: "2026-07-15",
    amount: 18900,
  },
  {
    id: "inv_2469",
    number: "INV-2469",
    customer: "Fatima Al-Khalidi",
    email: "fatima@qasrcloud.ae",
    plan: "Growth",
    status: "paid",
    issuedAt: "2026-07-14",
    amount: 1290,
  },
  {
    id: "inv_2468",
    number: "INV-2468",
    customer: "Oliver Brandt",
    email: "oliver@quaystreet.uk",
    plan: "Starter",
    status: "overdue",
    issuedAt: "2026-07-12",
    amount: 380,
  },
  {
    id: "inv_2467",
    number: "INV-2467",
    customer: "Sofia Marchetti",
    email: "sofia@trelune.it",
    plan: "Scale",
    status: "paid",
    issuedAt: "2026-07-11",
    amount: 4820,
  },
  {
    id: "inv_2466",
    number: "INV-2466",
    customer: "Jonas Vikander",
    email: "jonas@skogsdata.fi",
    plan: "Growth",
    status: "refunded",
    issuedAt: "2026-07-10",
    amount: 1740,
  },
  {
    id: "inv_2465",
    number: "INV-2465",
    customer: "Maya Cordero",
    email: "maya@puertoloop.cl",
    plan: "Starter",
    status: "draft",
    issuedAt: "2026-07-09",
    amount: 290,
  },
  {
    id: "inv_2464",
    number: "INV-2464",
    customer: "Elias Novak",
    email: "elias@vltavaworks.cz",
    plan: "Enterprise",
    status: "open",
    issuedAt: "2026-07-07",
    amount: 11250,
  },
  {
    id: "inv_2463",
    number: "INV-2463",
    customer: "Rin Watanabe",
    email: "rin@shiokaze.jp",
    plan: "Growth",
    status: "paid",
    issuedAt: "2026-07-06",
    amount: 1290,
  },
  {
    id: "inv_2462",
    number: "INV-2462",
    customer: "Peter Amankwah",
    email: "peter@baobabpay.gh",
    plan: "Scale",
    status: "overdue",
    issuedAt: "2026-07-04",
    amount: 5240,
  },
  {
    id: "inv_2461",
    number: "INV-2461",
    customer: "Clara Bouchard",
    email: "clara@rivelune.ca",
    plan: "Growth",
    status: "paid",
    issuedAt: "2026-07-03",
    amount: 1740,
  },
  {
    id: "inv_2460",
    number: "INV-2460",
    customer: "Amir Haddad",
    email: "amir@cedarbyte.lb",
    plan: "Starter",
    status: "open",
    issuedAt: "2026-07-02",
    amount: 380,
  },
  {
    id: "inv_2459",
    number: "INV-2459",
    customer: "Grace Whitfield",
    email: "grace@harborline.us",
    plan: "Enterprise",
    status: "paid",
    issuedAt: "2026-07-01",
    amount: 15600,
  },
  {
    id: "inv_2458",
    number: "INV-2458",
    customer: "Iván Delgado",
    email: "ivan@solventa.es",
    plan: "Scale",
    status: "refunded",
    issuedAt: "2026-06-30",
    amount: 4820,
  },
];

const invoiceData: Invoice[] = invoiceSeed.map((invoice, index) => ({
  ...invoice,
  avatar: `https://github.com/${avatarHandles[index % avatarHandles.length]}.png`,
}));

const statusMeta: Record<
  InvoiceStatus,
  {
    label: string;
    variant: "success-light" | "info-light" | "destructive-light" | "warning-light" | "secondary";
  }
> = {
  paid: { label: "Paid", variant: "success-light" },
  open: { label: "Open", variant: "info-light" },
  overdue: { label: "Overdue", variant: "destructive-light" },
  refunded: { label: "Refunded", variant: "warning-light" },
  draft: { label: "Draft", variant: "secondary" },
};

const statusOptions = [
  { label: "Paid", value: "paid", icon: CircleCheck },
  { label: "Open", value: "open", icon: Clock },
  { label: "Overdue", value: "overdue", icon: TriangleAlert },
  { label: "Refunded", value: "refunded", icon: RotateCcw },
  { label: "Draft", value: "draft", icon: CircleDashed },
];

const planOptions = [
  { label: "Starter", value: "Starter" },
  { label: "Growth", value: "Growth" },
  { label: "Scale", value: "Scale" },
  { label: "Enterprise", value: "Enterprise" },
];

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function formatAmount(amount: number) {
  return currencyFormatter.format(amount);
}

function formatIssuedAt(isoDate: string) {
  return dateFormatter.format(new Date(`${isoDate}T00:00:00`));
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);
}

const columns: ColumnDef<DataGridFeatures, Invoice>[] = [
  {
    accessorKey: "id",
    id: "select",
    header: () => <DataGridTableRowSelectAll />,
    cell: ({ row }) => <DataGridTableRowSelect row={row} />,
    size: 40,
    enableSorting: false,
    enableHiding: false,
    enableResizing: false,
    enableGlobalFilter: false,
    meta: { headerTitle: "Select" },
  },
  {
    accessorKey: "number",
    id: "number",
    header: ({ column }) => <DataGridColumnHeader column={column} title="Invoice" visibility />,
    cell: (info) => (
      <span class="font-medium text-foreground tabular-nums">{info.getValue<string>()}</span>
    ),
    size: 104,
    sortFn: "text",
    enableHiding: false,
    meta: { headerTitle: "Invoice" },
  },
  {
    accessorFn: (row: Invoice) => `${row.customer} ${row.email}`,
    id: "customer",
    header: ({ column }) => <DataGridColumnHeader column={column} title="Customer" visibility />,
    cell: ({ row }) => (
      <div class="flex items-center gap-2.5">
        <Avatar class="size-8">
          <AvatarImage src={row.original.avatar} alt={row.original.customer} />
          <AvatarFallback class="text-[0.625rem]">
            {getInitials(row.original.customer)}
          </AvatarFallback>
        </Avatar>
        <div class="min-w-0 space-y-px">
          <div class="truncate font-medium text-foreground">{row.original.customer}</div>
          <div class="truncate text-muted-foreground text-xs">{row.original.email}</div>
        </div>
      </div>
    ),
    size: 200,
    sortFn: "text",
    enableHiding: false,
    meta: { headerTitle: "Customer", autoSize: true },
  },
  {
    accessorKey: "status",
    id: "status",
    header: ({ column }) => <DataGridColumnHeader column={column} title="Status" visibility />,
    cell: ({ row }) => (
      <Badge variant={statusMeta[row.original.status].variant}>
        {statusMeta[row.original.status].label}
      </Badge>
    ),
    size: 112,
    sortFn: "text",
    filterFn: filterFn_arrHas,
    enableGlobalFilter: false,
    meta: { headerTitle: "Status" },
  },
  {
    accessorKey: "plan",
    id: "plan",
    header: ({ column }) => <DataGridColumnHeader column={column} title="Plan" visibility />,
    cell: (info) => <span class="text-foreground">{info.getValue<string>()}</span>,
    size: 104,
    sortFn: "text",
    filterFn: filterFn_arrHas,
    enableGlobalFilter: false,
    meta: { headerTitle: "Plan" },
  },
  {
    accessorKey: "issuedAt",
    id: "issuedAt",
    header: ({ column }) => <DataGridColumnHeader column={column} title="Issued" visibility />,
    cell: (info) => (
      <span class="text-muted-foreground">{formatIssuedAt(info.getValue<string>())}</span>
    ),
    size: 116,
    sortFn: "text",
    enableGlobalFilter: false,
    meta: { headerTitle: "Issued" },
  },
  {
    accessorKey: "amount",
    id: "amount",
    header: ({ column }) => (
      <DataGridColumnHeader class="ms-auto" column={column} title="Amount" visibility />
    ),
    cell: (info) => (
      <span class="font-medium text-foreground tabular-nums">
        {formatAmount(info.getValue<number>())}
      </span>
    ),
    size: 116,
    enableGlobalFilter: false,
    meta: {
      headerTitle: "Amount",
      headerClassName: "text-end rtl:text-start",
      cellClassName: "text-end rtl:text-start",
    },
  },
  {
    accessorKey: "id",
    id: "actions",
    header: "",
    cell: ({ row }) => (
      <div class="flex items-center justify-end gap-0.5">
        <DataGridTableRowPin row={row} />
        <DropdownMenu placement="bottom-end">
          <DropdownMenuTrigger
            as={Button}
            variant="ghost"
            size="icon-sm"
            aria-label={`Actions for ${row.original.number}`}
            onClick={(event: MouseEvent) => event.stopPropagation()}
          >
            <Ellipsis class="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent class="w-44">
            <DropdownMenuItem>
              <Eye class="size-3.5!" />
              View invoice
            </DropdownMenuItem>
            <DropdownMenuItem>
              <ArrowDownToLine class="size-3.5!" />
              Download PDF
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Send class="size-3.5!" />
              Send reminder
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Copy class="size-3.5!" />
              Copy invoice ID
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    ),
    size: 84,
    enableSorting: false,
    enableHiding: false,
    enableResizing: false,
    enableGlobalFilter: false,
    meta: {
      headerTitle: "Actions",
      headerClassName: "text-end rtl:text-start",
      cellClassName: "text-end rtl:text-start",
    },
  },
];

function InvoicesDataGrid() {
  const [invoices, setInvoices] = createSignal<Invoice[]>(invoiceData);
  const [pagination, setPagination] = createSignal<PaginationState>({ pageIndex: 0, pageSize: 8 });
  const [sorting, setSorting] = createSignal<SortingState>([{ id: "issuedAt", desc: true }]);
  const [rowSelection, setRowSelection] = createSignal<RowSelectionState>({});
  const [rowPinning, setRowPinning] = createSignal<RowPinningState>({ top: [], bottom: [] });
  const [columnFilters, setColumnFilters] = createSignal<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = createSignal<ColumnVisibilityState>({});
  const [search, setSearch] = createSignal("");

  const table = createTable({
    features: dataGridFeatures,
    columns,
    get data() {
      return invoices();
    },
    getRowId: (row: Invoice) => row.id,
    enableRowSelection: true,
    enableRowPinning: true,
    keepPinnedRows: true,
    globalFilterFn: filterFn_includesString,
    state: {
      get pagination() {
        return pagination();
      },
      get sorting() {
        return sorting();
      },
      get rowSelection() {
        return rowSelection();
      },
      get rowPinning() {
        return rowPinning();
      },
      get columnFilters() {
        return columnFilters();
      },
      get columnVisibility() {
        return columnVisibility();
      },
      get globalFilter() {
        return search();
      },
    },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onRowPinningChange: setRowPinning,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setSearch,
  });

  const matchedRows = () => table.getFilteredRowModel().rows;
  const matchedTotal = () => matchedRows().reduce((total, row) => total + row.original.amount, 0);
  const outstandingTotal = () =>
    invoices()
      .filter((invoice) => invoice.status === "open" || invoice.status === "overdue")
      .reduce((total, invoice) => total + invoice.amount, 0);

  const selectedIds = () => Object.keys(rowSelection()).filter((id) => rowSelection()[id]);
  const selectedTotal = () =>
    invoices()
      .filter((invoice) => selectedIds().includes(invoice.id))
      .reduce((total, invoice) => total + invoice.amount, 0);

  const isFiltered = () => columnFilters().length > 0 || search().length > 0;

  const resetFilters = () => {
    setColumnFilters([]);
    setSearch("");
  };

  const markSelectedAsPaid = () => {
    const ids = new Set(selectedIds());
    setInvoices((current) =>
      current.map((invoice) =>
        ids.has(invoice.id) && invoice.status !== "draft"
          ? { ...invoice, status: "paid" satisfies InvoiceStatus }
          : invoice,
      ),
    );
    setRowSelection({});
  };

  return (
    <DataGrid
      table={table}
      recordCount={matchedRows().length}
      tableLayout={{
        columnsMovable: true,
        columnsPinnable: true,
        columnsResizable: true,
        columnsResizeMode: "onChange",
        columnsVisibility: true,
        footerBackground: true,
        headerBackground: true,
        headerSticky: true,
        rowsPinnable: true,
      }}
      emptyMessage="No invoices match these filters."
    >
      <div class="w-full space-y-4">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="space-y-1">
            <h3 class="font-semibold text-base leading-none">Invoices</h3>
            <p class="text-muted-foreground text-xs">
              {invoices().length} invoices this cycle · {formatAmount(outstandingTotal())}{" "}
              outstanding
            </p>
          </div>
          <div class="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <ArrowDownToLine class="size-4" />
              Export
            </Button>
            <DataGridColumnVisibility
              table={table}
              trigger={(triggerProps) => (
                <Button {...triggerProps} variant="outline" size="sm">
                  <Settings2 class="size-4" />
                  Columns
                </Button>
              )}
            />
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <InputGroup class="w-full sm:w-64">
            <InputGroupAddon>
              <Search class="size-4 text-muted-foreground" />
            </InputGroupAddon>
            <InputGroupInput
              placeholder="Search customer or invoice"
              value={search()}
              onInput={(event) => setSearch(event.currentTarget.value)}
            />
          </InputGroup>
          <DataGridColumnFilter
            column={table.getColumn("status")}
            title="Status"
            options={statusOptions}
          />
          <DataGridColumnFilter
            column={table.getColumn("plan")}
            title="Plan"
            options={planOptions}
          />
          <Show when={isFiltered()}>
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              Reset
              <X class="size-4" />
            </Button>
          </Show>
        </div>

        <Show when={selectedIds().length > 0}>
          <div class="flex flex-wrap items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
            <span class="font-medium text-foreground">
              {selectedIds().length} selected · {formatAmount(selectedTotal())}
            </span>
            <div class="ms-auto flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={markSelectedAsPaid}>
                <Banknote class="size-4" />
                Mark as paid
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setRowSelection({})}>
                Clear
              </Button>
            </div>
          </div>
        </Show>

        <DataGridContainer class="rounded-lg border">
          {/* The scroll viewport is capped rather than fixed, so the sticky
              header engages on the larger page sizes while a filtered-down
              grid still collapses to its rows instead of leaving dead space. */}
          <DataGridScrollArea class="[&>[data-slot=scroll-area-viewport]]:h-auto [&>[data-slot=scroll-area-viewport]]:max-h-[32rem]">
            <DataGridTable
              footerContent={
                <DataGridTableFootRow>
                  <DataGridTableFootRowCell colSpan={table.getVisibleLeafColumns().length}>
                    <div class="flex items-center justify-between gap-4">
                      <span class="text-muted-foreground">
                        {matchedRows().length} of {invoices().length} invoices
                      </span>
                      <span class="text-foreground tabular-nums">
                        {formatAmount(matchedTotal())}
                      </span>
                    </div>
                  </DataGridTableFootRowCell>
                </DataGridTableFootRow>
              }
            />
          </DataGridScrollArea>
        </DataGridContainer>

        <DataGridPagination sizes={[8, 16, 24]} info="{from} - {to} of {count} invoices" />
      </div>
    </DataGrid>
  );
}
