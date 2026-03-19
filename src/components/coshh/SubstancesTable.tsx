import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  MoreVertical,
  Eye,
  Edit,
  FileUp,
  Trash2,
  CheckCircle,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import { GHSPictogramGrid } from './GHSPictograms';
import { PPEIconGrid } from './PPEIcons';
import type { COSHHSubstance } from '@/types/coshh';
import { SUBSTANCE_TYPE_LABELS } from '@/types/coshh';

interface SubstancesTableProps {
  substances: COSHHSubstance[];
  onView: (substance: COSHHSubstance) => void;
  onEdit: (substance: COSHHSubstance) => void;
  onUploadSDS: (substance: COSHHSubstance) => void;
  onRemove: (id: string) => void;
  onDelete: (id: string) => void;
}

export const SubstancesTable = ({
  substances,
  onView,
  onEdit,
  onUploadSDS,
  onRemove,
  onDelete,
}: SubstancesTableProps) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [substanceToDelete, setSubstanceToDelete] = useState<string | null>(null);

  const handleDeleteClick = (id: string) => {
    setSubstanceToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (substanceToDelete) {
      onDelete(substanceToDelete);
    }
    setDeleteDialogOpen(false);
    setSubstanceToDelete(null);
  };

  return (
    <>
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Hazards</TableHead>
              <TableHead>PPE</TableHead>
              <TableHead>Storage</TableHead>
              <TableHead>SDS</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {substances.map((substance, index) => (
              <motion.tr
                key={substance.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="group hover:bg-muted/50 transition-colors"
              >
                <TableCell>
                  <div>
                    <p className="font-medium text-foreground">{substance.product_name}</p>
                    {substance.manufacturer && (
                      <p className="text-xs text-muted-foreground">{substance.manufacturer}</p>
                    )}
                    {substance.health_surveillance_required && (
                      <Badge variant="destructive" className="mt-1 text-xs">
                        Health Surveillance
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm">
                    {SUBSTANCE_TYPE_LABELS[substance.substance_type] || substance.substance_type}
                  </span>
                </TableCell>
                <TableCell>
                  <GHSPictogramGrid pictograms={substance.hazard_pictograms} size="sm" />
                </TableCell>
                <TableCell>
                  <PPEIconGrid types={substance.ppe_required} size="sm" />
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {substance.storage_location || '—'}
                  </span>
                </TableCell>
                <TableCell>
                  {substance.sds_available ? (
                    <Badge className="bg-success/10 text-success border-success/30">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Available
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-amber-500 border-amber-500/30">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Missing
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onView(substance)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEdit(substance)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onUploadSDS(substance)}>
                        <FileUp className="h-4 w-4 mr-2" />
                        Upload SDS
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onRemove(substance.id)}>
                        <XCircle className="h-4 w-4 mr-2" />
                        Remove from Site
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDeleteClick(substance.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Permanently
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </motion.tr>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Substance</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete this substance from the COSHH register?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
