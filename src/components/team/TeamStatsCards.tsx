import { Card, CardContent } from "@/components/ui/card";
import { Users, CheckCircle, Clock } from "lucide-react";

interface TeamStatsCardsProps {
  total: number;
  active: number;
  pending: number;
}

export function TeamStatsCards({ total, active, pending }: TeamStatsCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{total}</p>
              <p className="text-sm text-muted-foreground">Total Members</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 rounded-full">
              <CheckCircle className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{active}</p>
              <p className="text-sm text-muted-foreground">Active</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-500/10 rounded-full">
              <Clock className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pending}</p>
              <p className="text-sm text-muted-foreground">Pending Invites</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
