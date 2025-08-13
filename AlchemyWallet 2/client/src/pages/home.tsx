import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { WalletDashboard } from "@/components/WalletDashboard";
import { Button } from "@/components/ui/button";
import { Menu, Bell } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-gray-50 to-gray-100">
      <Sidebar 
        isOpen={!isMobile || sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
      />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Top Bar */}
        {isMobile && (
          <header className="bg-white border-b border-gray-200 lg:hidden">
            <div className="flex items-center justify-between h-16 px-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(true)}
                data-testid="button-mobile-menu"
              >
                <Menu className="w-6 h-6 text-gray-600" />
              </Button>
              
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-gradient-to-r from-primary to-secondary rounded flex items-center justify-center">
                  <span className="text-xs font-bold text-white">A</span>
                </div>
                <span className="font-bold text-gray-900">Alchemy</span>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                data-testid="button-notifications"
              >
                <Bell className="w-6 h-6 text-gray-600" />
              </Button>
            </div>
          </header>
        )}
        
        <WalletDashboard />
      </main>
    </div>
  );
}
