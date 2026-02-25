import { useState, useEffect } from 'react';
import { CommissionPlan, getCommissionPlans, saveCommissionPlans } from '@/lib/commission';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Save, Edit2, X, Settings, Loader2 } from 'lucide-react';
import { Deduction } from '@/lib/commission';
import { SlidingScaleTierManager } from '@/components/SlidingScaleTierManager';
import { trpc } from '@/lib/trpc';
import toast from 'react-hot-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function CommissionPlansManager() {
  const [plans, setPlans] = useState<CommissionPlan[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<Partial<CommissionPlan>>({});
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch plans from database
  const { data: dbPlans, refetch, error: plansError } = trpc.commission.getPlans.useQuery(undefined, {
    retry: false,
  });
  const savePlanMutation = trpc.commission.savePlan.useMutation();
  const deletePlanMutation = trpc.commission.deletePlan.useMutation();

  useEffect(() => {
    // Use database plans if available, otherwise fall back to local storage
    if (dbPlans && dbPlans.length > 0) {
      setPlans(dbPlans);
    } else {
      setPlans(getCommissionPlans());
    }
  }, [dbPlans]);

  const handleSavePlan = async () => {
    if (!currentPlan.name || currentPlan.splitPercentage === undefined) return;

    try {
      setIsSaving(true);
      const newPlan: CommissionPlan = {
        id: currentPlan.id || Math.random().toString(36).substr(2, 9),
        name: currentPlan.name,
        splitPercentage: Number(currentPlan.splitPercentage),
        capAmount: Number(currentPlan.capAmount || 0),
        postCapSplit: Number(currentPlan.postCapSplit || 100),
        royaltyPercentage: Number(currentPlan.royaltyPercentage || 0),
        royaltyCap: Number(currentPlan.royaltyCap || 0),
        deductions: currentPlan.deductions || [],
        useSliding: currentPlan.useSliding || false,
        tiers: currentPlan.tiers || [],
      };

      // Save to database via tRPC
      await savePlanMutation.mutateAsync(newPlan);

      let updatedPlans;
      if (currentPlan.id) {
        updatedPlans = plans.map(p => p.id === currentPlan.id ? newPlan : p);
      } else {
        updatedPlans = [...plans, newPlan];
      }

      setPlans(updatedPlans);
      saveCommissionPlans(updatedPlans);
      await refetch();
      setIsDialogOpen(false);
      setCurrentPlan({});
      toast.success('Commission plan saved successfully');
    } catch (error) {
      toast.error(`Failed to save plan: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePlan = async (id: string) => {
    if (confirm('Are you sure you want to delete this plan?')) {
      try {
        setIsSaving(true);
        // Delete from database via tRPC
        await deletePlanMutation.mutateAsync(id);
        
        const updatedPlans = plans.filter(p => p.id !== id);
        setPlans(updatedPlans);
        saveCommissionPlans(updatedPlans);
        await refetch();
        toast.success('Commission plan deleted successfully');
      } catch (error) {
        toast.error(`Failed to delete plan: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const openEditDialog = (plan: CommissionPlan) => {
    setCurrentPlan(plan);
    setIsEditing(true);
    setIsDialogOpen(true);
  };

  const addDeduction = () => {
    const newDeduction: Deduction = {
      id: Math.random().toString(36).substr(2, 9),
      name: '',
      amount: 0,
      type: 'fixed',
      frequency: 'per_transaction'
    };
    setCurrentPlan({
      ...currentPlan,
      deductions: [...(currentPlan.deductions || []), newDeduction]
    });
  };

  const updateDeduction = (id: string, field: keyof Deduction, value: any) => {
    const updatedDeductions = (currentPlan.deductions || []).map(d => 
      d.id === id ? { ...d, [field]: value } : d
    );
    setCurrentPlan({ ...currentPlan, deductions: updatedDeductions });
  };

  const removeDeduction = (id: string) => {
    const updatedDeductions = (currentPlan.deductions || []).filter(d => d.id !== id);
    setCurrentPlan({ ...currentPlan, deductions: updatedDeductions });
  };

  const openNewDialog = () => {
    setCurrentPlan({
      splitPercentage: 80,
      capAmount: 18000,
      postCapSplit: 100,
      royaltyPercentage: 0,
      royaltyCap: 0,
      deductions: []
    });
    setIsEditing(false);
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Commission Plans</h3>
          <p className="text-sm text-foreground">Define your brokerage's split structures and caps.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNewDialog} className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 font-bold px-6 py-2 border-2 border-primary-foreground/20">
              <Settings className="h-4 w-4" /> Commission Plan Settings
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>{isEditing ? 'Edit Plan' : 'Create New Plan'}</DialogTitle>
              <DialogDescription>
                Configure the split percentage, cap amount, and post-cap rules.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 overflow-y-auto flex-1 pr-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Plan Name</Label>
                <Input
                  id="name"
                  value={currentPlan.name || ''}
                  onChange={(e) => setCurrentPlan({ ...currentPlan, name: e.target.value })}
                  placeholder="e.g. Standard 80/20"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="split">Agent Split %</Label>
                  <Input
                    id="split"
                    type="number"
                    value={currentPlan.splitPercentage}
                    onChange={(e) => setCurrentPlan({ ...currentPlan, splitPercentage: Number(e.target.value) })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="cap">Cap Amount ($)</Label>
                  <Input
                    id="cap"
                    type="number"
                    value={currentPlan.capAmount}
                    onChange={(e) => setCurrentPlan({ ...currentPlan, capAmount: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="postCap">Post-Cap Split %</Label>
                  <Input
                    id="postCap"
                    type="number"
                    value={currentPlan.postCapSplit}
                    onChange={(e) => setCurrentPlan({ ...currentPlan, postCapSplit: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="border-t pt-4 mt-2">
                <h4 className="text-sm font-medium mb-3">Franchise Fees / Royalty (Optional)</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="royalty">Royalty %</Label>
                    <Input
                      id="royalty"
                      type="number"
                      value={currentPlan.royaltyPercentage}
                      onChange={(e) => setCurrentPlan({ ...currentPlan, royaltyPercentage: Number(e.target.value) })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="royaltyCap">Royalty Cap ($)</Label>
                    <Input
                      id="royaltyCap"
                      type="number"
                      value={currentPlan.royaltyCap}
                      onChange={(e) => setCurrentPlan({ ...currentPlan, royaltyCap: Number(e.target.value) })}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4 mt-2">
                <SlidingScaleTierManager
                  tiers={currentPlan.tiers || []}
                  onTiersChange={(tiers) => setCurrentPlan({ ...currentPlan, tiers })}
                  useSliding={currentPlan.useSliding || false}
                  onUseSlidingChange={(useSliding) => setCurrentPlan({ ...currentPlan, useSliding })}
                />
              </div>

              <div className="border-t pt-4 mt-2">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-sm font-medium">Standard Deductions</h4>
                  <Button type="button" variant="outline" size="sm" onClick={addDeduction} className="h-7 text-xs">
                    <Plus className="h-3 w-3 mr-1" /> Add Fee
                  </Button>
                </div>
                
                <div className="space-y-3">
                  {(currentPlan.deductions || []).map((deduction) => (
                    <div key={deduction.id} className="flex gap-2 items-start">
                      <div className="grid gap-1 flex-1">
                        <Input 
                          placeholder="Fee Name (e.g. Tech Fee)" 
                          className="h-8 text-sm"
                          value={deduction.name}
                          onChange={(e) => updateDeduction(deduction.id, 'name', e.target.value)}
                        />
                      </div>
                      <div className="grid gap-1 w-24">
                        <Input 
                          type="number" 
                          placeholder="Amount" 
                          className="h-8 text-sm"
                          value={deduction.amount}
                          onChange={(e) => updateDeduction(deduction.id, 'amount', Number(e.target.value))}
                        />
                      </div>
                      <div className="grid gap-1 w-24">
                         <select 
                            className="flex h-8 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm ring-offset-background placeholder:text-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            value={deduction.type}
                            onChange={(e) => updateDeduction(deduction.id, 'type', e.target.value)}
                         >
                           <option value="fixed">$ Fixed</option>
                           <option value="percentage">% GCI</option>
                         </select>
                      </div>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-foreground hover:text-destructive"
                        onClick={() => removeDeduction(deduction.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {(currentPlan.deductions || []).length === 0 && (
                    <p className="text-xs text-foreground italic text-center py-2">
                      No deductions configured.
                    </p>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter className="mt-4 border-t pt-4">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSaving}>Cancel</Button>
              <Button onClick={handleSavePlan} disabled={isSaving} className="gap-2">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {isSaving ? 'Saving...' : 'Save Plan'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {plans.map((plan) => (
          <Card key={plan.id} className="relative group hover:border-primary/50 transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex justify-between items-start">
                {plan.name}
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(plan)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDeletePlan(plan.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardTitle>
              <CardDescription>
                {plan.splitPercentage}% / {100 - plan.splitPercentage}% Split
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-foreground">Cap Amount:</span>
                  <span className="font-medium">
                    {plan.capAmount > 0 ? `$${plan.capAmount.toLocaleString()}` : 'No Cap'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground">Post-Cap Split:</span>
                  <span className="font-medium">{plan.postCapSplit}%</span>
                </div>
                {plan.royaltyPercentage ? (
                  <div className="flex justify-between text-xs text-foreground pt-2 border-t">
                    <span>Royalty: {plan.royaltyPercentage}%</span>
                    <span>Cap: ${plan.royaltyCap?.toLocaleString()}</span>
                  </div>
                ) : null}
                {plan.deductions && plan.deductions.length > 0 && (
                  <div className="pt-2 border-t mt-2">
                    <p className="text-xs font-medium text-foreground mb-1">Deductions:</p>
                    <div className="space-y-1">
                      {plan.deductions.map(d => (
                        <div key={d.id} className="flex justify-between text-xs text-foreground">
                          <span>{d.name}</span>
                          <span>{d.type === 'fixed' ? `$${d.amount}` : `${d.amount}%`}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
