import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, Copy, Edit2, Send } from 'lucide-react';

export interface RetentionAction {
  id: string;
  name: string;
  description: string;
  category: 'compensation' | 'role' | 'support' | 'development' | 'other';
  template: string;
  priority: 'high' | 'medium' | 'low';
}

interface RetentionActionTemplatesProps {
  agentName: string;
  riskLevel: 'high' | 'medium' | 'low';
  onApply: (action: RetentionAction, customMessage: string) => void;
  isLoading?: boolean;
}

const DEFAULT_TEMPLATES: RetentionAction[] = [
  {
    id: 'counter-offer',
    name: 'Counter Offer',
    description: 'Propose improved compensation package',
    category: 'compensation',
    template: `Dear {{agentName}},

We value your contributions to our team and would like to discuss an improved compensation package to support your continued growth with us.

Key points to discuss:
- Enhanced commission structure
- Performance bonuses
- Additional benefits

Let's schedule a meeting to explore how we can better support your success.

Best regards`,
    priority: 'high',
  },
  {
    id: 'role-expansion',
    name: 'Role Expansion',
    description: 'Offer new responsibilities or leadership opportunities',
    category: 'role',
    template: `Dear {{agentName}},

We see tremendous potential in your leadership abilities and would like to discuss expanding your role within our organization.

Potential opportunities:
- Team lead position
- Mentoring junior agents
- Special market initiatives
- Management track

We believe this could provide the growth and challenge you're looking for.

Best regards`,
    priority: 'high',
  },
  {
    id: 'training-development',
    name: 'Training & Development',
    description: 'Invest in professional development and training',
    category: 'development',
    template: `Dear {{agentName}},

To support your professional growth, we'd like to invest in your development through:

- Advanced sales training programs
- Technology and tools certification
- Industry conferences and workshops
- One-on-one coaching sessions
- Leadership development programs

These investments are designed to enhance your skills and career prospects.

Best regards`,
    priority: 'medium',
  },
  {
    id: 'market-support',
    name: 'Market Support',
    description: 'Provide additional marketing and operational support',
    category: 'support',
    template: `Dear {{agentName}},

We want to ensure you have the resources needed to succeed. We're prepared to provide:

- Dedicated marketing support
- Lead generation assistance
- Administrative support
- Technology upgrades
- Transaction support team

Let's discuss how we can better support your business growth.

Best regards`,
    priority: 'medium',
  },
  {
    id: 'flexible-arrangement',
    name: 'Flexible Work Arrangement',
    description: 'Offer flexible schedule or work arrangement',
    category: 'support',
    template: `Dear {{agentName}},

Understanding the importance of work-life balance, we'd like to discuss flexible work arrangements such as:

- Flexible scheduling options
- Remote work capabilities
- Reduced desk time requirements
- Custom work arrangements

We're committed to finding arrangements that work for both you and our team.

Best regards`,
    priority: 'medium',
  },
  {
    id: 'retention-bonus',
    name: 'Retention Bonus',
    description: 'Offer financial incentive for staying',
    category: 'compensation',
    template: `Dear {{agentName}},

To recognize your value and ensure continuity, we'd like to discuss a retention bonus program that rewards your commitment to our organization.

Program details:
- Bonus amount based on performance
- Milestone-based payouts
- Additional incentives for team growth
- Long-term partnership benefits

Let's schedule a time to discuss the specifics.

Best regards`,
    priority: 'high',
  },
];

export default function RetentionActionTemplates({
  agentName,
  riskLevel,
  onApply,
  isLoading = false,
}: RetentionActionTemplatesProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<RetentionAction | null>(null);
  const [customMessage, setCustomMessage] = useState('');
  const [appliedAction, setAppliedAction] = useState<string | null>(null);

  const handleSelectAction = (action: RetentionAction) => {
    setSelectedAction(action);
    setCustomMessage(action.template.replace('{{agentName}}', agentName));
  };

  const handleApply = () => {
    if (!selectedAction) return;
    onApply(selectedAction, customMessage);
    setAppliedAction(selectedAction.id);
    setTimeout(() => {
      setIsOpen(false);
      setSelectedAction(null);
      setCustomMessage('');
    }, 1500);
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      compensation: 'bg-green-100 text-green-800',
      role: 'bg-blue-100 text-blue-800',
      support: 'bg-purple-100 text-purple-800',
      development: 'bg-orange-100 text-orange-800',
      other: 'bg-gray-100 text-gray-800',
    };
    return colors[category] || colors.other;
  };

  const getRiskColor = (risk: string) => {
    const colors: Record<string, string> = {
      high: 'bg-red-100 text-red-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-green-100 text-green-800',
    };
    return colors[risk] || colors.low;
  };

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className="bg-orange-500 hover:bg-orange-600"
      >
        <Send className="h-4 w-4 mr-2" />
        Retention Actions
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Retention Actions for {agentName}</DialogTitle>
            <DialogDescription>
              Select a pre-configured action or customize your approach
            </DialogDescription>
          </DialogHeader>

          {!selectedAction ? (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Badge className={getRiskColor(riskLevel)}>
                  Risk Level: {riskLevel.toUpperCase()}
                </Badge>
              </div>

              <div className="grid gap-3">
                {DEFAULT_TEMPLATES.map(action => (
                  <Card
                    key={action.id}
                    className="p-4 cursor-pointer hover:border-orange-500 transition-colors"
                    onClick={() => handleSelectAction(action)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{action.name}</h3>
                          <Badge className={getCategoryColor(action.category)} variant="outline">
                            {action.category}
                          </Badge>
                          {action.priority === 'high' && (
                            <Badge variant="destructive">High Priority</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{action.description}</p>
                      </div>
                      {appliedAction === action.id && (
                        <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">{selectedAction.name}</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedAction(null)}
                >
                  Back
                </Button>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Message</label>
                <Textarea
                  value={customMessage}
                  onChange={e => setCustomMessage(e.target.value)}
                  rows={12}
                  className="font-mono text-sm"
                  placeholder="Customize the message..."
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(customMessage);
                  }}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy to Clipboard
                </Button>
                <Button
                  onClick={handleApply}
                  disabled={isLoading || !customMessage}
                  className="flex-1 bg-orange-500 hover:bg-orange-600"
                >
                  {isLoading ? 'Applying...' : 'Apply Action'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
