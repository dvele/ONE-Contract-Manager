import { useEffect } from "react";
import { useLocation } from "wouter";

export default function AdminExhibits() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    setLocation("/exhibits");
  }, [setLocation]);

  return null;
}
