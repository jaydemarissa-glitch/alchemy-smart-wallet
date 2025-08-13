import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useWallet } from "@/hooks/useWallet";
import { ChainSelector } from "./ChainSelector";
import { 
  Send, 
  ArrowUpDown, 
  Link as LinkIcon, 
  Fuel,
  CheckCircle,
  AlertCircle,
  Zap
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const sendTransactionSchema = z.object({
  to: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address"),
  amount: z.string().min(1, "Amount is required"),
  assetSymbol: z.string().min(1, "Asset is required"),
});

type SendTransactionForm = z.infer<typeof sendTransactionSchema>;

export function GaslessActions() {
  const { toast } = useToast();
  const { 
    selectedChainId, 
    getActiveWallet, 
    getGasPolicyForChain,
    sendGaslessTransaction,
    isSendingTransaction,
    gaslessStats 
  } = useWallet();

  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const activeWallet = getActiveWallet();
  const gasPolicy = getGasPolicyForChain();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<SendTransactionForm>({
    resolver: zodResolver(sendTransactionSchema),
  });

  const handleSendGasless = async (data: SendTransactionForm) => {
    if (!activeWallet) {
      toast({
        title: "No Wallet",
        description: "Please connect a wallet first",
        variant: "destructive",
      });
      return;
    }

    try {
      await sendGaslessTransaction({
        to: data.to,
        value: data.amount,
        chainId: selectedChainId,
        walletId: activeWallet.id,
      });

      setSendDialogOpen(false);
      reset();
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const usagePercentage = gasPolicy 
    ? (gasPolicy.monthlyUsed / gasPolicy.monthlyLimit) * 100 
    : 0;

  return (
    <div className="space-y-6">
      {/* Quick Actions Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2" data-testid="gasless-actions-title">
            <Zap className="w-5 h-5 text-primary" />
            <span>Gasless Actions</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  className="w-full flex items-center space-x-3 p-4 bg-primary/5 hover:bg-primary/10 h-auto"
                  variant="ghost"
                  disabled={!activeWallet || !gasPolicy}
                  data-testid="button-send-gasless"
                >
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Send className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-gray-900">Send Gasless</p>
                    <p className="text-sm text-gray-500">Zero fees on selected chain</p>
                  </div>
                  {gasPolicy && (
                    <Badge className="bg-green-100 text-green-800">
                      Active
                    </Badge>
                  )}
                </Button>
              </DialogTrigger>
              
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Send Gasless Transaction</DialogTitle>
                  <DialogDescription>
                    Send tokens without paying gas fees using your sponsored policy
                  </DialogDescription>
                </DialogHeader>
                
                <form onSubmit={handleSubmit(handleSendGasless)} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Network</Label>
                    <ChainSelector />
                  </div>

                  <div>
                    <Label htmlFor="to" data-testid="label-recipient-address">Recipient Address</Label>
                    <Input
                      id="to"
                      placeholder="0x..."
                      {...register("to")}
                      className={errors.to ? "border-red-500" : ""}
                      data-testid="input-recipient-address"
                    />
                    {errors.to && (
                      <p className="text-sm text-red-500 mt-1">{errors.to.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="amount" data-testid="label-amount">Amount</Label>
                    <Input
                      id="amount"
                      placeholder="0.00"
                      type="number"
                      step="any"
                      {...register("amount")}
                      className={errors.amount ? "border-red-500" : ""}
                      data-testid="input-amount"
                    />
                    {errors.amount && (
                      <p className="text-sm text-red-500 mt-1">{errors.amount.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="assetSymbol" data-testid="label-asset">Asset</Label>
                    <Input
                      id="assetSymbol"
                      placeholder="USDC"
                      {...register("assetSymbol")}
                      className={errors.assetSymbol ? "border-red-500" : ""}
                      data-testid="input-asset"
                    />
                    {errors.assetSymbol && (
                      <p className="text-sm text-red-500 mt-1">{errors.assetSymbol.message}</p>
                    )}
                  </div>

                  {gasPolicy && (
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center space-x-2 mb-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-green-900">Gas Sponsored</span>
                      </div>
                      <p className="text-sm text-green-700">
                        This transaction will be processed without gas fees
                      </p>
                    </div>
                  )}

                  <div className="flex space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setSendDialogOpen(false)}
                      className="flex-1"
                      data-testid="button-cancel-send"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={isSendingTransaction}
                      className="flex-1"
                      data-testid="button-confirm-send"
                    >
                      {isSendingTransaction ? "Sending..." : "Send"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
            
            <Button 
              className="w-full flex items-center space-x-3 p-4 bg-accent/5 hover:bg-accent/10 h-auto"
              variant="ghost"
              disabled
              data-testid="button-swap-tokens"
            >
              <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                <ArrowUpDown className="w-5 h-5 text-accent" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-gray-900">Swap Tokens</p>
                <p className="text-sm text-gray-500">Best rates across DEXs</p>
              </div>
              <Badge className="bg-gray-100 text-gray-600">
                Coming Soon
              </Badge>
            </Button>
            
            <Button 
              className="w-full flex items-center space-x-3 p-4 bg-secondary/5 hover:bg-secondary/10 h-auto"
              variant="ghost"
              disabled
              data-testid="button-bridge-assets"
            >
              <div className="w-10 h-10 bg-secondary/10 rounded-lg flex items-center justify-center">
                <LinkIcon className="w-5 h-5 text-secondary" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-gray-900">Bridge Assets</p>
                <p className="text-sm text-gray-500">Cross-chain transfers</p>
              </div>
              <Badge className="bg-gray-100 text-gray-600">
                Coming Soon
              </Badge>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Gasless Status Card */}
      {gasPolicy ? (
        <Card className="bg-gradient-to-r from-accent to-green-500 text-white">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <Fuel className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold" data-testid="gasless-status-title">Gasless Active</h3>
                <p className="text-green-100 text-sm">All transactions sponsored</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-green-100">Monthly usage</span>
                <span className="font-medium" data-testid="gasless-usage-text">
                  ${gasPolicy.monthlyUsed.toFixed(2)} / ${gasPolicy.monthlyLimit.toFixed(2)}
                </span>
              </div>
              <Progress 
                value={usagePercentage} 
                className="h-2 bg-white/20"
                data-testid="gasless-usage-progress"
              />
              <p className="text-xs text-green-100">
                {(100 - usagePercentage).toFixed(1)}% remaining this month
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-orange-200">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900" data-testid="gasless-inactive-title">Gasless Inactive</h3>
                <p className="text-orange-700 text-sm">Set up gas sponsorship to enable gasless transactions</p>
              </div>
            </div>
            <Button className="w-full" data-testid="button-setup-gasless">
              Set up Gasless
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Gasless Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2" data-testid="gasless-stats-title">
            <Fuel className="w-5 h-5 text-accent" />
            <span>Gasless Statistics</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900" data-testid="gasless-transaction-count">
                {gaslessStats.totalTransactions}
              </p>
              <p className="text-sm text-gray-600">Gasless Transactions</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-accent" data-testid="gasless-total-saved">
                ${gaslessStats.totalSaved.toFixed(2)}
              </p>
              <p className="text-sm text-gray-600">Total Saved</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
