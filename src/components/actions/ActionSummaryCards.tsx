import { motion } from "framer-motion";
import { AlertCircle, Clock, CheckCircle, Timer } from "lucide-react";

interface ActionSummaryCardsProps {
  overdue: number;
  open: number;
  awaitingVerification: number;
  closedThisMonth: number;
  onFilterClick: (filter: string) => void;
  activeFilter: string | null;
}

export const ActionSummaryCards = ({
  overdue,
  open,
  awaitingVerification,
  closedThisMonth,
  onFilterClick,
  activeFilter,
}: ActionSummaryCardsProps) => {
  const cards = [
    {
      id: "overdue",
      label: "Overdue",
      count: overdue,
      icon: AlertCircle,
      bgColor: "bg-red-500",
      textColor: "text-white",
      pulse: overdue > 0,
    },
    {
      id: "open",
      label: "Open",
      count: open,
      icon: Clock,
      bgColor: "bg-orange-500",
      textColor: "text-white",
      pulse: false,
    },
    {
      id: "awaiting_verification",
      label: "Awaiting Verification",
      count: awaitingVerification,
      icon: Timer,
      bgColor: "bg-amber-500",
      textColor: "text-gray-900",
      pulse: false,
    },
    {
      id: "closed_this_month",
      label: "Closed This Month",
      count: closedThisMonth,
      icon: CheckCircle,
      bgColor: "bg-green-500",
      textColor: "text-white",
      pulse: false,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card, index) => (
        <motion.button
          key={card.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          onClick={() => onFilterClick(card.id)}
          className={`relative p-4 rounded-xl ${card.bgColor} ${card.textColor} text-left transition-all hover:opacity-90 ${
            activeFilter === card.id ? "ring-2 ring-offset-2 ring-primary" : ""
          }`}
        >
          {card.pulse && card.count > 0 && (
            <span className="absolute top-3 right-3 h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
            </span>
          )}
          <card.icon className="h-6 w-6 mb-2" />
          <p className="text-2xl font-bold">{card.count}</p>
          <p className="text-sm opacity-90">{card.label}</p>
        </motion.button>
      ))}
    </div>
  );
};
