import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calculator, Plus, Trash2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';

interface Tier {
  min: number;
  max: number;
  percentage: number;
}

export function CommissionCalculatorUI() {
  const [salePrice, setSalePrice] = useState<number>(500000);
  const [tiers, setTiers] = useState<Tier[]>([
    { min: 0, max: 250000, percentage: 5 },
    { min: 250000, max: 500000, percentage: 6 },
    { min: 500000, max: Infinity, percentage: 7 },
  ]);
  const [cap, setCap] = useState<number>(50000);
  const [postCapSplit, setPostCapSplit] = useState<number>(50);

  // Calculate commission
  const calculateCommission = () => {
    let commission = 0;
    for (const tier of tiers) {
      if (salePrice > tier.min) {
        const tierMax = Math.min(salePrice, tier.max);
        const tierVolume = tierMax - tier.min;
        commission += (tierVolume * tier.percentage) / 100;
      }
    }
    return commission;
  };

  const totalCommission = calculateCommission();
  const cappedCommission = Math.min(totalCommission, cap);
  const postCapAmount = totalCommission > cap ? totalCommission - cap : 0;
  const agentShare = (cappedCommission * postCapSplit) / 100;
  const brokerShare = cappedCommission - agentShare;

  const handleAddTier = () => {
    const newMin = tiers.length > 0 ? tiers[tiers.length - 1].max : 0;
    setTiers([...tiers, { min: newMin, max: Infinity, percentage: 5 }]);
  };

  const handleRemoveTier = (index: number) => {
    setTiers(tiers.filter((_, i) => i !== index));
  };

  const handleUpdateTier = (index: number, field: keyof Tier, value: any) => {
    const newTiers = [...tiers];
    newTiers[index] = { ...newTiers[index], [field]: value };
    setTiers(newTiers);
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Calculator className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">Commission Calculator</h2>
        </div>

        <Tabs defaultValue="calculator" className="space-y-6">
          <TabsList>
            <TabsTrigger value="calculator">Calculator</TabsTrigger>
            <TabsTrigger value="tiers">Tier Configuration</TabsTrigger>
          </TabsList>

          {/* Calculator Tab */}
          <TabsContent value="calculator" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Inputs */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground">Sale Price</label>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-lg font-semibold text-muted-foreground">$</span>
                    <Input
                      type="number"
                      value={salePrice}
                      onChange={(e) => setSalePrice(Number(e.target.value))}
                      className="text-lg font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground">Commission Cap</label>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-lg font-semibold text-muted-foreground">$</span>
                    <Input
                      type="number"
                      value={cap}
                      onChange={(e) => setCap(Number(e.target.value))}
                      className="text-lg font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground">Post-Cap Split (%)</label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={postCapSplit}
                    onChange={(e) => setPostCapSplit(Number(e.target.value))}
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Agent gets {postCapSplit}% of post-cap commission
                  </p>
                </div>
              </div>

              {/* Results */}
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Commission</p>
                  <p className="text-3xl font-bold text-foreground">
                    ${totalCommission.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                  </p>
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Capped Commission</p>
                  <p className="text-3xl font-bold text-foreground">
                    ${cappedCommission.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                  </p>
                </div>

                {postCapAmount > 0 && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-900">Post-Cap Commission</p>
                    <p className="text-2xl font-bold text-blue-600">
                      ${postCapAmount.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-xs text-green-900">Agent Share</p>
                    <p className="text-xl font-bold text-green-600">
                      ${agentShare.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <p className="text-xs text-amber-900">Broker Share</p>
                    <p className="text-xl font-bold text-amber-600">
                      ${brokerShare.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Tier Configuration Tab */}
          <TabsContent value="tiers" className="space-y-4">
            <div className="space-y-3">
              {tiers.map((tier, index) => (
                <div key={index} className="p-4 bg-muted rounded-lg flex items-end gap-3">
                  <div className="flex-1">
                    <label className="text-xs font-medium text-muted-foreground">Min</label>
                    <Input
                      type="number"
                      value={tier.min}
                      onChange={(e) => handleUpdateTier(index, 'min', Number(e.target.value))}
                      className="mt-1"
                    />
                  </div>

                  <div className="flex-1">
                    <label className="text-xs font-medium text-muted-foreground">Max</label>
                    <Input
                      type="number"
                      value={tier.max === Infinity ? '' : tier.max}
                      onChange={(e) =>
                        handleUpdateTier(
                          index,
                          'max',
                          e.target.value === '' ? Infinity : Number(e.target.value)
                        )
                      }
                      placeholder="Unlimited"
                      className="mt-1"
                    />
                  </div>

                  <div className="flex-1">
                    <label className="text-xs font-medium text-muted-foreground">Rate (%)</label>
                    <Input
                      type="number"
                      step="0.1"
                      value={tier.percentage}
                      onChange={(e) => handleUpdateTier(index, 'percentage', Number(e.target.value))}
                      className="mt-1"
                    />
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveTier(index)}
                    disabled={tiers.length === 1}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>

            <Button onClick={handleAddTier} variant="outline" className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Add Tier
            </Button>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
