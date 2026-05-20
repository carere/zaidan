import { Example, ExampleWrapper } from "@/components/example";
import DataGridPaginationExample from "@/registry/kobalte/examples/blocks/reui-data-grid-1-example";
import DataGridSortableExample from "@/registry/kobalte/examples/blocks/reui-data-grid-11-example";
import DataGridColumnControlsExample from "@/registry/kobalte/examples/blocks/reui-data-grid-18-example";
import DataGridColumnVisibilityExample from "@/registry/kobalte/examples/blocks/reui-data-grid-20-example";
import DataGridCrudExample from "@/registry/kobalte/examples/blocks/reui-data-grid-22-example";

export default function ReuiDataGridExample() {
  return (
    <ExampleWrapper class="lg:grid-cols-1 2xl:grid-cols-1">
      <Example title="Basic with pagination">
        <DataGridPaginationExample />
      </Example>
      <Example title="Sortable columns">
        <DataGridSortableExample />
      </Example>
      <Example title="Column controls">
        <DataGridColumnControlsExample />
      </Example>
      <Example title="Column visibility">
        <DataGridColumnVisibilityExample />
      </Example>
      <Example title="Search and filter">
        <DataGridCrudExample />
      </Example>
    </ExampleWrapper>
  );
}
