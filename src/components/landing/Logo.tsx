import { forwardRef } from "react";
import { Shield } from "lucide-react";

interface LogoProps {
  variant?: "default" | "light";
  size?: "sm" | "default" | "lg";
}

export const Logo = forwardRef<HTMLDivElement, LogoProps>(
  ({ variant = "default", size = "default" }, ref) => {
    const sizeClasses = {
      sm: "text-lg",
      default: "text-xl",
      lg: "text-2xl",
    };

    const iconSizes = {
      sm: 20,
      default: 24,
      lg: 32,
    };

    const textColor = variant === "light" ? "text-primary-foreground" : "text-foreground";
    const accentColor = variant === "light" ? "text-accent" : "text-accent";
    const iconBg = variant === "light" ? "bg-primary-foreground/20" : "bg-primary";
    const iconColor = variant === "light" ? "text-primary-foreground" : "text-primary-foreground";

    return (
      <div ref={ref} className="flex items-center gap-2">
        <div className={`${iconBg} p-1.5 rounded-lg`}>
          <Shield className={iconColor} size={iconSizes[size]} strokeWidth={2.5} />
        </div>
        <span className={`font-bold tracking-tight ${sizeClasses[size]} ${textColor}`}>
          SiteSafe<span className={accentColor}>Pro</span>
        </span>
      </div>
    );
  }
);

Logo.displayName = "Logo";
