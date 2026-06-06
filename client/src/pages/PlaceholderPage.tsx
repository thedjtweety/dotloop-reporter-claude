import { useLocation } from 'wouter';
import { Construction } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PAGE_META: Record<string, { title: string; description: string }> = {
  '/stuck-deals':  { title: 'Stuck Deals',   description: 'Track and resolve stalled transactions that have been inactive too long.' },
  '/velocity':     { title: 'Velocity',       description: 'Measure how quickly deals move through each stage of the pipeline.' },
  '/retention':    { title: 'Agent Retention',description: 'Monitor agent tenure, engagement, and flight-risk indicators.' },
  '/lead-roi':     { title: 'Lead ROI',       description: 'Measure return on investment for each lead source and marketing channel.' },
  '/agent-billing':{ title: 'Agent Billing',  description: 'Manage agent invoices, fees, and desk charges in one place.' },
  '/quickbooks':   { title: 'QuickBooks Sync',description: 'Sync commission disbursements and brokerage income to QuickBooks.' },
  '/tasks':        { title: 'Tasks',          description: 'Assign and track compliance tasks, follow-ups, and action items.' },
};

export default function PlaceholderPage() {
  const [location, setLocation] = useLocation();
  const meta = PAGE_META[location] ?? { title: 'Coming Soon', description: 'This section is being built.' };

  return (
    <div className="flex flex-col items-center justify-center py-32 text-center px-4">
      <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
        <Construction className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-foreground text-xl font-semibold mb-2">{meta.title}</h3>
      <p className="text-muted-foreground text-sm max-w-sm mb-6">{meta.description}</p>
      <Button variant="outline" onClick={() => setLocation('/')}>Back to Dashboard</Button>
    </div>
  );
}
