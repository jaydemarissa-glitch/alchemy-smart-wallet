import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingCard } from "@/components/ui/loading-spinner";
import { AssetsList } from "./AssetsList";
import { TransactionHistory } from "./TransactionHistory";
import { GaslessActions } from "./GaslessActions";
import { ChainSelector } from "./ChainSelector";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Fuel, 
  Link as LinkIcon, 
  Shield,
  Users,
  Key,
  BarChart3,
  Send,
  QrCode,
  RefreshCw
} from "lucide-react";

const CHAIN_INFO = {
  1: { name: "Ethereum", symbol: "E", color: "bg-blue-600" },
  56: { name: "BSC", symbol: "B", color: "bg-yellow-400" },
  137: { name: "Polygon", symbol: "P", color: "bg-purple-600" },
  8453: { name: "Base", symbol: "B", color: "bg-blue-500" },
  42161: { name: "Arbitrum", symbol: "A", color: "bg-blue-400" },
} as const;

export function WalletDashboard() {
  const { user } = useAuth();
  const { 
    portfolio, 
    portfolioLoading, 
    wallets, 
    gaslessStats, 
    selectedChainId, 
    gasPolicies,
    supportedChains,
    refreshBalances,
    isRefreshingBalances
  } = useWallet();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const activeGasPolicy = gasPolicies?.find(policy => 
    policy.chainId === selectedChainId && policy.isActive
  );

  const usagePercentage = activeGasPolicy 
    ? (activeGasPolicy.monthlyUsed / activeGasPolicy.monthlyLimit) * 100 
    : 0;

  if (portfolioLoading) {
    return (
      <div className="p-4 lg:p-8">
        <LoadingCard>
          <p className="text-gray-600">Loading your wallet dashboard...</p>
        </LoadingCard>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-4 lg:p-8">
      {/* Welcome Section */}
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
          <div>
            <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2" data-testid="welcome-title">
              Welcome back, {user?.firstName || user?.email?.split('@')[0] || 'User'}!
            </h2>
            <p className="text-gray-600">Manage your multi-chain assets with zero gas fees</p>
          </div>
          <div className="mt-4 lg:mt-0 flex items-center space-x-4">
            <ChainSelector />
            
            <Button 
              className="bg-primary text-white hover:bg-primary-dark"
              data-testid="button-send"
            >
              <Send className="w-4 h-4 mr-2" />
              Send
            </Button>
            <Button 
              className="bg-accent text-white hover:bg-green-600"
              data-testid="button-receive"
            >
              <QrCode className="w-4 h-4 mr-2" />
              Receive
            </Button>
          </div>
        </div>

        {/* Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Balance Card */}
          <Card className="bg-gradient-to-r from-primary to-secondary text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Total Balance</p>
                  <p className="text-2xl font-bold" data-testid="total-balance">
                    ${portfolio?.totalBalance.toLocaleString('en-US', { 
                      minimumFractionDigits: 2, 
                      maximumFractionDigits: 2 
                    }) || '0.00'}
                  </p>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                  <Wallet className="w-6 h-6" />
                </div>
              </div>
              <div className="flex items-center text-sm">
                {portfolio && portfolio.change24h >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-green-300 mr-1" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-300 mr-1" />
                )}
                <span 
                  className={portfolio && portfolio.change24h >= 0 ? "text-green-300" : "text-red-300"}
                  data-testid="portfolio-change"
                >
                  {portfolio?.change24h !== undefined && portfolio.change24h >= 0 ? '+' : ''}{portfolio?.change24h?.toFixed(1) || '0.0'}%
                </span>
                <span className="text-blue-100 ml-1">24h</span>
              </div>
            </CardContent>
          </Card>

          {/* Gasless Transactions Card */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Gasless Transactions</p>
                  <p className="text-2xl font-bold text-gray-900" data-testid="gasless-transaction-count">
                    {gaslessStats.totalTransactions}
                  </p>
                </div>
                <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                  <Fuel className="w-6 h-6 text-accent" />
                </div>
              </div>
              <div className="flex items-center text-sm">
                <span className="text-accent font-medium" data-testid="total-gas-saved">
                  ${gaslessStats.totalSaved.toFixed(0)} saved
                </span>
                <span className="text-gray-500 ml-1">in gas</span>
              </div>
            </CardContent>
          </Card>

          {/* Active Chains Card */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Active Chains</p>
                  <p className="text-2xl font-bold text-gray-900" data-testid="active-chains-count">
                    {supportedChains && Array.isArray(supportedChains) ? supportedChains.length : 3}
                  </p>
                </div>
                <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center">
                  <LinkIcon className="w-6 h-6 text-secondary" />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {Object.entries(CHAIN_INFO).slice(0, 3).map(([chainId, info]) => (
                  <div 
                    key={chainId}
                    className={`w-5 h-5 ${info.color} rounded-full flex items-center justify-center`}
                  >
                    <span className="text-xs font-bold text-white">{info.symbol}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Security Score Card */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Security Score</p>
                  <p className="text-2xl font-bold text-gray-900" data-testid="security-score">98/100</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Shield className="w-6 h-6 text-accent" />
                </div>
              </div>
              <div className="flex items-center text-sm">
                <span className="text-accent font-medium">Excellent</span>
                <span className="text-gray-500 ml-1">protection</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Assets List */}
        <div className="lg:col-span-2">
          <AssetsList />
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          <GaslessActions />
          <TransactionHistory limit={5} />
        </div>
      </div>

      {/* Security Features */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Social Recovery */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold text-gray-900">Social Recovery</h3>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              Recover your wallet through trusted contacts. No seed phrase required.
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              className="text-primary hover:text-primary-dark"
              data-testid="button-setup-recovery"
            >
              Set up recovery →
            </Button>
          </CardContent>
        </Card>

        {/* Multi-Signature */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-secondary/10 rounded-lg flex items-center justify-center">
                <Key className="w-5 h-5 text-secondary" />
              </div>
              <h3 className="font-semibold text-gray-900">Multi-Signature</h3>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              Require multiple approvals for large transactions and enhanced security.
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              className="text-secondary hover:text-purple-700"
              data-testid="button-setup-multisig"
            >
              Configure multisig →
            </Button>
          </CardContent>
        </Card>

        {/* Spending Limits */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-accent" />
              </div>
              <h3 className="font-semibold text-gray-900">Spending Limits</h3>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              Set daily and transaction limits to protect against unauthorized access.
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              className="text-accent hover:text-green-700"
              data-testid="button-set-limits"
            >
              Set limits →
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
