import { useState, useEffect } from 'react';
import { Team, getTeams, saveTeams } from '@/lib/commission';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Edit2, Users } from 'lucide-react';
import FullScreenModal from '@/components/FullScreenModal';

export default function TeamManager() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentTeam, setCurrentTeam] = useState<Partial<Team>>({});
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    setTeams(getTeams());
  }, []);

  const handleSaveTeam = () => {
    if (!currentTeam.name) return;

    const newTeam: Team = {
      id: currentTeam.id || Math.random().toString(36).substr(2, 9),
      name: currentTeam.name,
      leadAgent: currentTeam.leadAgent || '',
      teamSplitPercentage: Number(currentTeam.teamSplitPercentage || 0),
    };

    let updatedTeams;
    if (currentTeam.id) {
      updatedTeams = teams.map(t => t.id === currentTeam.id ? newTeam : t);
    } else {
      updatedTeams = [...teams, newTeam];
    }

    setTeams(updatedTeams);
    saveTeams(updatedTeams);
    setIsDialogOpen(false);
    setCurrentTeam({});
  };

  const handleDeleteTeam = (id: string) => {
    if (confirm('Are you sure you want to delete this team?')) {
      const updatedTeams = teams.filter(t => t.id !== id);
      setTeams(updatedTeams);
      saveTeams(updatedTeams);
    }
  };

  const openEditDialog = (team: Team) => {
    setCurrentTeam(team);
    setIsEditing(true);
    setIsDialogOpen(true);
  };

  const openNewDialog = () => {
    setCurrentTeam({
      teamSplitPercentage: 50
    });
    setIsEditing(false);
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Team Management</h3>
          <p className="text-sm text-foreground">Create teams and define internal split structures.</p>
        </div>
        <Button 
          onClick={openNewDialog} 
          className="gap-2" 
          variant="outline"
        >
          <Plus className="h-4 w-4" /> Add Team
        </Button>
      </div>

      <FullScreenModal
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title={isEditing ? 'Edit Team' : 'Create New Team'}
        subtitle="Define the team name and the percentage taken by the team leader/entity."
        headerActions={
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveTeam}>
              Save Team
            </Button>
          </div>
        }
      >
        <div className="max-w-2xl mx-auto py-12">
          <div className="grid gap-6">
            <div className="grid gap-2">
              <Label htmlFor="name">Team Name</Label>
              <Input
                id="name"
                value={currentTeam.name || ''}
                onChange={(e) => setCurrentTeam({ ...currentTeam, name: e.target.value })}
                placeholder="e.g. The Wolf Pack"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lead">Lead Agent Name (Optional)</Label>
              <Input
                id="lead"
                value={currentTeam.leadAgent || ''}
                onChange={(e) => setCurrentTeam({ ...currentTeam, leadAgent: e.target.value })}
                placeholder="e.g. Jordan Belfort"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="split">Team Split % (Taken from Member)</Label>
              <Input
                id="split"
                type="number"
                value={currentTeam.teamSplitPercentage}
                onChange={(e) => setCurrentTeam({ ...currentTeam, teamSplitPercentage: Number(e.target.value) })}
                placeholder="50"
              />
              <p className="text-sm text-muted-foreground">
                This percentage is deducted from the agent's GCI *before* the brokerage split.
              </p>
            </div>
          </div>
        </div>
      </FullScreenModal>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teams.map((team) => (
          <Card key={team.id} className="relative group hover:border-primary/50 transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-foreground" />
                  {team.name}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(team)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDeleteTeam(team.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardTitle>
              <CardDescription>
                Lead: {team.leadAgent || 'N/A'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between text-sm">
                <span className="text-foreground">Team Split:</span>
                <span className="font-medium">{team.teamSplitPercentage}%</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
