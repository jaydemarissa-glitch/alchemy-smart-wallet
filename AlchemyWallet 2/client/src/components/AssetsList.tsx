import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingCard } from "@/components/ui/loading-spinner";
import { useWallet } from "@/hooks/useWallet";
import { ArrowUp, ArrowDown, RefreshCw, TrendingUp, TrendingDown, Coins } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const CHAIN_INFO = {
  1: { name: "Ethereum", symbol: "E", color: "bg-blue-600" },
  56: { name: "BSC", symbol: "B", color: "bg-yellow-400" },
  137: { name: "Polygon", symbol: "P", color: "bg-purple-600" },
  8453: { name: "Base", symbol: "B", color: "bg-blue-500" },
  42161: { name: "Arbitrum", symbol: "A", color: "bg-blue-400" },
} as const;

export function AssetsList() {
  const { 
    portfolio, 
    portfolioLoading, 
    balances, 
    balancesLoading, 
    refreshBalances, 
    isRefreshingBalances 
  } = useWallet();

  if (portfolioLoading || balancesLoading) {
    return (
      <Card>
        <LoadingCard>
          <p className="text-gray-600">Loading your assets...</p>
        </LoadingCard>
      </Card>
    );
  }

  if (!portfolio || !balances.length) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
              <Coins className="w-8 h-8 text-gray-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">No Assets Found</h3>
              <p className="text-gray-600 text-sm mt-1">
                Connect a wallet or add assets to get started
              </p>
            </div>
            <Button onClick={() => refreshBalances()} disabled={isRefreshingBalances}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshingBalances ? 'animate-spin' : ''}`} />
              Refresh Balances
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle data-testid="assets-title">Assets</CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refreshBalances()}
            disabled={isRefreshingBalances}
            data-testid="button-refresh-balances"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshingBalances ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {portfolio.assets.map((asset) => {
            const chainInfo = CHAIN_INFO[asset.chainId as keyof typeof CHAIN_INFO];
            const isPositiveChange = asset.change24h >= 0;
            
            return (
              <div 
                key={`${asset.id}-${asset.chainId}`}
                className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
                data-testid={`asset-${asset.symbol.toLowerCase()}`}
              >
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    {asset.logoUrl ? (
                      <img 
                        src={asset.logoUrl} 
                        alt={asset.name} 
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-600">
                          {asset.symbol.slice(0, 2)}
                        </span>
                      </div>
                    )}
                    {chainInfo && (
                      <div className={`absolute -bottom-1 -right-1 w-4 h-4 ${chainInfo.color} rounded-full flex items-center justify-center`}>
                        <span className="text-xs font-bold text-white">
                          {chainInfo.symbol}
                        </span>
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900" data-testid={`asset-name-${asset.symbol.toLowerCase()}`}>
                      {asset.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      <span data-testid={`asset-balance-${asset.symbol.toLowerCase()}`}>
                        {parseFloat(asset.balance).toFixed(6)}
                      </span>{' '}
                      <span data-testid={`asset-symbol-${asset.symbol.toLowerCase()}`}>
                        {asset.symbol}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900" data-testid={`asset-usd-value-${asset.symbol.toLowerCase()}`}>
                    ${asset.usdValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <div className="flex items-center text-sm">
                    {isPositiveChange ? (
                      <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-600 mr-1" />
                    )}
                    <span 
                      className={isPositiveChange ? "text-green-600" : "text-red-600"}
                      data-testid={`asset-change-${asset.symbol.toLowerCase()}`}
                    >
                      {isPositiveChange ? '+' : ''}{asset.change24h.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
