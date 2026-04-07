"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Delete } from "lucide-react";

interface PinPadProps {
  length?: number;
  onComplete: (pin: string) => void;
}

export function PinPad({ length = 4, onComplete }: PinPadProps) {
  const [pin, setPin] = useState("");

  const press = (v: string) => {
    if (pin.length >= length) return;
    const next = pin + v;
    setPin(next);
    if (next.length === length) onComplete(next);
  };

  const erase = () => setPin((p) => p.slice(0, -1));

  return (
    <div className="space-y-4">
      <div className="flex justify-center gap-2">
        {Array.from({ length }).map((_, i) => (
          <div
            key={i}
            className="w-12 h-12 border-2 rounded-md flex items-center justify-center text-2xl font-bold"
          >
            {pin[i] ? "•" : ""}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
        {["1","2","3","4","5","6","7","8","9"].map((d) => (
          <Button key={d} variant="outline" size="lg" onClick={() => press(d)}>{d}</Button>
        ))}
        <div />
        <Button variant="outline" size="lg" onClick={() => press("0")}>0</Button>
        <Button variant="ghost" size="lg" onClick={erase}><Delete className="h-5 w-5" /></Button>
      </div>
    </div>
  );
}
