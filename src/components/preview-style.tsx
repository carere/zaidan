export function PreviewStyle() {
  return (
    <style>
      {`
        html {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        html::-webkit-scrollbar {
          display: none;
        }
      `}
    </style>
  );
}
