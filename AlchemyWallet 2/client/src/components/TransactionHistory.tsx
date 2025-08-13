import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingCard } from "@/components/ui/loading-spinner";
import { useWallet } from "@/hooks/useWallet";
import { 
  ArrowUp, 
  ArrowDown, 
  ArrowUpDown, 
  Link as LinkIcon, 
  ExternalLink,
  Clock,
  CheckCircle,
  XCircle 
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const CHAIN_INFO = {
  1: { name: "Ethereum", symbol: "E", color: "bg-blue-600", explorerUrl: "https://etherscan.io" },
  56: { name: "BSC", symbol: "B", color: "bg-yellow-400", explorerUrl: "https://bscscan.com" },
  137: { name: "Polygon", symbol: "P", color: "bg-purple-600", explorerUrl: "https://polygonscan.com" },
  8453: { name: "Base", symbol: "B", color: "bg-blue-500", explorerUrl: "https://basescan.org" },
  42161: { name: "Arbitrum", symbol: "A", color: "bg-blue-400", explorerUrl: "https://arbiscan.io" },
} as const;

const TRANSACTION_ICONS = {
  send: ArrowUp,
  receive: ArrowDown,
  swap: ArrowUpDown,
  bridge: LinkIcon,
};

const STATUS_ICONS = {
  pending: Clock,
  confirmed: CheckCircle,
  failed: XCircle,
};

const STATUS_COLORS = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-green-100 text-green-800", 
  failed: "bg-red-100 text-red-800",
};

interface TransactionHistoryProps {
  limit?: number;
  showViewAll?: boolean;
}

export function TransactionHistory({ limit, showViewAll = true }: TransactionHistoryProps) {
  const { transactions, transactionsLoading, getRecentTransactions } = useWallet();

  const displayTransactions = limit ? getRecentTransactions(limit) : transactions;

  if (transactionsLoading) {
    return (
      <Card>
        <LoadingCard>
          <p className="text-gray-600">Loading transaction history...</p>
        </LoadingCard>
      </Card>
    );
  }

  if (!displayTransactions.length) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
              <ArrowUpDown className="w-8 h-8 text-gray-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">No Transactions</h3>
              <p className="text-gray-600 text-sm mt-1">
                Your transaction history will appear here
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle data-testid="transactions-title">
            {limit ? "Recent Transactions" : "Transaction History"}
          </CardTitle>
          {showViewAll && limit && (
            <Button variant="outline" size="sm" data-testid="button-view-all-transactions">
              <ExternalLink className="w-4 h-4 mr-2" />
              View all
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {displayTransactions.map((tx) => {
            const chainInfo = CHAIN_INFO[tx.chainId as keyof typeof CHAIN_INFO];
            const TransactionIcon = TRANSACTION_ICONS[tx.type as keyof typeof TRANSACTION_ICONS] || ArrowUpDown;
            const StatusIcon = STATUS_ICONS[tx.status as keyof typeof STATUS_ICONS] || Clock;
            const statusColorClass = STATUS_COLORS[tx.status as keyof typeof STATUS_COLORS] || STATUS_COLORS.pending;
            
            const explorerUrl = chainInfo ? `${chainInfo.explorerUrl}/tx/${tx.hash}` : '#';
            
            return (
              <div 
                key={tx.id}
                className="flex items-center space-x-3 p-4 hover:bg-gray-50 rounded-lg transition-colors"
                data-testid={`transaction-${tx.hash.slice(0, 10)}`}
              >
                <div className="relative">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <TransactionIcon className="w-5 h-5 text-gray-600" />
                  </div>
                  {tx.gasSponsor && (
                    <div className="absolute -top-1 -right-1">
                      <Badge className="bg-green-100 text-green-800 text-xs px-1 py-0">
                        Gasless
                      </Badge>
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <p className="font-medium text-gray-900 capitalize" data-testid={`transaction-type-${tx.hash.slice(0, 10)}`}>
                      {tx.type} {tx.asset?.symbol || 'Token'}
                    </p>
                    <Badge className={`text-xs ${statusColorClass}`}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {tx.status}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <span data-testid={`transaction-time-${tx.hash.slice(0, 10)}`}>
                      {formatDistanceToNow(new Date(tx.createdAt), { addSuffix: true })}
                    </span>
                    {chainInfo && (
                      <>
                        <span>•</span>
                        <div className="flex items-center space-x-1">
                          <div className={`w-3 h-3 ${chainInfo.color} rounded-full`} />
                          <span>{chainInfo.name}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="text-right flex-shrink-0">
                  {tx.amount && (
                    <p 
                      className={`font-medium ${
                        tx.type === 'receive' ? 'text-green-600' : 'text-gray-900'
                      }`}
                      data-testid={`transaction-amount-${tx.hash.slice(0, 10)}`}
                    >
                      {tx.type === 'receive' ? '+' : '-'}
                      {parseFloat(tx.amount).toLocaleString('en-US', { 
                        minimumFractionDigits: 2, 
                        maximumFractionDigits: 6 
                      })}
                    </p>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    className="h-6 w-6 p-0"
                    data-testid={`button-view-transaction-${tx.hash.slice(0, 10)}`}
                  >
                    <a
                      href={explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
