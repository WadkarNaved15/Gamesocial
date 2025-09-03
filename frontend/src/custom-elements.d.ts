declare global {
  namespace JSX {
    interface IntrinsicElements {
      "hang-watch": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        url?: string;
        name?: string;
        controls?: string;
      };

      "hang-support": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        mode?: string;
        show?: string;
      };
    }
  }
}

export {};
