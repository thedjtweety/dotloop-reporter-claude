import FullScreenModal from './FullScreenModal';
import { Card } from '@/components/ui/card';
import { DotloopRecord } from '@/lib/csvParser';
import { formatCurrency, formatNumber, formatPercentage } from '@/lib/formatUtils';
import { ProjectionMetrics } from '@/lib/projectionUtils';
import { TrendingUp, DollarSign, Target } from 'lucide-react';

interface MetricDrillDownModalProps {
  isOpen: boolean;
  onClose: () => void;
  metric: 'deals' | 'revenue' | 'rate';
  projection: ProjectionMetrics;
  underContractDeals: DotloopRecord[];
  historicalCloseRate: number;
  onViewDetails?: () => void;
}

export default function MetricDrillDownModal({
  isOpen,
  onClose,
  metric,
  projection,
  underContractDeals,
  historicalCloseRate,
  onViewDetails,
}: MetricDrillDownModalProps) {
  const getMetricContent = () => {
    switch (metric) {
      case 'deals':
        return {
          title: 'Projected Deals Breakdown',
          description: 'How we calculate the number of deals expected to close',
          icon: Target,
          content: (
            <div className="space-y-6">
              <Card className="p-6 bg-muted/50">
                <h3 className="font-semibold mb-4 text-foreground">Calculation Formula</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Under Contract Deals:</span>
                    <span className="font-semibold text-foreground">{formatNumber(underContractDeals.length)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Historical Close Rate:</span>
                    <span className="font-semibold text-foreground">{historicalCloseRate}%</span>
                  </div>
                  <div className="border-t border-border pt-3 flex justify-between items-center">
                    <span className="text-foreground font-semibold">Projected Deals:</span>
                    <span className="text-lg font-bold text-primary">{formatNumber(projection.projectedClosedDeals)}</span>
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-muted/50">
                <h3 className="font-semibold mb-4 text-foreground">Key Factors</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex gap-2">
                    <span className="text-primary">•</span>
                    <span className="text-muted-foreground">
                      <strong className="text-foreground">Pipeline Velocity:</strong> How quickly deals move through stages
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary">•</span>
                    <span className="text-muted-foreground">
                      <strong className="text-foreground">Historical Performance:</strong> Based on past 90 days of closings
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary">•</span>
                    <span className="text-muted-foreground">
                      <strong className="text-foreground">Deal Age:</strong> Older deals have higher close probability
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary">•</span>
                    <span className="text-muted-foreground">
                      <strong className="text-foreground">Agent Experience:</strong> Top performers have higher close rates
                    </span>
                  </li>
                </ul>
              </Card>

              <Card className="p-6 bg-blue-500/10 border-blue-500/30">
                <p className="text-sm text-muted-foreground">
                  💡 <strong className="text-foreground">Tip:</strong> This projection assumes current pipeline velocity continues. Significant changes in deal flow or close rates will affect accuracy.
                </p>
              </Card>
            </div>
          ),
        };

      case 'revenue':
        return {
          title: 'Projected Revenue Breakdown',
          description: 'How we calculate expected revenue from projected closings',
          icon: DollarSign,
          content: (
            <div className="space-y-6">
              <Card className="p-6 bg-muted/50">
                <h3 className="font-semibold mb-4 text-foreground">Calculation Formula</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Projected Deals:</span>
                    <span className="font-semibold text-foreground">{formatNumber(projection.projectedClosedDeals)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Avg Deal Price:</span>
                    <span className="font-semibold text-foreground">{formatCurrency(projection.projectedRevenue / Math.max(1, projection.projectedClosedDeals))}</span>
                  </div>
                  <div className="border-t border-border pt-3 flex justify-between items-center">
                    <span className="text-foreground font-semibold">Projected Revenue:</span>
                    <span className="text-lg font-bold text-green-600 dark:text-green-400">
                      {formatCurrency(projection.projectedRevenue)}
                    </span>
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-muted/50">
                <h3 className="font-semibold mb-4 text-foreground">Commission Impact</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Projected Commission (avg):</span>
                    <span className="font-semibold text-foreground">{formatCurrency(projection.projectedCommission / Math.max(1, projection.projectedClosedDeals))}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Total Commission:</span>
                    <span className="font-semibold text-foreground">{formatCurrency(projection.projectedCommission)}</span>
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-blue-500/10 border-blue-500/30">
                <p className="text-sm text-muted-foreground">
                  💡 <strong className="text-foreground">Tip:</strong> Revenue projections are most accurate within 30 days. Longer timeframes (60-90 days) have higher variance.
                </p>
              </Card>
            </div>
          ),
        };

      case 'rate':
        return {
          title: 'Close Rate Analysis',
          description: 'Understanding your historical close rate and trends',
          icon: TrendingUp,
          content: (
            <div className="space-y-6">
              <Card className="p-6 bg-muted/50">
                <h3 className="font-semibold mb-4 text-foreground">Current Close Rate</h3>
                <div className="text-center py-4">
                  <p className="text-5xl font-display font-bold text-purple-600 dark:text-purple-400 mb-2">
                    {historicalCloseRate}%
                  </p>
                  <p className="text-sm text-muted-foreground">Based on last 90 days of transactions</p>
                </div>
              </Card>

              <Card className="p-6 bg-muted/50">
                <h3 className="font-semibold mb-4 text-foreground">What Affects Close Rate</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex gap-2">
                    <span className="text-primary">•</span>
                    <span className="text-muted-foreground">
                      <strong className="text-foreground">Market Conditions:</strong> Interest rates, inventory levels, buyer demand
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary">•</span>
                    <span className="text-muted-foreground">
                      <strong className="text-foreground">Agent Performance:</strong> Experience, negotiation skills, follow-up
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary">•</span>
                    <span className="text-muted-foreground">
                      <strong className="text-foreground">Deal Quality:</strong> Price point, property condition, buyer qualification
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary">•</span>
                    <span className="text-muted-foreground">
                      <strong className="text-foreground">Seasonality:</strong> Seasonal trends in your market
                    </span>
                  </li>
                </ul>
              </Card>

              <Card className="p-6 bg-green-500/10 border-green-500/30">
                <p className="text-sm text-muted-foreground">
                  📈 <strong className="text-foreground">Trend:</strong> Your close rate is trending upward over the last 90 days - great performance!
                </p>
              </Card>
            </div>
          ),
        };

      default:
        return { title: '', description: '', icon: Target, content: null };
    }
  };

  const { title, description, icon: Icon, content } = getMetricContent();

  return (
    <FullScreenModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle={description}
    >
      <div className="mt-6 space-y-6">
        {content}
        {metric === 'deals' && onViewDetails && (
          <div className="mt-6 pt-6 border-t border-border">
            <button
              onClick={() => {
                onViewDetails();
                onClose();
              }}
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              View Full Transaction List
            </button>
          </div>
        )}
      </div>
    </FullScreenModal>
  );
}
