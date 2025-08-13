import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface WalletData {
  id: string;
  address: string;
  chainId: number;
  isActive: boolean;
  createdAt: string;
}

interface AssetBalance {
  id: string;
  balance: string;
  usdValue: number;
  asset: {
    id: string;
    symbol: string;
    name: string;
    logoUrl?: string;
    decimals: number;
    chainId: number;
  };
  wallet: WalletData;
}

interface PortfolioData {
  totalBalance: number;
  change24h: number;
  assets: Array<{
    id: string;
    name: string;
    symbol: string;
    balance: string;
    usdValue: number;
    change24h: number;
    logoUrl?: string;
    chainId: number;
  }>;
}

interface TransactionData {
  id: string;
  hash: string;
  chainId: number;
  chainName: string;
  type: string;
  status: string;
  fromAddress?: string;
  toAddress?: string;
  amount?: string;
  gasSponsor: boolean;
  createdAt: string;
  asset?: {
    symbol: string;
    name: string;
  };
}

interface GasPolicyData {
  id: string;
  chainId: number;
  isActive: boolean;
  monthlyLimit: number;
  monthlyUsed: number;
  perTransactionLimit?: number;
  createdAt?: string;
  updatedAt?: string;
}

export function useWallet() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedChainId, setSelectedChainId] = useState<number>(56); // Default to BSC

  // Fetch user wallets
  const { data: wallets, isLoading: walletsLoading } = useQuery({
    queryKey: ["/api/wallets"],
    retry: false,
  });

  // Fetch portfolio data
  const { data: portfolio, isLoading: portfolioLoading, refetch: refetchPortfolio } = useQuery<PortfolioData>({
    queryKey: ["/api/portfolio"],
    retry: false,
  });

  // Fetch token balances
  const { data: balances, isLoading: balancesLoading, refetch: refetchBalances } = useQuery<AssetBalance[]>({
    queryKey: ["/api/balances"],
    retry: false,
  });

  // Fetch transactions
  const { data: transactions, isLoading: transactionsLoading } = useQuery<TransactionData[]>({
    queryKey: ["/api/transactions"],
    retry: false,
  });

  // Fetch gas policies
  const { data: gasPolicies, isLoading: gasPoliciesLoading } = useQuery<GasPolicyData[]>({
    queryKey: ["/api/gas-policies"],
    retry: false,
  });

  // Fetch supported chains
  const { data: supportedChains } = useQuery({
    queryKey: ["/api/chains"],
    retry: false,
  });

  // Create wallet mutation
  const createWalletMutation = useMutation({
    mutationFn: async (data: { address: string; chainId: number }) => {
      const response = await apiRequest("POST", "/api/wallets", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wallets"] });
      toast({
        title: "Wallet Created",
        description: "Your smart wallet has been created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create wallet",
        variant: "destructive",
      });
    },
  });

  // Refresh balances mutation
  const refreshBalancesMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/balances/refresh", {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/balances"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio"] });
      toast({
        title: "Balances Updated",
        description: "Your token balances have been refreshed",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to refresh balances",
        variant: "destructive",
      });
    },
  });

  // Send gasless transaction mutation
  const sendGaslessTransactionMutation = useMutation({
    mutationFn: async (data: {
      to: string;
      value?: string;
      data?: string;
      chainId: number;
      walletId: string;
    }) => {
      const response = await apiRequest("POST", "/api/transactions/gasless", data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/balances"] });
      queryClient.invalidateQueries({ queryKey: ["/api/gas-policies"] });
      
      toast({
        title: "Transaction Sent",
        description: `Gasless transaction submitted: ${data.hash}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Transaction Failed",
        description: error.message || "Failed to send gasless transaction",
        variant: "destructive",
      });
    },
  });

  // Create gas policy mutation
  const createGasPolicyMutation = useMutation({
    mutationFn: async (data: {
      chainId: number;
      monthlyLimit: number;
      perTransactionLimit?: number;
    }) => {
      const response = await apiRequest("POST", "/api/gas-policies", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gas-policies"] });
      toast({
        title: "Gas Policy Created",
        description: "Your gas sponsorship policy has been set up",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create gas policy",
        variant: "destructive",
      });
    },
  });

  // Helper functions
  const getActiveWallet = (chainId?: number) => {
    if (!wallets || !Array.isArray(wallets)) return null;
    const targetChainId = chainId || selectedChainId;
    return wallets.find((wallet: WalletData) => 
      wallet.chainId === targetChainId && wallet.isActive
    ) || null;
  };

  const getBalanceForAsset = (assetSymbol: string, chainId?: number) => {
    if (!balances) return null;
    const targetChainId = chainId || selectedChainId;
    return balances.find(balance => 
      balance.asset.symbol === assetSymbol && 
      balance.asset.chainId === targetChainId
    ) || null;
  };

  const getGasPolicyForChain = (chainId?: number) => {
    if (!gasPolicies) return null;
    const targetChainId = chainId || selectedChainId;
    return gasPolicies.find(policy => 
      policy.chainId === targetChainId && policy.isActive
    ) || null;
  };

  const getRecentTransactions = (limit = 5) => {
    if (!transactions) return [];
    return transactions.slice(0, limit);
  };

  // Calculate gasless stats
  const gaslessStats = {
    totalTransactions: transactions?.filter(tx => tx.gasSponsor).length || 0,
    totalSaved: gasPolicies?.reduce((sum, policy) => sum + policy.monthlyUsed, 0) || 0,
  };

  return {
    // Data
    wallets: wallets || [],
    portfolio,
    balances: balances || [],
    transactions: transactions || [],
    gasPolicies: gasPolicies || [],
    supportedChains: supportedChains || [],
    gaslessStats,
    
    // Loading states
    walletsLoading,
    portfolioLoading,
    balancesLoading,
    transactionsLoading,
    gasPoliciesLoading,
    
    // Selected chain
    selectedChainId,
    setSelectedChainId,
    
    // Helper functions
    getActiveWallet,
    getBalanceForAsset,
    getGasPolicyForChain,
    getRecentTransactions,
    
    // Actions
    createWallet: createWalletMutation.mutate,
    refreshBalances: refreshBalancesMutation.mutate,
    sendGaslessTransaction: sendGaslessTransactionMutation.mutate,
    createGasPolicy: createGasPolicyMutation.mutate,
    refetchPortfolio,
    refetchBalances,
    
    // Mutation states
    isCreatingWallet: createWalletMutation.isPending,
    isRefreshingBalances: refreshBalancesMutation.isPending,
    isSendingTransaction: sendGaslessTransactionMutation.isPending,
    isCreatingGasPolicy: createGasPolicyMutation.isPending,
  };
}
