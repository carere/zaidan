import { type Component, createMemo } from "solid-js";
import * as _jsx_runtime from "solid-js/h/jsx-runtime";
import { Dynamic } from "solid-js/web";

const sharedComponents = {
  // Add your global components here
};

interface MDXProps {
  code: string;
  components?: Record<string, Component>;
}

export const MDXContent = (props: MDXProps) => {
  const Component = createMemo(() => {
    const fn = new Function(props.code);
    return fn({ ..._jsx_runtime }).default;
  });

  return (
    <Dynamic component={Component()} components={{ ...sharedComponents, ...props.components }} />
  );
};
