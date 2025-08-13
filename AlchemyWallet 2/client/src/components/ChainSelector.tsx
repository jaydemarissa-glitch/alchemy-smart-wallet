import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { cn } from "@/lib/utils";

const CHAIN_INFO = {
  1: { name: "Ethereum", symbol: "ETH", color: "bg-blue-600", textColor: "text-white" },
  56: { name: "BSC", symbol: "BNB", color: "bg-yellow-400", textColor: "text-gray-900" },
  137: { name: "Polygon", symbol: "MATIC", color: "bg-purple-600", textColor: "text-white" },
  8453: { name: "Base", symbol: "BASE", color: "bg-blue-500", textColor: "text-white" },
  42161: { name: "Arbitrum", symbol: "ARB", color: "bg-blue-400", textColor: "text-white" },
} as const;

interface ChainSelectorProps {
  className?: string;
}

export function ChainSelector({ className }: ChainSelectorProps) {
  const { selectedChainId, setSelectedChainId, supportedChains } = useWallet();
  const [isOpen, setIsOpen] = useState(false);

  const currentChain = CHAIN_INFO[selectedChainId as keyof typeof CHAIN_INFO];

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn("flex items-center space-x-2", className)}
          data-testid="chain-selector-trigger"
        >
          <div className={cn("w-5 h-5 rounded-full flex items-center justify-center", currentChain?.color)}>
            <span className={cn("text-xs font-bold", currentChain?.textColor)}>
              {currentChain?.symbol[0] || "?"}
            </span>
          </div>
          <span className="font-medium">{currentChain?.name || "Unknown"}</span>
          <ChevronDown className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-48">
        {supportedChains && Array.isArray(supportedChains) ? supportedChains.map((chain: any) => {
          const chainInfo = CHAIN_INFO[chain.id as keyof typeof CHAIN_INFO];
          if (!chainInfo) return null;

          return (
            <DropdownMenuItem
              key={chain.id}
              onClick={() => {
                setSelectedChainId(chain.id);
                setIsOpen(false);
              }}
              className={cn(
                "flex items-center space-x-3 cursor-pointer",
                selectedChainId === chain.id && "bg-primary/5"
              )}
              data-testid={`chain-option-${chain.id}`}
            >
              <div className={cn("w-5 h-5 rounded-full flex items-center justify-center", chainInfo.color)}>
                <span className={cn("text-xs font-bold", chainInfo.textColor)}>
                  {chainInfo.symbol[0]}
                </span>
              </div>
              <div className="flex-1">
                <p className="font-medium">{chainInfo.name}</p>
                <p className="text-xs text-gray-500">{chainInfo.symbol}</p>
              </div>
              {selectedChainId === chain.id && (
                <div className="w-2 h-2 bg-primary rounded-full" />
              )}
            </DropdownMenuItem>
          );
        }) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
