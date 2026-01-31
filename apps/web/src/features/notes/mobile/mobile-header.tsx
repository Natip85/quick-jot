"use client";

import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type MobileHeaderProps = {
  title: string;
  onBack?: () => void;
  showBackButton?: boolean;
  actions?: ReactNode;
  className?: string;
};

export function MobileHeader({
  title,
  onBack,
  showBackButton = true,
  actions,
  className,
}: MobileHeaderProps) {
  return (
    <header
      className={cn(
        "bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 flex h-14 items-center gap-2 border-b px-2 backdrop-blur",
        className
      )}
    >
      {showBackButton && onBack && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="size-10 shrink-0"
          aria-label="Go back"
        >
          <ArrowLeft className="size-5" />
        </Button>
      )}

      <h1 className="flex-1 truncate text-lg font-semibold">{title}</h1>

      {actions && <div className="flex items-center gap-1">{actions}</div>}
    </header>
  );
}
