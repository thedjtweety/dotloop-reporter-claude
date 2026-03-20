import React, { useState } from 'react';
import { AgentMetrics, DotloopRecord } from '@/lib/csvParser';
import { Star } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { motion } from 'framer-motion';
import { formatCurrency } from '@/lib/formatUtils';
import FullScreenModal from './FullScreenModal';
import AgentDetailsPanel from './AgentDetailsPanel';

interface WinnersPodiumProps {
  agents: AgentMetrics[];
  transactions: DotloopRecord[];
}

export default function WinnersPodium({ agents, transactions }: WinnersPodiumProps) {
  const [selectedAgent, setSelectedAgent] = useState<AgentMetrics | null>(null);

  if (agents.length < 3) return null;

  const topAgents = agents.slice(0, 3);
  const [first, second, third] = topAgents;

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const item = {
    hidden: { y: 50, opacity: 0 },
    show: { y: 0, opacity: 1 }
  };

  // Professional medal badge component
  const MedalBadge = ({ rank, color, initials }: { rank: number; color: string; initials: string }) => {
    const colors = {
      gold: 'from-yellow-300 via-yellow-200 to-yellow-400 shadow-lg shadow-yellow-500/30',
      silver: 'from-gray-300 via-gray-200 to-gray-400 shadow-lg shadow-gray-400/30',
      bronze: 'from-amber-400 via-amber-300 to-amber-500 shadow-lg shadow-amber-500/30'
    };

    return (
      <div className={`relative w-24 h-24 rounded-full bg-gradient-to-br ${colors[color as keyof typeof colors]} border-2 border-white/50 flex items-center justify-center font-bold text-2xl shadow-xl`}>
        {/* Inner shine effect */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/40 to-transparent"></div>
        
        {/* Medal number */}
        <span className="relative text-gray-700 font-display text-3xl font-bold">{rank}</span>
      </div>
    );
  };

  return (
    <div className="w-full bg-gradient-to-b from-slate-900/5 to-transparent dark:from-slate-700/10 dark:to-transparent rounded-2xl p-8 md:p-12 mb-8 border border-slate-200/50 dark:border-slate-700/50">
      {/* Header */}
      <div className="text-center mb-16">
        <div className="flex items-center justify-center gap-3 mb-2">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          >
            <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" />
          </motion.div>
          <h3 className="text-3xl md:text-4xl font-display font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
            Top Performers
          </h3>
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          >
            <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" />
          </motion.div>
        </div>
        <p className="text-slate-600 dark:text-slate-400 text-lg font-medium">Celebrating our highest achievers this period</p>
      </div>

      {/* Podium Container */}
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="flex flex-col md:flex-row justify-center items-center md:items-end gap-4 md:gap-6 pt-8"
      >
        {/* Second Place (Desktop Order: 1, Mobile Order: 2) */}
        <motion.div 
          variants={item} 
          className="flex flex-col items-center w-full md:w-1/3 max-w-[220px] cursor-pointer group order-2 md:order-1"
          onClick={() => setSelectedAgent(second)}
        >
          <div className="mb-6 flex flex-col items-center transition-transform group-hover:scale-110">
            <Avatar className="w-16 h-16 border-3 border-slate-300 dark:border-slate-600 shadow-lg mb-3 group-hover:shadow-xl transition-shadow">
              <AvatarFallback className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-lg">
                {second.agentName.split(' ').map(n => n[0]).join('').substring(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="text-center">
              <p className="font-bold text-slate-800 dark:text-slate-100 text-base truncate w-full group-hover:text-primary transition-colors">{second.agentName}</p>
              <p className="text-sm text-slate-600 dark:text-slate-400 font-semibold mt-1">{formatCurrency(second.totalCommission)}</p>
              <p className="text-xs text-slate-500 dark:text-slate-500 mt-1.5 flex items-center justify-center gap-1">
                <span className="inline-block w-1.5 h-1.5 bg-slate-400 rounded-full"></span>
                {second.closedDeals} {second.closedDeals === 1 ? 'Deal' : 'Deals'} Closed
              </p>
            </div>
          </div>
          
          {/* Podium Step */}
          <div className="w-full h-28 md:h-32 bg-gradient-to-t from-slate-200 to-slate-100 dark:from-slate-700 dark:to-slate-600 rounded-t-2xl border-t-4 border-slate-400 dark:border-slate-500 flex flex-col items-center justify-center shadow-lg relative overflow-hidden group-hover:from-slate-300 group-hover:to-slate-200 dark:group-hover:from-slate-600 dark:group-hover:to-slate-500 transition-all">
            <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent"></div>
            <MedalBadge rank={2} color="silver" initials={second.agentName.split(' ').map(n => n[0]).join('').substring(0, 2)} />
          </div>
        </motion.div>

        {/* First Place (Desktop Order: 2) */}
        <motion.div 
          variants={item} 
          className="flex flex-col items-center w-full md:w-1/3 max-w-[220px] z-10 cursor-pointer group order-1 md:order-2 md:-mb-8"
          onClick={() => setSelectedAgent(first)}
        >
          {/* Rotating star accent */}
          <motion.div 
            animate={{ rotate: 360, y: [0, -8, 0] }}
            transition={{ rotate: { duration: 20, repeat: Infinity, ease: "linear" }, y: { duration: 3, repeat: Infinity, ease: "easeInOut" } }}
            className="absolute -top-12 text-yellow-500 z-20"
          >
            <Star className="w-8 h-8 fill-yellow-500" />
          </motion.div>

          <div className="mb-6 flex flex-col items-center transition-transform group-hover:scale-110 pt-8">
            <Avatar className="w-20 h-20 border-4 border-yellow-400 shadow-2xl mb-3 ring-4 ring-yellow-400/30 group-hover:shadow-2xl group-hover:ring-yellow-400/50 transition-all">
              <AvatarFallback className="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 font-bold text-2xl">
                {first.agentName.split(' ').map(n => n[0]).join('').substring(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="text-center">
              <p className="font-bold text-slate-900 dark:text-slate-50 text-lg truncate w-full group-hover:text-primary transition-colors">{first.agentName}</p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 font-bold bg-yellow-100 dark:bg-yellow-900/40 px-3 py-1 rounded-full mt-1">
                {formatCurrency(first.totalCommission)}
              </p>
              <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1.5 flex items-center justify-center gap-1">
                <span className="inline-block w-1.5 h-1.5 bg-yellow-500 rounded-full"></span>
                {first.closedDeals} {first.closedDeals === 1 ? 'Deal' : 'Deals'} Closed
              </p>
            </div>
          </div>

          {/* Podium Step - Tallest */}
          <div className="w-full h-40 md:h-48 bg-gradient-to-t from-yellow-100 to-yellow-50 dark:from-yellow-900/30 dark:to-yellow-800/20 rounded-t-2xl border-t-4 border-yellow-400 dark:border-yellow-500 flex flex-col items-center justify-center shadow-2xl relative overflow-hidden group-hover:from-yellow-200 group-hover:to-yellow-100 dark:group-hover:from-yellow-900/40 dark:group-hover:to-yellow-800/30 transition-all">
            <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent"></div>
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <MedalBadge rank={1} color="gold" initials={first.agentName.split(' ').map(n => n[0]).join('').substring(0, 2)} />
            </motion.div>
          </div>
        </motion.div>

        {/* Third Place (Desktop Order: 3, Mobile Order: 3) */}
        <motion.div 
          variants={item} 
          className="flex flex-col items-center w-full md:w-1/3 max-w-[220px] cursor-pointer group order-3 md:order-3"
          onClick={() => setSelectedAgent(third)}
        >
          <div className="mb-6 flex flex-col items-center transition-transform group-hover:scale-110">
            <Avatar className="w-16 h-16 border-3 border-amber-600 dark:border-amber-500 shadow-lg mb-3 group-hover:shadow-xl transition-shadow">
              <AvatarFallback className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 font-bold text-lg">
                {third.agentName.split(' ').map(n => n[0]).join('').substring(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="text-center">
              <p className="font-bold text-slate-800 dark:text-slate-100 text-base truncate w-full group-hover:text-primary transition-colors">{third.agentName}</p>
              <p className="text-sm text-slate-600 dark:text-slate-400 font-semibold mt-1">{formatCurrency(third.totalCommission)}</p>
              <p className="text-xs text-slate-500 dark:text-slate-500 mt-1.5 flex items-center justify-center gap-1">
                <span className="inline-block w-1.5 h-1.5 bg-amber-600 rounded-full"></span>
                {third.closedDeals} {third.closedDeals === 1 ? 'Deal' : 'Deals'} Closed
              </p>
            </div>
          </div>

          {/* Podium Step */}
          <div className="w-full h-24 md:h-28 bg-gradient-to-t from-amber-100 to-amber-50 dark:from-amber-900/30 dark:to-amber-800/20 rounded-t-2xl border-t-4 border-amber-600 dark:border-amber-500 flex flex-col items-center justify-center shadow-lg relative overflow-hidden group-hover:from-amber-200 group-hover:to-amber-100 dark:group-hover:from-amber-900/40 dark:group-hover:to-amber-800/30 transition-all">
            <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent"></div>
            <MedalBadge rank={3} color="bronze" initials={third.agentName.split(' ').map(n => n[0]).join('').substring(0, 2)} />
          </div>
        </motion.div>
      </motion.div>

      {/* Agent Details Modal - Full Screen */}
      {selectedAgent && (
        <FullScreenModal
          isOpen={!!selectedAgent}
          onClose={() => setSelectedAgent(null)}
          title={`${selectedAgent.agentName} - Agent Details`}
        >
          <AgentDetailsPanel 
            agent={selectedAgent} 
            transactions={transactions} 
          />
        </FullScreenModal>
      )}
    </div>
  );
}
