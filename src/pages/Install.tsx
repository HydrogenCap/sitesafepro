import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/landing/Logo";
import { Download, Share, Plus, MoreVertical, Smartphone, Check, ArrowLeft } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function Install() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    setIsStandalone(standalone);
    
    // Detect platform
    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua));
    setIsAndroid(/Android/.test(ua));

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  if (isStandalone || isInstalled) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Check className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">App Installed!</CardTitle>
            <CardDescription>
              SiteSafe Pro is now installed on your device. You can access it from your home screen.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/dashboard">
              <Button className="w-full">Go to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <Link to="/" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <Logo />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        {/* Hero */}
        <div className="text-center space-y-4">
          <div className="mx-auto h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Smartphone className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">Install SiteSafe Pro</h1>
          <p className="text-muted-foreground text-lg">
            Add SiteSafe Pro to your home screen for quick access and offline capabilities.
          </p>
        </div>

        {/* Native Install Button (Chrome/Edge) */}
        {deferredPrompt && (
          <Card className="border-primary">
            <CardContent className="pt-6">
              <Button onClick={handleInstallClick} className="w-full" size="lg">
                <Download className="mr-2 h-5 w-5" />
                Install Now
              </Button>
            </CardContent>
          </Card>
        )}

        {/* iOS Instructions */}
        {isIOS && !deferredPrompt && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Share className="h-5 w-5" />
                Install on iPhone/iPad
              </CardTitle>
              <CardDescription>Follow these steps to add the app to your home screen</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium shrink-0">
                  1
                </div>
                <div>
                  <p className="font-medium">Tap the Share button</p>
                  <p className="text-sm text-muted-foreground">
                    Find the <Share className="inline h-4 w-4" /> icon at the bottom of Safari
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium shrink-0">
                  2
                </div>
                <div>
                  <p className="font-medium">Scroll and tap "Add to Home Screen"</p>
                  <p className="text-sm text-muted-foreground">
                    Look for <Plus className="inline h-4 w-4" /> Add to Home Screen in the menu
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium shrink-0">
                  3
                </div>
                <div>
                  <p className="font-medium">Tap "Add"</p>
                  <p className="text-sm text-muted-foreground">
                    Confirm by tapping Add in the top right corner
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Android Instructions (fallback if no native prompt) */}
        {isAndroid && !deferredPrompt && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MoreVertical className="h-5 w-5" />
                Install on Android
              </CardTitle>
              <CardDescription>Follow these steps to add the app to your home screen</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium shrink-0">
                  1
                </div>
                <div>
                  <p className="font-medium">Tap the menu button</p>
                  <p className="text-sm text-muted-foreground">
                    Find the <MoreVertical className="inline h-4 w-4" /> icon in your browser
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium shrink-0">
                  2
                </div>
                <div>
                  <p className="font-medium">Tap "Install app" or "Add to Home screen"</p>
                  <p className="text-sm text-muted-foreground">
                    The option may vary depending on your browser
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium shrink-0">
                  3
                </div>
                <div>
                  <p className="font-medium">Confirm installation</p>
                  <p className="text-sm text-muted-foreground">
                    Tap Install or Add to complete
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Desktop Instructions */}
        {!isIOS && !isAndroid && !deferredPrompt && (
          <Card>
            <CardHeader>
              <CardTitle>Install on Desktop</CardTitle>
              <CardDescription>Add SiteSafe Pro to your desktop for quick access</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium shrink-0">
                  1
                </div>
                <div>
                  <p className="font-medium">Look for the install icon</p>
                  <p className="text-sm text-muted-foreground">
                    In Chrome or Edge, look for <Download className="inline h-4 w-4" /> in the address bar
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium shrink-0">
                  2
                </div>
                <div>
                  <p className="font-medium">Click "Install"</p>
                  <p className="text-sm text-muted-foreground">
                    Confirm the installation when prompted
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Benefits */}
        <Card>
          <CardHeader>
            <CardTitle>Why Install?</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              <li className="flex items-center gap-3">
                <Check className="h-5 w-5 text-primary shrink-0" />
                <span>Quick access from your home screen</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="h-5 w-5 text-primary shrink-0" />
                <span>Works offline for viewing cached data</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="h-5 w-5 text-primary shrink-0" />
                <span>Full-screen experience without browser UI</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="h-5 w-5 text-primary shrink-0" />
                <span>Faster loading after initial install</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Back Link */}
        <div className="text-center">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            Continue in browser instead
          </Link>
        </div>
      </main>
    </div>
  );
}
