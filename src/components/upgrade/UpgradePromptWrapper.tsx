import { useState, cloneElement, isValidElement, ReactElement } from "react";
import { useSubscription } from "@/hooks/useSubscription";
import { UpgradePrompt } from "./UpgradePrompt";

interface UpgradePromptWrapperProps {
  feature: string;
  children: ReactElement;
}

export const UpgradePromptWrapper = ({ feature, children }: UpgradePromptWrapperProps) => {
  const { canAccess } = useSubscription();
  const [dialogOpen, setDialogOpen] = useState(false);

  if (canAccess(feature)) {
    return children;
  }

  // Clone children and intercept onClick
  const interceptedChild = isValidElement(children)
    ? cloneElement(children as ReactElement<{ onClick?: (...args: unknown[]) => void }>, {
        onClick: (e: React.MouseEvent) => {
          e.preventDefault();
          e.stopPropagation();
          setDialogOpen(true);
        },
      })
    : children;

  return (
    <>
      {interceptedChild}
      <UpgradePrompt
        feature={feature}
        variant="dialog"
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  );
};
