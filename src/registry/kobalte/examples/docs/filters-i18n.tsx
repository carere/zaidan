import { Building, ChevronDown, CircleCheck, ListFilter, Mail, MapPin, User } from "lucide-solid";
import { type ComponentProps, createSignal, For } from "solid-js";
import {
  createFilter,
  type Filter,
  type FilterFieldConfig,
  type FilterI18nConfig,
  Filters,
} from "@/registry/kobalte/blocks/filters";
import { Button } from "@/registry/kobalte/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/registry/kobalte/ui/dropdown-menu";

type Language = "en" | "es" | "fr" | "de" | "ja";

// `i18n` accepts a partial override: anything omitted falls back to the block's
// English defaults, so a locale only has to declare what it changes.
const i18nConfigs: Record<Language, Partial<FilterI18nConfig>> = {
  en: {
    addFilter: "Add filter",
    searchFields: "Search fields...",
    noFieldsFound: "No fields found.",
    noResultsFound: "No results found.",
    select: "Select...",
    selectedCount: "selected",
    operators: {
      is: "is",
      isNot: "is not",
      isAnyOf: "is any of",
      isNotAnyOf: "is not any of",
      includesAll: "includes all",
      excludesAll: "excludes all",
      before: "before",
      after: "after",
      between: "between",
      notBetween: "not between",
      contains: "contains",
      notContains: "does not contain",
      startsWith: "starts with",
      endsWith: "ends with",
      isExactly: "is exactly",
      equals: "equals",
      notEquals: "not equals",
      greaterThan: "greater than",
      lessThan: "less than",
      overlaps: "overlaps",
      includes: "includes",
      excludes: "excludes",
      includesAllOf: "includes all of",
      includesAnyOf: "includes any of",
      empty: "is empty",
      notEmpty: "is not empty",
    },
    placeholders: {
      enterField: (fieldType) => `Enter ${fieldType}...`,
      selectField: "Select...",
      searchField: (fieldName) => `Search ${fieldName.toLowerCase()}...`,
      enterKey: "Enter key...",
      enterValue: "Enter value...",
    },
  },
  es: {
    addFilter: "Agregar filtro",
    searchFields: "Buscar campos...",
    noFieldsFound: "No se encontraron campos.",
    noResultsFound: "No se encontraron resultados.",
    select: "Seleccionar...",
    selectedCount: "seleccionados",
    operators: {
      is: "es",
      isNot: "no es",
      isAnyOf: "es cualquiera de",
      isNotAnyOf: "no es cualquiera de",
      includesAll: "incluye todos",
      excludesAll: "excluye todos",
      before: "antes de",
      after: "después de",
      between: "entre",
      notBetween: "no entre",
      contains: "contiene",
      notContains: "no contiene",
      startsWith: "comienza con",
      endsWith: "termina con",
      isExactly: "es exactamente",
      equals: "igual a",
      notEquals: "no igual a",
      greaterThan: "mayor que",
      lessThan: "menor que",
      overlaps: "se superpone",
      includes: "incluye",
      excludes: "excluye",
      includesAllOf: "incluye todos de",
      includesAnyOf: "incluye cualquiera de",
      empty: "está vacío",
      notEmpty: "no está vacío",
    },
    placeholders: {
      enterField: (fieldType) => `Ingrese ${fieldType}...`,
      selectField: "Seleccionar...",
      searchField: (fieldName) => `Buscar ${fieldName.toLowerCase()}...`,
      enterKey: "Ingrese clave...",
      enterValue: "Ingrese valor...",
    },
  },
  fr: {
    addFilter: "Ajouter un filtre",
    searchFields: "Rechercher des champs...",
    noFieldsFound: "Aucun champ trouvé.",
    noResultsFound: "Aucun résultat trouvé.",
    select: "Sélectionner...",
    selectedCount: "sélectionnés",
    operators: {
      is: "est",
      isNot: "n'est pas",
      isAnyOf: "est l'un de",
      isNotAnyOf: "n'est pas l'un de",
      includesAll: "inclut tous",
      excludesAll: "exclut tous",
      before: "avant",
      after: "après",
      between: "entre",
      notBetween: "pas entre",
      contains: "contient",
      notContains: "ne contient pas",
      startsWith: "commence par",
      endsWith: "se termine par",
      isExactly: "est exactement",
      equals: "égal à",
      notEquals: "pas égal à",
      greaterThan: "supérieur à",
      lessThan: "inférieur à",
      overlaps: "se chevauche",
      includes: "inclut",
      excludes: "exclut",
      includesAllOf: "inclut tous de",
      includesAnyOf: "inclut l'un de",
      empty: "est vide",
      notEmpty: "n'est pas vide",
    },
    placeholders: {
      enterField: (fieldType) => `Entrez ${fieldType}...`,
      selectField: "Sélectionner...",
      searchField: (fieldName) => `Rechercher ${fieldName.toLowerCase()}...`,
      enterKey: "Entrez la clé...",
      enterValue: "Entrez la valeur...",
    },
  },
  de: {
    addFilter: "Filter hinzufügen",
    searchFields: "Felder suchen...",
    noFieldsFound: "Keine Felder gefunden.",
    noResultsFound: "Keine Ergebnisse gefunden.",
    select: "Auswählen...",
    selectedCount: "ausgewählt",
    operators: {
      is: "ist",
      isNot: "ist nicht",
      isAnyOf: "ist eines von",
      isNotAnyOf: "ist nicht eines von",
      includesAll: "enthält alle",
      excludesAll: "schließt alle aus",
      before: "vor",
      after: "nach",
      between: "zwischen",
      notBetween: "nicht zwischen",
      contains: "enthält",
      notContains: "enthält nicht",
      startsWith: "beginnt mit",
      endsWith: "endet mit",
      isExactly: "ist genau",
      equals: "gleich",
      notEquals: "nicht gleich",
      greaterThan: "größer als",
      lessThan: "kleiner als",
      overlaps: "überschneidet sich",
      includes: "enthält",
      excludes: "schließt aus",
      includesAllOf: "enthält alle von",
      includesAnyOf: "enthält eines von",
      empty: "ist leer",
      notEmpty: "ist nicht leer",
    },
    placeholders: {
      enterField: (fieldType) => `${fieldType} eingeben...`,
      selectField: "Auswählen...",
      searchField: (fieldName) => `${fieldName.toLowerCase()} suchen...`,
      enterKey: "Schlüssel eingeben...",
      enterValue: "Wert eingeben...",
    },
  },
  ja: {
    addFilter: "フィルターを追加",
    searchFields: "フィールドを検索...",
    noFieldsFound: "フィールドが見つかりません。",
    noResultsFound: "結果が見つかりません。",
    select: "選択...",
    selectedCount: "選択済み",
    operators: {
      is: "は",
      isNot: "ではない",
      isAnyOf: "のいずれか",
      isNotAnyOf: "のいずれでもない",
      includesAll: "すべて含む",
      excludesAll: "すべて除外",
      before: "より前",
      after: "より後",
      between: "の間",
      notBetween: "の間ではない",
      contains: "含む",
      notContains: "含まない",
      startsWith: "で始まる",
      endsWith: "で終わる",
      isExactly: "正確に",
      equals: "等しい",
      notEquals: "等しくない",
      greaterThan: "より大きい",
      lessThan: "より小さい",
      overlaps: "重複する",
      includes: "含む",
      excludes: "除外",
      includesAllOf: "すべて含む",
      includesAnyOf: "いずれか含む",
      empty: "空",
      notEmpty: "空でない",
    },
    placeholders: {
      enterField: (fieldType) => `${fieldType}を入力...`,
      selectField: "選択...",
      searchField: (fieldName) => `${fieldName.toLowerCase()}を検索...`,
      enterKey: "キーを入力...",
      enterValue: "値を入力...",
    },
  },
};

const languages: { value: Language; label: string; flag: string }[] = [
  { value: "en", label: "English", flag: "us" },
  { value: "es", label: "Español", flag: "es" },
  { value: "fr", label: "Français", flag: "fr" },
  { value: "de", label: "Deutsch", flag: "de" },
  { value: "ja", label: "日本語", flag: "jp" },
];

const fieldLabels: Record<Language, Record<string, string>> = {
  en: {
    name: "Name",
    email: "Email",
    company: "Company",
    status: "Status",
    location: "Location",
    active: "Active",
    inactive: "Inactive",
    searchNames: "Search names...",
    searchLocations: "Search locations...",
  },
  es: {
    name: "Nombre",
    email: "Correo electrónico",
    company: "Empresa",
    status: "Estado",
    location: "Ubicación",
    active: "Activo",
    inactive: "Inactivo",
    searchNames: "Buscar nombres...",
    searchLocations: "Buscar ubicaciones...",
  },
  fr: {
    name: "Nom",
    email: "E-mail",
    company: "Entreprise",
    status: "Statut",
    location: "Localisation",
    active: "Actif",
    inactive: "Inactif",
    searchNames: "Rechercher des noms...",
    searchLocations: "Rechercher des lieux...",
  },
  de: {
    name: "Name",
    email: "E-Mail",
    company: "Unternehmen",
    status: "Status",
    location: "Standort",
    active: "Aktiv",
    inactive: "Inaktiv",
    searchNames: "Namen suchen...",
    searchLocations: "Standorte suchen...",
  },
  ja: {
    name: "名前",
    email: "メール",
    company: "会社",
    status: "ステータス",
    location: "場所",
    active: "アクティブ",
    inactive: "非アクティブ",
    searchNames: "名前を検索...",
    searchLocations: "場所を検索...",
  },
};

function SmallIconTrigger(props: ComponentProps<typeof Button>) {
  return (
    <Button variant="outline" size="icon-sm" {...props}>
      <ListFilter />
    </Button>
  );
}

export default function FiltersI18n() {
  const [language, setLanguage] = createSignal<Language>("es");
  const [filters, setFilters] = createSignal<Filter[]>([createFilter("status", "is", ["active"])]);

  const labels = () => fieldLabels[language()];

  const fields = (): FilterFieldConfig[] => [
    {
      key: "name",
      label: labels().name,
      type: "text",
      icon: () => <User class="size-3.5" />,
      class: "w-40",
      placeholder: labels().searchNames,
    },
    {
      key: "email",
      label: labels().email,
      type: "text",
      icon: () => <Mail class="size-3.5" />,
      class: "w-48",
      placeholder: "user@example.com",
    },
    {
      key: "company",
      label: labels().company,
      type: "select",
      icon: () => <Building class="size-3.5" />,
      searchable: true,
      class: "w-[180px]",
      options: [
        { value: "apple", label: "Apple" },
        { value: "openai", label: "OpenAI" },
        { value: "meta", label: "Meta" },
        { value: "tesla", label: "Tesla" },
      ],
    },
    {
      key: "status",
      label: labels().status,
      type: "select",
      icon: () => <CircleCheck class="size-3.5" />,
      searchable: false,
      class: "w-[140px]",
      options: [
        { value: "active", label: labels().active },
        { value: "inactive", label: labels().inactive },
      ],
    },
    {
      key: "location",
      label: labels().location,
      type: "text",
      icon: () => <MapPin class="size-3.5" />,
      class: "w-40",
      placeholder: labels().searchLocations,
    },
  ];

  const currentLanguage = () => languages.find((entry) => entry.value === language());

  return (
    <div class="flex w-full grow items-start justify-between gap-4 self-start">
      <Filters
        filters={filters()}
        fields={fields()}
        onChange={setFilters}
        size="sm"
        i18n={i18nConfigs[language()]}
        trigger={SmallIconTrigger}
      />

      <DropdownMenu placement="bottom-end">
        <DropdownMenuTrigger as={Button} variant="outline" size="sm" class="gap-2">
          <img
            src={`https://flagcdn.com/${currentLanguage()?.flag}.svg`}
            alt={currentLanguage()?.flag}
            class="size-4 rounded-full object-cover"
          />
          <span>{currentLanguage()?.label}</span>
          <ChevronDown class="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <For each={languages}>
            {(entry) => (
              <DropdownMenuItem class="gap-2" onSelect={() => setLanguage(entry.value)}>
                <img
                  src={`https://flagcdn.com/${entry.flag}.svg`}
                  alt={entry.flag}
                  class="size-4 rounded-full object-cover"
                />
                <span>{entry.label}</span>
              </DropdownMenuItem>
            )}
          </For>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
