import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { HardHat, Home, ArrowLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="max-w-md w-full text-center">
        <div className="h-20 w-20 rounded-2xl bg-primary/10 mx-auto mb-6 flex items-center justify-center">
          <HardHat className="h-10 w-10 text-primary" />
        </div>

        <h1 className="text-6xl font-extrabold text-foreground mb-2">404</h1>
        <p className="text-lg font-semibold text-foreground mb-1">Page not found</p>
        <p className="text-muted-foreground mb-8">
          The page <code className="text-sm bg-muted px-1.5 py-0.5 rounded">{location.pathname}</code> doesn't exist or has been moved.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild>
            <Link to="/dashboard">
              <Home className="h-4 w-4 mr-2" />
              Dashboard
            </Link>
          </Button>
          <Button variant="outline" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-3 text-sm">
          <Link to="/projects" className="p-3 rounded-lg border hover:border-primary/30 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
            Projects
          </Link>
          <Link to="/documents" className="p-3 rounded-lg border hover:border-primary/30 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
            Documents
          </Link>
          <Link to="/actions" className="p-3 rounded-lg border hover:border-primary/30 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
            Actions
          </Link>
          <Link to="/help" className="p-3 rounded-lg border hover:border-primary/30 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
            Help & Support
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
