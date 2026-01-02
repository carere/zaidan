import type { Component } from "solid-js";
import * as _jsx_runtime from "solid-js/h/jsx-runtime";

const sharedComponents = {
  // Add your global components here
};

// parse the Velite generated MDX code into a React component function
const useMDXComponent = (code: string) => {
  const fn = new Function(code);
  return fn({ ..._jsx_runtime }).default;
};

interface MDXProps {
  code: string;
  components?: Record<string, Component>;
}

// MDXContent component
export const MDXContent = (props: MDXProps) => {
  const Component = useMDXComponent(props.code);
  return <Component components={{ ...sharedComponents, ...props.components }} />;
};
