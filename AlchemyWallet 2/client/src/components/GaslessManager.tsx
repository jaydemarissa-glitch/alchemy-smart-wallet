import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { LoadingCard } from "@/components/ui/loading-spinner";
import { useWallet } from "@/hooks/useWallet";
import { 
  Fuel, 
  Plus, 
  Settings, 
  TrendingUp, 
  Zap,
  AlertCircle
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const CHAIN_INFO = {
  1: { name: "Ethereum", symbol: "ETH", color: "bg-blue-600" },
  56: { name: "BSC", symbol: "BNB", color: "bg-yellow-400" },
  137: { name: "Polygon", symbol: "MATIC", color: "bg-purple-600" },
  8453: { name: "Base", symbol: "ETH", color: "bg-blue-500" },
  42161: { name: "Arbitrum", symbol: "ETH", color: "bg-blue-400" },
} as const;

export function GaslessManager() {
  const { 
    gasPolicies, 
    gasPoliciesLoading, 
    selectedChainId,
    gaslessStats,
    createGasPolicy 
  } = useWallet();

  if (gasPoliciesLoading) {
    return (
      <LoadingCard>
        <p className="text-gray-600">Loading gas policies...</p>
      </LoadingCard>
    );
  }

  const activePolicy = gasPolicies?.find(policy => 
    policy.chainId === selectedChainId && policy.isActive
  );

  const handleCreatePolicy = () => {
    createGasPolicy({
      chainId: selectedChainId,
      monthlyLimit: 100, // Default $100 monthly limit
      perTransactionLimit: 10, // Default $10 per transaction
    });
  };

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Gasless Transactions</p>
                <p className="text-2xl font-bold text-gray-900">
                  {gaslessStats.totalTransactions}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Zap className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Gas Fees Saved</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${gaslessStats.totalSaved.toFixed(0)}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Active Policies</p>
                <p className="text-2xl font-bold text-gray-900">
                  {gasPolicies?.filter(p => p.isActive).length || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Settings className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Current Chain Policy */}
      {activePolicy ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <Fuel className="w-5 h-5" />
                <span>
                  {CHAIN_INFO[selectedChainId as keyof typeof CHAIN_INFO]?.name || 'Current Chain'} 
                  Gas Policy
                </span>
              </CardTitle>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                Active
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Monthly Limit</p>
                  <p className="text-lg font-semibold">${activePolicy.monthlyLimit}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Per Transaction Limit</p>
                  <p className="text-lg font-semibold">${activePolicy.perTransactionLimit || 'No limit'}</p>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-600">Monthly Usage</p>
                  <p className="text-sm font-medium">
                    ${activePolicy.monthlyUsed} / ${activePolicy.monthlyLimit}
                  </p>
                </div>
                <Progress 
                  value={(activePolicy.monthlyUsed / activePolicy.monthlyLimit) * 100} 
                  className="h-2"
                />
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <div>
                  <p className="text-sm text-gray-600">Created</p>
                  <p className="text-sm font-medium">
                    {activePolicy.createdAt ? formatDistanceToNow(new Date(activePolicy.createdAt), { addSuffix: true }) : 'Recently'}
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  <Settings className="w-4 h-4 mr-2" />
                  Modify Policy
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="flex flex-col items-center space-y-4">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">No Gas Policy Active</h3>
                <p className="text-gray-600 text-sm mt-1">
                  Create a gas sponsorship policy for {CHAIN_INFO[selectedChainId as keyof typeof CHAIN_INFO]?.name || 'this chain'} to enable gasless transactions
                </p>
              </div>
              <Button 
                onClick={handleCreatePolicy}
                disabled={false}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Gas Policy
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Gas Policies */}
      {gasPolicies && gasPolicies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>All Gas Policies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {gasPolicies.map((policy) => {
                const chainInfo = CHAIN_INFO[policy.chainId as keyof typeof CHAIN_INFO];
                const usagePercentage = (policy.monthlyUsed / policy.monthlyLimit) * 100;
                
                return (
                  <div 
                    key={policy.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`w-10 h-10 ${chainInfo?.color || 'bg-gray-400'} rounded-full flex items-center justify-center text-white font-bold text-sm`}>
                        {chainInfo?.symbol?.[0] || '?'}
                      </div>
                      <div>
                        <p className="font-medium">{chainInfo?.name || `Chain ${policy.chainId}`}</p>
                        <p className="text-sm text-gray-600">
                          ${policy.monthlyUsed} / ${policy.monthlyLimit} used ({usagePercentage.toFixed(1)}%)
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <Badge 
                        variant={policy.isActive ? "default" : "secondary"}
                        className={policy.isActive ? "bg-green-100 text-green-700" : ""}
                      >
                        {policy.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      <Button variant="ghost" size="sm">
                        <Settings className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* How Gasless Works */}
      <Card>
        <CardHeader>
          <CardTitle>How Gasless Transactions Work</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm flex-shrink-0">
                1
              </div>
              <div>
                <p className="font-medium">Set Up Gas Policy</p>
                <p className="text-sm text-gray-600">Define monthly and per-transaction limits for gas sponsorship</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm flex-shrink-0">
                2
              </div>
              <div>
                <p className="font-medium">Smart Contract Pays Gas</p>
                <p className="text-sm text-gray-600">Your smart wallet sponsors gas fees automatically within your limits</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm flex-shrink-0">
                3
              </div>
              <div>
                <p className="font-medium">Zero-Fee Experience</p>
                <p className="text-sm text-gray-600">Users enjoy gasless transactions without holding native tokens</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}