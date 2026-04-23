/**
 * Data Validation Rules Page
 * 
 * Displays and manages data validation rules for Dotloop sync
 */

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, CheckCircle2, Plus, Trash2, Edit2 } from 'lucide-react';

interface ValidationRule {
  id: string;
  field: string;
  type: 'required' | 'format' | 'range' | 'pattern' | 'custom';
  operator: string;
  value: string;
  errorMessage: string;
  isActive: boolean;
  createdAt: Date;
}

const FIELD_OPTIONS = [
  { value: 'loopName', label: 'Loop Name' },
  { value: 'loopStatus', label: 'Loop Status' },
  { value: 'price', label: 'Price' },
  { value: 'closingDate', label: 'Closing Date' },
  { value: 'address', label: 'Address' },
  { value: 'city', label: 'City' },
  { value: 'state', label: 'State' },
  { value: 'propertyType', label: 'Property Type' },
  { value: 'agents', label: 'Agents' },
];

const RULE_TYPES = [
  { value: 'required', label: 'Required' },
  { value: 'format', label: 'Format' },
  { value: 'range', label: 'Range' },
  { value: 'pattern', label: 'Pattern' },
  { value: 'custom', label: 'Custom' },
];

export default function DataValidationRules() {
  const [rules, setRules] = useState<ValidationRule[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<ValidationRule | null>(null);
  const [formData, setFormData] = useState({
    field: '',
    type: 'required',
    operator: 'equals',
    value: '',
    errorMessage: '',
  });

  // Fetch validation rules
  const { data: validationRules } = trpc.dataValidation.getRules.useQuery(undefined, {
    enabled: true,
  });

  // Create/Update rule mutation
  const saveRuleMutation = trpc.dataValidation.saveRule.useMutation({
    onSuccess: () => {
      setIsDialogOpen(false);
      setEditingRule(null);
      setFormData({
        field: '',
        type: 'required',
        operator: 'equals',
        value: '',
        errorMessage: '',
      });
    },
  });

  // Delete rule mutation
  const deleteRuleMutation = trpc.dataValidation.deleteRule.useMutation({
    onSuccess: () => {
      setRules(rules.filter(r => r.id !== editingRule?.id));
    },
  });

  const handleSaveRule = async () => {
    if (!formData.field || !formData.errorMessage) {
      alert('Please fill in all required fields');
      return;
    }

    await saveRuleMutation.mutateAsync({
      ...formData,
      type: formData.type as 'required' | 'format' | 'range' | 'pattern' | 'custom',
      id: editingRule?.id,
    });
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (confirm('Are you sure you want to delete this rule?')) {
      await deleteRuleMutation.mutateAsync({ ruleId });
    }
  };

  const handleEditRule = (rule: ValidationRule) => {
    setEditingRule(rule);
    setFormData({
      field: rule.field,
      type: rule.type,
      operator: rule.operator,
      value: rule.value,
      errorMessage: rule.errorMessage,
    });
    setIsDialogOpen(true);
  };

  const handleNewRule = () => {
    setEditingRule(null);
    setFormData({
      field: '',
      type: 'required',
      operator: 'equals',
      value: '',
      errorMessage: '',
    });
    setIsDialogOpen(true);
  };

  const getFieldLabel = (fieldValue: string) => {
    return FIELD_OPTIONS.find(f => f.value === fieldValue)?.label || fieldValue;
  };

  const getRuleTypeLabel = (typeValue: string) => {
    return RULE_TYPES.find(t => t.value === typeValue)?.label || typeValue;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Data Validation Rules
          </h1>
          <p className="text-foreground/70 mt-2">
            Define and manage validation rules for Dotloop data synchronization
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleNewRule} className="gap-2">
              <Plus className="w-4 h-4" />
              New Rule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingRule ? 'Edit Validation Rule' : 'Create Validation Rule'}
              </DialogTitle>
              <DialogDescription>
                Define a validation rule to ensure data quality during sync
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Field Selection */}
              <div className="space-y-2">
                <Label htmlFor="field">Field *</Label>
                <Select
                  value={formData.field}
                  onValueChange={(value) =>
                    setFormData({ ...formData, field: value })
                  }
                >
                  <SelectTrigger id="field">
                    <SelectValue placeholder="Select a field" />
                  </SelectTrigger>
                  <SelectContent>
                    {FIELD_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Rule Type */}
              <div className="space-y-2">
                <Label htmlFor="type">Rule Type *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, type: value as any })
                  }
                >
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Select rule type" />
                  </SelectTrigger>
                  <SelectContent>
                    {RULE_TYPES.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Operator */}
              <div className="space-y-2">
                <Label htmlFor="operator">Operator</Label>
                <Select
                  value={formData.operator}
                  onValueChange={(value) =>
                    setFormData({ ...formData, operator: value })
                  }
                >
                  <SelectTrigger id="operator">
                    <SelectValue placeholder="Select operator" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="equals">Equals</SelectItem>
                    <SelectItem value="notEquals">Not Equals</SelectItem>
                    <SelectItem value="contains">Contains</SelectItem>
                    <SelectItem value="greaterThan">Greater Than</SelectItem>
                    <SelectItem value="lessThan">Less Than</SelectItem>
                    <SelectItem value="matches">Matches Pattern</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Value */}
              <div className="space-y-2">
                <Label htmlFor="value">Value</Label>
                <Input
                  id="value"
                  placeholder="Enter validation value"
                  value={formData.value}
                  onChange={(e) =>
                    setFormData({ ...formData, value: e.target.value })
                  }
                />
              </div>

              {/* Error Message */}
              <div className="space-y-2">
                <Label htmlFor="errorMessage">Error Message *</Label>
                <Input
                  id="errorMessage"
                  placeholder="Message to display when validation fails"
                  value={formData.errorMessage}
                  onChange={(e) =>
                    setFormData({ ...formData, errorMessage: e.target.value })
                  }
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveRule}
                  disabled={saveRuleMutation.isPending}
                  className="gap-2"
                >
                  {saveRuleMutation.isPending ? 'Saving...' : 'Save Rule'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-foreground">
              Total Rules
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{rules.length}</div>
            <p className="text-xs text-foreground/70 mt-1">Active validation rules</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-foreground">
              Active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {rules.filter(r => r.isActive).length}
            </div>
            <p className="text-xs text-foreground/70 mt-1">Currently enforced</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-foreground">
              Inactive
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {rules.filter(r => !r.isActive).length}
            </div>
            <p className="text-xs text-foreground/70 mt-1">Disabled rules</p>
          </CardContent>
        </Card>
      </div>

      {/* Validation Rules Table */}
      <Card>
        <CardHeader>
          <CardTitle>Validation Rules</CardTitle>
          <CardDescription>
            All data validation rules applied during Dotloop synchronization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Field</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Operator</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-foreground/70">
                      No validation rules defined. Click "New Rule" to create one.
                    </TableCell>
                  </TableRow>
                ) : (
                  rules.map((rule) => (
                    <TableRow key={rule.id} className="hover:bg-accent/50">
                      <TableCell className="font-medium text-foreground">
                        {getFieldLabel(rule.field)}
                      </TableCell>
                      <TableCell className="text-foreground">
                        {getRuleTypeLabel(rule.type)}
                      </TableCell>
                      <TableCell className="text-foreground">
                        {rule.operator}
                      </TableCell>
                      <TableCell className="text-foreground font-mono text-sm">
                        {rule.value || '—'}
                      </TableCell>
                      <TableCell>
                        {rule.isActive ? (
                          <Badge
                            variant="outline"
                            className="bg-emerald-50 text-emerald-700 border-emerald-200"
                          >
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Active
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-amber-50 text-amber-700 border-amber-200"
                          >
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Inactive
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditRule(rule)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteRule(rule.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Rules Documentation */}
      <Card>
        <CardHeader>
          <CardTitle>Validation Rule Types</CardTitle>
          <CardDescription>
            Understanding different types of validation rules
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium text-foreground">Required</h4>
              <p className="text-sm text-foreground/70">
                Field must have a value. No operator or value needed.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-foreground">Format</h4>
              <p className="text-sm text-foreground/70">
                Field must match a specific format (email, phone, date, etc).
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-foreground">Range</h4>
              <p className="text-sm text-foreground/70">
                Numeric field must be within a specified range (e.g., 0-100).
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-foreground">Pattern</h4>
              <p className="text-sm text-foreground/70">
                Field must match a regular expression pattern.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-foreground">Custom</h4>
              <p className="text-sm text-foreground/70">
                Custom validation logic defined by your team.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
