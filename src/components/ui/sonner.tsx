import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => (
  <Sonner
    theme="dark"
    position="bottom-right"
    closeButton
    expand={true}
    toastOptions={{}}
    {...props}
  />
);

export { Toaster };
