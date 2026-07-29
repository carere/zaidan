import { Area, AreaChart, CartesianGrid, ResponsiveContainer, XAxis } from "solid-recharts";

const data = [{ month: "January", desktop: 186 }];

export const validAreaComposition = (
  <ResponsiveContainer initialDimension={{ width: 320, height: 200 }}>
    <AreaChart accessibilityLayer data={data} margin={{ left: 12 }}>
      <CartesianGrid vertical={false} />
      <XAxis dataKey="month" tickFormatter={(value) => String(value)} />
      <Area dataKey="desktop" type="natural" fillOpacity={0.4} />
    </AreaChart>
  </ResponsiveContainer>
);

// @ts-expect-error — misspelled Area props must not cross the typecheck boundary.
export const invalidAreaProp = <Area dataKye="desktop" />;

// @ts-expect-error — unsupported chart props must not cross the typecheck boundary.
export const invalidChartProp = <AreaChart data={data} arbitraryAbstraction />;
