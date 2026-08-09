import { Example, ExampleWrapper } from "@/components/example";
import { Field, FieldLabel } from "@/registry/kobalte/ui/field";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/registry/kobalte/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/registry/kobalte/ui/select";

export default function PaginationExample() {
  return (
    <ExampleWrapper>
      <PaginationBasic />
      <PaginationSimple />
      <PaginationIconsOnly />
    </ExampleWrapper>
  );
}

function PaginationBasic() {
  return (
    <Example title="Basic">
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious href="#" />
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="#">1</PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="#" isActive>
              2
            </PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="#">3</PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationEllipsis />
          </PaginationItem>
          <PaginationItem>
            <PaginationNext href="#" />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </Example>
  );
}

function PaginationSimple() {
  return (
    <Example title="Simple">
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationLink href="#">1</PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="#" isActive>
              2
            </PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="#">3</PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="#">4</PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="#">5</PaginationLink>
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </Example>
  );
}

function PaginationIconsOnly() {
  return (
    <Example title="With Select">
      <div class="flex items-center justify-between gap-4">
        <Field orientation="horizontal" class="w-fit">
          <FieldLabel for="select-rows-per-page">Rows per page</FieldLabel>
          <Select
            options={["10", "25", "50", "100"]}
            defaultValue="25"
            itemComponent={(props) => (
              <SelectItem item={props.item}>{props.item.rawValue}</SelectItem>
            )}
          >
            <SelectTrigger class="w-20" id="select-rows-per-page">
              <SelectValue<string>>{(state) => state.selectedOption()}</SelectValue>
            </SelectTrigger>
            <SelectContent />
          </Select>
        </Field>
        <Pagination class="mx-0 w-auto">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious href="#" />
            </PaginationItem>
            <PaginationItem>
              <PaginationNext href="#" />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </Example>
  );
}
