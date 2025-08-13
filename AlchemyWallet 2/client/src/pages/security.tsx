import { Sidebar } from "@/components/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { 
  Menu, 
  Shield, 
  CheckCircle, 
  AlertTriangle, 
  Key, 
  Smartphone,
  Lock,
  Eye
} from "lucide-react";

export default function Security() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="sm"
        className="lg:hidden fixed top-4 left-4 z-50"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        data-testid="mobile-menu-toggle"
      >
        <Menu className="w-6 h-6" />
      </Button>

      {/* Sidebar */}
      <Sidebar 
        isOpen={isMobileMenuOpen} 
        onClose={() => setIsMobileMenuOpen(false)} 
      />

      {/* Main content */}
      <main className="flex-1 overflow-auto p-4 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Security Center</h1>
            <p className="text-gray-600">Protect your smart wallet with advanced security features</p>
          </div>

          {/* Security Score */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                    <Shield className="w-8 h-8 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">Security Score</h3>
                    <p className="text-3xl font-bold text-green-600">98/100</p>
                    <p className="text-sm text-gray-600">Excellent protection</p>
                  </div>
                </div>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  Secure
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Security Features */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span>Smart Contract Security</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Your smart wallet uses audited contracts with built-in security features.
                </p>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm">Multi-signature protection</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm">Account recovery enabled</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm">Transaction limits active</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Key className="w-5 h-5 text-blue-600" />
                  <span>Access Control</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Manage who can access and control your smart wallet.
                </p>
                <Button variant="outline" className="w-full mb-2">
                  <Smartphone className="w-4 h-4 mr-2" />
                  Manage Devices
                </Button>
                <Button variant="outline" className="w-full">
                  <Lock className="w-4 h-4 mr-2" />
                  Session Settings
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Security Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <span>Security Recommendations</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start space-x-3 p-4 bg-amber-50 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-900">Enable Two-Factor Authentication</p>
                    <p className="text-sm text-amber-700 mt-1">
                      Add an extra layer of security to your account with 2FA.
                    </p>
                    <Button size="sm" className="mt-2 bg-amber-600 hover:bg-amber-700">
                      Enable 2FA
                    </Button>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-4 bg-blue-50 rounded-lg">
                  <Eye className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-900">Review Active Sessions</p>
                    <p className="text-sm text-blue-700 mt-1">
                      Check your active login sessions and revoke any suspicious ones.
                    </p>
                    <Button size="sm" variant="outline" className="mt-2">
                      View Sessions
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}