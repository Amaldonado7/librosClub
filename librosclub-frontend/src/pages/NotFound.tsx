import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import FloralSeal from "@/components/brand/FloralSeal";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-warm-cream px-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <FloralSeal size={64} />
        <h1 className="font-serif font-normal text-[60px] leading-none text-forest">404</h1>
        <p className="font-serif text-xl text-ink-muted">Oops! Page not found</p>
        <Button asChild variant="outline">
          <a href="/">Return to Home</a>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
