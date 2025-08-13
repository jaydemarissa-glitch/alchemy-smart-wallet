import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Wallet, 
  Zap, 
  Shield, 
  Link as LinkIcon, 
  Users,
  ArrowRight,
  CheckCircle,
  Fuel
} from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-primary to-secondary rounded-lg flex items-center justify-center">
                <Wallet className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900" data-testid="header-title">Alchemy Wallet</h1>
                <p className="text-xs text-gray-500">Smart & Gasless</p>
              </div>
            </div>
            <Button 
              onClick={handleLogin}
              className="bg-primary text-white hover:bg-primary-dark"
              data-testid="button-login"
            >
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <Badge className="bg-primary/10 text-primary border-primary/20 px-4 py-2">
                <Zap className="w-4 h-4 mr-2" />
                Powered by Alchemy Smart Wallets
              </Badge>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6" data-testid="hero-title">
              Web3 Made 
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                {" "}Simple
              </span>
            </h1>
            
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto" data-testid="hero-description">
              Experience the future of crypto wallets with gasless transactions, social login, and enterprise-grade security across BSC and all major chains.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={handleLogin}
                size="lg"
                className="bg-primary text-white hover:bg-primary-dark px-8 py-3 text-lg"
                data-testid="button-get-started"
              >
                Get Started Free
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                className="px-8 py-3 text-lg"
                data-testid="button-learn-more"
              >
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4" data-testid="features-title">
              Why Choose Alchemy Smart Wallets?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Built for everyone, from crypto beginners to DeFi experts
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Gasless Transactions */}
            <Card className="border-2 border-transparent hover:border-primary/20 transition-colors">
              <CardContent className="p-8">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-6">
                  <Fuel className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Gasless Transactions</h3>
                <p className="text-gray-600 mb-4">
                  Send tokens without paying gas fees. We sponsor your transactions on BSC and other supported chains.
                </p>
                <ul className="space-y-2">
                  <li className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-600 mr-2 flex-shrink-0" />
                    Zero gas fees for users
                  </li>
                  <li className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-600 mr-2 flex-shrink-0" />
                    Automatic sponsorship policies
                  </li>
                  <li className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-600 mr-2 flex-shrink-0" />
                    Works across all major chains
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Social Login */}
            <Card className="border-2 border-transparent hover:border-primary/20 transition-colors">
              <CardContent className="p-8">
                <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center mb-6">
                  <Users className="w-6 h-6 text-secondary" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Social Login</h3>
                <p className="text-gray-600 mb-4">
                  Sign in with Google, email, or existing wallet. No seed phrases or complex setup required.
                </p>
                <ul className="space-y-2">
                  <li className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-600 mr-2 flex-shrink-0" />
                    Email & social authentication
                  </li>
                  <li className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-600 mr-2 flex-shrink-0" />
                    No seed phrases needed
                  </li>
                  <li className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-600 mr-2 flex-shrink-0" />
                    Social recovery options
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Multi-Chain Support */}
            <Card className="border-2 border-transparent hover:border-primary/20 transition-colors">
              <CardContent className="p-8">
                <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-6">
                  <LinkIcon className="w-6 h-6 text-accent" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Multi-Chain Support</h3>
                <p className="text-gray-600 mb-4">
                  Access BSC, Ethereum, Polygon, Base, and Arbitrum from one unified interface.
                </p>
                <ul className="space-y-2">
                  <li className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-600 mr-2 flex-shrink-0" />
                    5+ supported networks
                  </li>
                  <li className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-600 mr-2 flex-shrink-0" />
                    Cross-chain bridging
                  </li>
                  <li className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-600 mr-2 flex-shrink-0" />
                    Unified portfolio view
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Enterprise Security */}
            <Card className="border-2 border-transparent hover:border-primary/20 transition-colors">
              <CardContent className="p-8">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-6">
                  <Shield className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Enterprise Security</h3>
                <p className="text-gray-600 mb-4">
                  99.99% uptime with $150B+ in transactions secured. Your assets are protected by industry-leading security.
                </p>
                <ul className="space-y-2">
                  <li className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-600 mr-2 flex-shrink-0" />
                    Multi-signature support
                  </li>
                  <li className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-600 mr-2 flex-shrink-0" />
                    Spending limits & policies
                  </li>
                  <li className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-600 mr-2 flex-shrink-0" />
                    Advanced security features
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Smart Account Features */}
            <Card className="border-2 border-transparent hover:border-primary/20 transition-colors">
              <CardContent className="p-8">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-6">
                  <Zap className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Smart Features</h3>
                <p className="text-gray-600 mb-4">
                  Batch transactions, session keys, and programmable wallet automation for power users.
                </p>
                <ul className="space-y-2">
                  <li className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-600 mr-2 flex-shrink-0" />
                    Transaction batching
                  </li>
                  <li className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-600 mr-2 flex-shrink-0" />
                    Session keys
                  </li>
                  <li className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-600 mr-2 flex-shrink-0" />
                    Automated policies
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Developer Friendly */}
            <Card className="border-2 border-transparent hover:border-primary/20 transition-colors">
              <CardContent className="p-8">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-6">
                  <ArrowRight className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Easy Integration</h3>
                <p className="text-gray-600 mb-4">
                  Built with modern web standards and comprehensive APIs for seamless application integration.
                </p>
                <ul className="space-y-2">
                  <li className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-600 mr-2 flex-shrink-0" />
                    React SDK included
                  </li>
                  <li className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-600 mr-2 flex-shrink-0" />
                    RESTful APIs
                  </li>
                  <li className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-600 mr-2 flex-shrink-0" />
                    Comprehensive documentation
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary to-secondary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4" data-testid="cta-title">
            Ready to Experience Gasless Web3?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join thousands of users already enjoying seamless, secure, and gasless crypto transactions.
          </p>
          <Button 
            onClick={handleLogin}
            size="lg"
            className="bg-white text-primary hover:bg-gray-100 px-8 py-3 text-lg font-semibold"
            data-testid="button-cta-login"
          >
            Get Started Now
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex justify-center items-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-primary to-secondary rounded-lg flex items-center justify-center">
                <Wallet className="w-4 h-4 text-white" />
              </div>
              <span className="text-xl font-bold">Alchemy Wallet</span>
            </div>
            <p className="text-gray-400">
              Powered by Alchemy Smart Wallet infrastructure. Built for the future of Web3.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
