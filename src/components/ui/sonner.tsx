import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => (
  <Sonner
    theme="dark"
    position="bottom-right"
    closeButton
    expand={true}
    toastOptions={{}}
    style={{ "--width": "min(356px, calc(100vw - 2rem))" } as React.CSSProperties}
    {...props}
  />
);

export { Toaster };
