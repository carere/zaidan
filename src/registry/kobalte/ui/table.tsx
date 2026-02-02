import { type ComponentProps, splitProps } from "solid-js";
import { cn } from "@/lib/utils";

type TableProps = ComponentProps<"table">;

const Table = (props: TableProps) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <div data-slot="table-container" class="z-table-container">
      <table data-slot="table" class={cn("z-table", local.class)} {...others} />
    </div>
  );
};

type TableHeaderProps = ComponentProps<"thead">;

const TableHeader = (props: TableHeaderProps) => {
  const [local, others] = splitProps(props, ["class"]);
  return <thead data-slot="table-header" class={cn("z-table-header", local.class)} {...others} />;
};

type TableBodyProps = ComponentProps<"tbody">;

const TableBody = (props: TableBodyProps) => {
  const [local, others] = splitProps(props, ["class"]);
  return <tbody data-slot="table-body" class={cn("z-table-body", local.class)} {...others} />;
};

type TableFooterProps = ComponentProps<"tfoot">;

const TableFooter = (props: TableFooterProps) => {
  const [local, others] = splitProps(props, ["class"]);
  return <tfoot data-slot="table-footer" class={cn("z-table-footer", local.class)} {...others} />;
};

type TableRowProps = ComponentProps<"tr">;

const TableRow = (props: TableRowProps) => {
  const [local, others] = splitProps(props, ["class"]);
  return <tr data-slot="table-row" class={cn("z-table-row", local.class)} {...others} />;
};

type TableHeadProps = ComponentProps<"th">;

const TableHead = (props: TableHeadProps) => {
  const [local, others] = splitProps(props, ["class"]);
  return <th data-slot="table-head" class={cn("z-table-head", local.class)} {...others} />;
};

type TableCellProps = ComponentProps<"td">;

const TableCell = (props: TableCellProps) => {
  const [local, others] = splitProps(props, ["class"]);
  return <td data-slot="table-cell" class={cn("z-table-cell", local.class)} {...others} />;
};

type TableCaptionProps = ComponentProps<"caption">;

const TableCaption = (props: TableCaptionProps) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <caption data-slot="table-caption" class={cn("z-table-caption", local.class)} {...others} />
  );
};

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption };
