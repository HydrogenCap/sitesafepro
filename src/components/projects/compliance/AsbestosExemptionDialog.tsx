import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { AlertTriangle, Building } from "lucide-react";

interface AsbestosExemptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
}

export const AsbestosExemptionDialog = ({
  open,
  onOpenChange,
  onConfirm,
}: AsbestosExemptionDialogProps) => {
  const [confirmed, setConfirmed] = useState(false);

  const handleConfirm = () => {
    if (confirmed) {
      onConfirm("New-build project — no existing structures to survey");
      handleClose();
    }
  };

  const handleClose = () => {
    setConfirmed(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building className="h-5 w-5 text-primary" />
            New Build Exemption
          </DialogTitle>
          <DialogDescription>
            Confirm that an asbestos survey is not applicable for this project
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  Important: Asbestos Survey Requirements
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  A Refurbishment and Demolition Survey is <strong>always required</strong>{" "}
                  before any refurbishment or demolition work begins on existing structures.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  This exemption applies <strong>only</strong> to pure new-build projects with{" "}
                  no existing structures on site.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Checkbox
              id="confirm-newbuild"
              checked={confirmed}
              onCheckedChange={(checked) => setConfirmed(checked === true)}
            />
            <label
              htmlFor="confirm-newbuild"
              className="text-sm text-muted-foreground leading-tight cursor-pointer"
            >
              I confirm this is a new-build project with no existing structures that
              require an asbestos survey under the Control of Asbestos Regulations 2012.
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!confirmed}>
            Confirm Exemption
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
