// @ts-nocheck
/**
 * Dotloop Account Switcher Component
 * 
 * Dropdown selector for switching between multiple Dotloop accounts.
 * Shows in the header when user has connected multiple accounts.
 */

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ChevronDown, Check, Link as LinkIcon, Settings } from 'lucide-react';
import { useLocation } from 'wouter';

export default function DotloopAccountSwitcher() {
  const [, setLocation] = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  // Get all connections
  const { data: connections, isLoading: connectionsLoading } = trpc.dotloopConnections.listConnections.useQuery();
  
  // Get active connection
  const { data: activeConnection, isLoading: activeLoading } = trpc.dotloopConnections.getActiveConnection.useQuery();
  
  // Switch connection mutation
  const switchMutation = trpc.dotloopConnections.switchConnection.useMutation({
    onSuccess: () => {
      // Invalidate queries to refresh data
      trpc.useUtils().dotloopConnections.getActiveConnection.invalidate();
      trpc.useUtils().dotloopApi.invalidate();
      setIsOpen(false);
    },
  });

  if (connectionsLoading || activeLoading) {
    return (
      <Button variant="outline" size="sm" disabled>
        <LinkIcon className="w-4 h-4 mr-2" />
        Loading...
      </Button>
    );
  }

  // Don't show if no connections
  if (!connections || connections.length === 0) {
    return null;
  }

  // Don't show if only one connection
  if (connections.length === 1) {
    return (
      <Button 
        variant="outline" 
        size="sm"
        onClick={() => setLocation('/settings/dotloop')}
      >
        <LinkIcon className="w-4 h-4 mr-2" />
        {connections[0].connectionName || connections[0].dotloopAccountEmail || 'Dotloop'}
      </Button>
    );
  }

  const activeConnectionName = activeConnection?.connectionName || 
                                activeConnection?.dotloopAccountEmail || 
                                'Select Account';

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <LinkIcon className="w-4 h-4 mr-2" />
          {activeConnectionName}
          <ChevronDown className="w-4 h-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Dotloop Accounts</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {connections.map((connection) => {
          const isActive = activeConnection?.id === connection.id;
          const displayName = connection.connectionName || connection.dotloopAccountEmail || `Connection ${connection.id}`;
          
          return (
            <DropdownMenuItem
              key={connection.id}
              onClick={() => {
                if (!isActive) {
                  switchMutation.mutate({ connectionId: connection.id });
                }
              }}
              disabled={!connection.isActive || switchMutation.isPending}
              className="cursor-pointer"
            >
              <div className="flex items-center gap-3 w-full">
                {/* Status indicator dot */}
                <div className="flex-shrink-0">
                  <div 
                    className={`w-2 h-2 rounded-full ${
                      connection.isActive === 1 
                        ? 'bg-green-500' 
                        : 'bg-gray-400'
                    }`}
                    title={connection.isActive === 1 ? 'Active' : 'Inactive'}
                  />
                </div>
                
                <div className="flex items-center justify-between flex-1 min-w-0">
                  <div className="flex flex-col min-w-0">
                    <span className="font-medium truncate">{displayName}</span>
                    {connection.dotloopAccountEmail && connection.connectionName && (
                      <span className="text-xs text-muted-foreground truncate">
                        {connection.dotloopAccountEmail}
                      </span>
                    )}
                    {connection.isPrimary === 1 && (
                      <span className="text-xs text-primary">Primary</span>
                    )}
                  </div>
                  {isActive && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
                </div>
              </div>
            </DropdownMenuItem>
          );
        })}
        
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            setLocation('/settings/dotloop');
            setIsOpen(false);
          }}
          className="cursor-pointer"
        >
          <Settings className="w-4 h-4 mr-2" />
          Manage Connections
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
