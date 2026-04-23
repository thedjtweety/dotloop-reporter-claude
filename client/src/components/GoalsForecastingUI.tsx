import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Target, TrendingUp, Trophy, Plus, Loader2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';

export function GoalsForecastingUI() {
  const [selectedAgent, setSelectedAgent] = useState('all');
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');

  // Mock data
  const agents = [
    { id: 'all', name: 'All Agents' },
    { id: '1', name: 'John Smith' },
    { id: '2', name: 'Jane Doe' },
    { id: '3', name: 'Bob Johnson' },
  ];

  const goals = [
    {
      id: 1,
      title: 'Q1 Volume Target',
      target: 5000000,
      current: 4200000,
      agent: 'John Smith',
      deadline: '2024-03-31',
      progress: 84,
    },
    {
      id: 2,
      title: 'Commission Goal',
      target: 300000,
      current: 252000,
      agent: 'Jane Doe',
      deadline: '2024-03-31',
      progress: 84,
    },
    {
      id: 3,
      title: 'Closing Rate Target',
      target: 90,
      current: 85,
      agent: 'Bob Johnson',
      deadline: '2024-03-31',
      progress: 94,
    },
  ];

  const contests = [
    {
      id: 1,
      title: 'March Volume Contest',
      prize: '$5,000',
      leader: 'John Smith',
      leaderVolume: 4200000,
      endDate: '2024-03-31',
      participants: 12,
    },
    {
      id: 2,
      title: 'Closing Rate Challenge',
      prize: '$2,500',
      leader: 'Jane Doe',
      leaderRate: 88,
      endDate: '2024-03-31',
      participants: 12,
    },
  ];

  const forecast = {
    thisMonth: 6500000,
    nextMonth: 7200000,
    q2Projection: 21500000,
    confidence: 85,
  };

  const addGoalMutation = trpc.goalsForecastingProcedures.setAgentGoal.useMutation() as any;

  const handleAddGoal = async () => {
    if (!newGoalTitle || !newGoalTarget) return;

    try {
      await addGoalMutation.mutateAsync({
        tenantId: 0,
        agentName: 'Current Agent',
        goalType: 'volume',
        targetValue: Number(newGoalTarget),
        currentValue: 0,
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      });
      setNewGoalTitle('');
      setNewGoalTarget('');
      setIsAddingGoal(false);
    } catch (error) {
      console.error('Failed to add goal:', error);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Target className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">Goals & Forecasting</h2>
        </div>

        <Tabs defaultValue="goals" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="goals">Goals</TabsTrigger>
            <TabsTrigger value="contests">Contests</TabsTrigger>
            <TabsTrigger value="forecast">Forecast</TabsTrigger>
          </TabsList>

          {/* Goals Tab */}
          <TabsContent value="goals" className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <div>
                <label className="text-sm font-medium text-foreground">Filter by Agent</label>
                <select
                  value={selectedAgent}
                  onChange={(e) => setSelectedAgent(e.target.value)}
                  className="w-full mt-2 px-3 py-2 border rounded-md bg-background text-foreground max-w-xs"
                >
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name}
                    </option>
                  ))}
                </select>
              </div>

              <Button onClick={() => setIsAddingGoal(!isAddingGoal)} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Goal
              </Button>
            </div>

            {/* Add Goal Form */}
            {isAddingGoal && (
              <Card className="p-4 bg-muted border-dashed mb-4">
                <div className="space-y-3">
                  <Input
                    placeholder="Goal title (e.g., Q1 Volume Target)"
                    value={newGoalTitle}
                    onChange={(e) => setNewGoalTitle(e.target.value)}
                  />
                  <Input
                    type="number"
                    placeholder="Target value"
                    value={newGoalTarget}
                    onChange={(e) => setNewGoalTarget(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={handleAddGoal}
                      disabled={!newGoalTitle || !newGoalTarget || addGoalMutation.isPending}
                      size="sm"
                    >
                      {addGoalMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        'Add Goal'
                      )}
                    </Button>
                    <Button onClick={() => setIsAddingGoal(false)} variant="outline" size="sm">
                      Cancel
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {/* Goals List */}
            <div className="space-y-3">
              {goals.map((goal) => (
                <Card key={goal.id} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-foreground">{goal.title}</p>
                      <p className="text-sm text-muted-foreground">{goal.agent}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Deadline</p>
                      <p className="font-medium text-foreground">
                        {new Date(goal.deadline).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium text-foreground">{goal.progress}%</span>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-blue-600"
                        style={{ width: `${goal.progress}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground pt-1">
                      <span>${(goal.current / 1000000).toFixed(1)}M</span>
                      <span>${(goal.target / 1000000).toFixed(1)}M</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Contests Tab */}
          <TabsContent value="contests" className="space-y-4">
            {contests.map((contest) => (
              <Card key={contest.id} className="p-4">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-amber-500" />
                      <p className="font-semibold text-foreground">{contest.title}</p>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Prize: {contest.prize} • {contest.participants} participants
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Ends</p>
                    <p className="font-medium text-foreground">
                      {new Date(contest.endDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">Current Leader</p>
                  <p className="font-semibold text-foreground">{contest.leader}</p>
                  {contest.leaderVolume && (
                    <p className="text-sm text-muted-foreground mt-1">
                      ${(contest.leaderVolume / 1000000).toFixed(1)}M volume
                    </p>
                  )}
                  {contest.leaderRate && (
                    <p className="text-sm text-muted-foreground mt-1">{contest.leaderRate}% closing rate</p>
                  )}
                </div>
              </Card>
            ))}
          </TabsContent>

          {/* Forecast Tab */}
          <TabsContent value="forecast" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-4">
                <p className="text-sm text-muted-foreground">This Month Forecast</p>
                <p className="text-3xl font-bold text-foreground mt-2">
                  ${(forecast.thisMonth / 1000000).toFixed(1)}M
                </p>
              </Card>

              <Card className="p-4">
                <p className="text-sm text-muted-foreground">Next Month Forecast</p>
                <p className="text-3xl font-bold text-foreground mt-2">
                  ${(forecast.nextMonth / 1000000).toFixed(1)}M
                </p>
              </Card>

              <Card className="p-4 md:col-span-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Q2 Projection</p>
                    <p className="text-3xl font-bold text-foreground mt-2">
                      ${(forecast.q2Projection / 1000000).toFixed(1)}M
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-6 h-6 text-green-600" />
                      <div>
                        <p className="text-sm text-muted-foreground">Confidence</p>
                        <p className="text-2xl font-bold text-green-600">{forecast.confidence}%</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            <Card className="p-4 bg-blue-50 border border-blue-200">
              <p className="text-sm text-blue-900">
                Forecasts are based on historical trends and current pipeline. Confidence level indicates the
                reliability of the projection.
              </p>
            </Card>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
