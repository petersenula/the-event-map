// src/hooks/useAnonId.ts
import { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";

export function useAnonId() {
  const [anonId, setAnonId] = useState<string | null>(null);

  useEffect(() => {
    let stored = localStorage.getItem("anon_id");
    if (!stored) {
      stored = uuidv4();
      localStorage.setItem("anon_id", stored);
    }
    setAnonId(stored);
  }, []);

  return anonId;
}
