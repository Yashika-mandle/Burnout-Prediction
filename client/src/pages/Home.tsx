import { useEffect } from "react";
import { useLocation } from "wouter";

export default function Home() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Redirect to landing page
    setLocation("/");
  }, [setLocation]);

  return null;
}
