import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import History from "./pages/History";
import FAQ from "./pages/FAQ";
import Contact from "./pages/Contact";
import Auth from "./pages/Auth";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Landing} />
      <Route path={"/home"} component={Landing} />
      <Route path={"/auth"} component={Auth} />
      <Route path={"/dashboard"} component={Dashboard} />
      <Route path={"/history"} component={History} />
      <Route path={"/faq"} component={FAQ} />
      <Route path={"/contact"} component={Contact} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <div className="relative min-h-screen">
            <div className="app-bg-image" aria-hidden />
            <div className="app-bg-overlay" aria-hidden />
            <div className="app-shell flex flex-col min-h-screen">
              <Navbar />
              <main className="flex-grow">
                <Router />
              </main>
              <Footer />
            </div>
          </div>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
