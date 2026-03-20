import { Card } from '@/components/ui/card';
import { AlertCircle, TrendingUp, Zap } from 'lucide-react';
import FullScreenModal from '@/components/FullScreenModal';

interface ConfidenceMetrics {
  confidence: number;
  riskLevel: 'Low Risk' | 'Medium Risk' | 'High Risk';
  riskColor: string;
  confidenceScore: number;
}

interface LogicExplainerModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'confidence' | 'risk' | 'score';
  metrics: ConfidenceMetrics;
}

export default function LogicExplainerModal({
  isOpen,
  onClose,
  type,
  metrics,
}: LogicExplainerModalProps) {
  const getContent = () => {
    switch (type) {
      case 'confidence':
        return {
          title: 'Confidence Calculation',
          description: 'How we measure the reliability of our projections',
          icon: TrendingUp,
          content: (
            <div className="space-y-6">
              <Card className="p-6 bg-muted/50">
                <h3 className="font-semibold mb-4 text-foreground">What is Confidence?</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Confidence measures how reliable our projection is based on historical data consistency and pipeline stability. Higher confidence means our predictions are more likely to be accurate.
                </p>
                <div className="text-center py-4 bg-blue-500/10 rounded-lg">
                  <p className="text-4xl font-display font-bold text-blue-600 dark:text-blue-400 mb-2">
                    {metrics.confidence}%
                  </p>
                  <p className="text-sm text-muted-foreground">Current Confidence Level</p>
                </div>
              </Card>

              <Card className="p-6 bg-muted/50">
                <h3 className="font-semibold mb-4 text-foreground">Factors That Increase Confidence</h3>
                <ul className="space-y-3 text-sm">
                  <li className="flex gap-3">
                    <span className="text-primary font-bold">1.</span>
                    <div>
                      <strong className="text-foreground">Historical Data:</strong>
                      <p className="text-muted-foreground">More past transactions = more reliable patterns</p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-primary font-bold">2.</span>
                    <div>
                      <strong className="text-foreground">Consistency:</strong>
                      <p className="text-muted-foreground">Stable close rates and deal timelines</p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-primary font-bold">3.</span>
                    <div>
                      <strong className="text-foreground">Pipeline Stability:</strong>
                      <p className="text-muted-foreground">Predictable deal flow and status transitions</p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-primary font-bold">4.</span>
                    <div>
                      <strong className="text-foreground">Agent Experience:</strong>
                      <p className="text-muted-foreground">Experienced agents have more predictable outcomes</p>
                    </div>
                  </li>
                </ul>
              </Card>

              <Card className="p-4 bg-blue-500/10 border-blue-500/30">
                <p className="text-sm text-muted-foreground">
                  💡 <strong className="text-foreground">Tip:</strong> Track your confidence level over time. As you build more data, your confidence should increase.
                </p>
              </Card>
            </div>
          ),
        };

      case 'risk':
        return {
          title: 'Risk Calculation',
          description: 'Understanding deal fall-through probability',
          icon: AlertCircle,
          content: (
            <div className="space-y-6">
              <Card className="p-6 bg-muted/50">
                <h3 className="font-semibold mb-4 text-foreground">What is Risk?</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Risk measures the probability that deals in your pipeline won't close. Lower risk means more deals are likely to complete successfully.
                </p>
                <div className="text-center py-4 bg-red-500/10 rounded-lg">
                  <p className="text-4xl font-display font-bold text-red-600 dark:text-red-400 mb-2">
                    {metrics.riskLevel}
                  </p>
                  <p className="text-sm text-muted-foreground">Current Risk Level</p>
                </div>
              </Card>

              <Card className="p-6 bg-muted/50">
                <h3 className="font-semibold mb-4 text-foreground">Risk Factors Analyzed</h3>
                <ul className="space-y-3 text-sm">
                  <li className="flex gap-3">
                    <span className="text-primary font-bold">1.</span>
                    <div>
                      <strong className="text-foreground">Deal Age:</strong>
                      <p className="text-muted-foreground">Deals in contract longer than 60 days increase risk</p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-primary font-bold">2.</span>
                    <div>
                      <strong className="text-foreground">Status Volatility:</strong>
                      <p className="text-muted-foreground">Deals that move between statuses frequently are riskier</p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-primary font-bold">3.</span>
                    <div>
                      <strong className="text-foreground">Agent Experience:</strong>
                      <p className="text-muted-foreground">Less experienced agents have higher deal fall-through rates</p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-primary font-bold">4.</span>
                    <div>
                      <strong className="text-foreground">Price Point:</strong>
                      <p className="text-muted-foreground">Extreme price points (very high/low) have different risk profiles</p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-primary font-bold">5.</span>
                    <div>
                      <strong className="text-foreground">Market Conditions:</strong>
                      <p className="text-muted-foreground">Rising rates or inventory changes affect risk levels</p>
                    </div>
                  </li>
                </ul>
              </Card>

              <Card className="p-6 bg-muted/50">
                <h3 className="font-semibold mb-4 text-foreground">Risk Levels Explained</h3>
                <div className="space-y-3 text-sm">
                  <div className="p-3 bg-green-500/10 rounded border border-green-500/30">
                    <p className="font-semibold text-green-600 dark:text-green-400 mb-1">🟢 Low Risk</p>
                    <p className="text-muted-foreground">Stable pipeline, experienced team, consistent close rates</p>
                  </div>
                  <div className="p-3 bg-yellow-500/10 rounded border border-yellow-500/30">
                    <p className="font-semibold text-yellow-600 dark:text-yellow-400 mb-1">🟡 Medium Risk</p>
                    <p className="text-muted-foreground">Some volatility, mixed experience levels, moderate variability</p>
                  </div>
                  <div className="p-3 bg-red-500/10 rounded border border-red-500/30">
                    <p className="font-semibold text-red-600 dark:text-red-400 mb-1">🔴 High Risk</p>
                    <p className="text-muted-foreground">Volatile pipeline, new agents, unpredictable close rates</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4 bg-blue-500/10 border-blue-500/30">
                <p className="text-sm text-muted-foreground">
                  💡 <strong className="text-foreground">Action:</strong> High risk doesn't mean bad—it means you should monitor these deals more closely and adjust expectations accordingly.
                </p>
              </Card>
            </div>
          ),
        };

      case 'score':
        return {
          title: 'Confidence Score',
          description: 'Your overall forecast reliability metric',
          icon: Zap,
          content: (
            <div className="space-y-6">
              <Card className="p-6 bg-muted/50">
                <h3 className="font-semibold mb-4 text-foreground">What is Confidence Score?</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  The Confidence Score is a composite metric combining your Confidence level and inverse Risk level. It represents your overall forecast reliability on a 0-100 scale.
                </p>
                <div className="text-center py-4 bg-green-500/10 rounded-lg">
                  <p className="text-4xl font-display font-bold text-green-600 dark:text-green-400 mb-2">
                    {metrics.confidenceScore}%
                  </p>
                  <p className="text-sm text-muted-foreground">Overall Forecast Reliability</p>
                </div>
              </Card>

              <Card className="p-6 bg-muted/50">
                <h3 className="font-semibold mb-4 text-foreground">Score Calculation</h3>
                <div className="space-y-4 text-sm">
                  <div className="p-4 bg-muted rounded">
                    <p className="font-mono text-xs text-muted-foreground mb-3">
                      Confidence Score = (Confidence × 0.6) + ((100 - Risk) × 0.4)
                    </p>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Confidence Component (60%):</span>
                        <span className="font-semibold text-foreground">{(metrics.confidence * 0.6).toFixed(1)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Risk Component (40%):</span>
                        <span className="font-semibold text-foreground">{((100 - (metrics.riskLevel === 'High Risk' ? 75 : metrics.riskLevel === 'Medium Risk' ? 50 : 25)) * 0.4).toFixed(1)}</span>
                      </div>
                      <div className="border-t border-border pt-2 flex justify-between">
                        <span className="text-foreground font-semibold">Final Score:</span>
                        <span className="text-lg font-bold text-green-600 dark:text-green-400">{metrics.confidenceScore}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-muted/50">
                <h3 className="font-semibold mb-4 text-foreground">Score Interpretation</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between p-3 bg-green-500/10 rounded">
                    <span className="font-semibold text-green-600 dark:text-green-400">80-100%</span>
                    <span className="text-muted-foreground">Excellent - Very reliable forecast</span>
                  </div>
                  <div className="flex justify-between p-3 bg-blue-500/10 rounded">
                    <span className="font-semibold text-blue-600 dark:text-blue-400">60-79%</span>
                    <span className="text-muted-foreground">Good - Reasonably reliable</span>
                  </div>
                  <div className="flex justify-between p-3 bg-yellow-500/10 rounded">
                    <span className="font-semibold text-yellow-600 dark:text-yellow-400">40-59%</span>
                    <span className="text-muted-foreground">Fair - Use with caution</span>
                  </div>
                  <div className="flex justify-between p-3 bg-red-500/10 rounded">
                    <span className="font-semibold text-red-600 dark:text-red-400">Below 40%</span>
                    <span className="text-muted-foreground">Poor - Highly uncertain</span>
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-muted/50">
                <h3 className="font-semibold mb-4 text-foreground">How to Improve Your Score</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex gap-2">
                    <span className="text-primary">→</span>
                    <span className="text-muted-foreground">Build more historical data (more transactions = higher confidence)</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary">→</span>
                    <span className="text-muted-foreground">Stabilize your close rate (consistency is key)</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary">→</span>
                    <span className="text-muted-foreground">Reduce deal age volatility (keep deals moving)</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary">→</span>
                    <span className="text-muted-foreground">Invest in agent training (experience reduces risk)</span>
                  </li>
                </ul>
              </Card>

              <Card className="p-4 bg-blue-500/10 border-blue-500/30">
                <p className="text-sm text-muted-foreground">
                  💡 <strong className="text-foreground">Note:</strong> Your score updates daily as new transaction data comes in. Track it over time to see how your business is becoming more predictable.
                </p>
              </Card>
            </div>
          ),
        };

      default:
        return { title: '', description: '', icon: AlertCircle, content: null };
    }
  };

  const { title, description, icon: Icon, content } = getContent();

  return (
    <FullScreenModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle={description}
      headerActions={<Icon className="w-5 h-5 text-primary" />}
    >
      <div className="mt-6 pb-8">
        {content}
      </div>
    </FullScreenModal>
  );
}
