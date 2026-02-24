/**
 * Data Quality Guide Component
 * 
 * Displays best practices and tips for preparing CSV data
 * for optimal commission calculations and dashboard insights.
 * Shown on the landing page before data upload.
 */

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, AlertCircle, CheckCircle2, Users, Calendar, DollarSign, Tag, FileText } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import CSVPreparationGuide from '@/components/CSVPreparationGuide';

interface DataQualityGuideProps {
  onOpenGuide?: () => void;
}

export default function DataQualityGuide({ onOpenGuide }: DataQualityGuideProps = {}) {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const sections = [
    {
      id: 'naming',
      title: 'Consistent Agent Names',
      icon: Users,
      description: 'Use the same name format for each agent throughout your CSV',
      tips: [
        { good: 'John Smith', bad: 'J. Smith / Johnny / john smith' },
        { good: 'Jane Doe', bad: 'Dr. Jane Doe / Jane Doe, CRS' },
      ],
      impact: 'Prevents fragmented metrics and ensures accurate YTD tracking',
    },
    {
      id: 'dates',
      title: 'Accurate Date Formatting',
      icon: Calendar,
      description: 'All dates must be in MM/DD/YYYY format',
      tips: [
        { good: '12/15/2024', bad: '2024-12-15 / Dec 15, 2024 / 12/15/24' },
        { good: 'Use closing date, not contract date', bad: 'Leave blank or use contract date' },
      ],
      impact: 'Enables YTD tracking, anniversary calculations, and trend analysis',
    },
    {
      id: 'numbers',
      title: 'Numeric Data Without Formatting',
      icon: DollarSign,
      description: 'Enter prices and percentages as numbers only',
      tips: [
        { good: 'Price: 500000', bad: 'Price: $500,000' },
        { good: 'Commission Rate: 3', bad: 'Commission Rate: 0.03 or 3%' },
      ],
      impact: 'Prevents calculation errors and ensures accurate commission math',
    },
    {
      id: 'status',
      title: 'Standardized Status Values',
      icon: Tag,
      description: 'Use consistent status values across all transactions',
      tips: [
        { good: 'Closed, Active, Pending, Archived', bad: 'CLOSED, closed, Sold, In Progress' },
        { good: 'Use same capitalization', bad: 'Mix uppercase and lowercase' },
      ],
      impact: 'Ensures accurate pipeline breakdown and deal counting',
    },
    {
      id: 'agents',
      title: 'Complete Agent Lists',
      icon: FileText,
      description: 'List all agents on multi-agent transactions',
      tips: [
        { good: 'John Smith, Jane Doe', bad: 'John Smith; Jane Doe / John Smith & Jane Doe' },
        { good: 'Comma and space separator', bad: 'Semicolon or ampersand' },
      ],
      impact: 'Enables correct commission division and agent performance tracking',
    },
  ];

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h3 className="text-2xl font-bold text-foreground">Data Quality Tips</h3>
        <p className="text-muted-foreground">
          Follow these best practices to ensure accurate commission calculations and meaningful insights
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 border-l-4 border-l-green-500 bg-card/50">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Critical Fields</p>
              <p className="text-lg font-semibold text-foreground">6 required</p>
              <p className="text-xs text-muted-foreground mt-1">Loop Name, Closing Date, Agents, Price, Commission Rate, Status</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-blue-500 bg-card/50">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Data Completeness</p>
              <p className="text-lg font-semibold text-foreground">Aim for 90%+</p>
              <p className="text-xs text-muted-foreground mt-1">Check Data Health tab after upload</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-amber-500 bg-card/50">
          <div className="flex items-start gap-3">
            <DollarSign className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Common Mistake</p>
              <p className="text-lg font-semibold text-foreground">Commission Rate</p>
              <p className="text-xs text-muted-foreground mt-1">Enter as 3, not 0.03 or 3%</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Expandable Sections */}
      <div className="space-y-3">
        {sections.map((section) => {
          const Icon = section.icon;
          const isExpanded = expandedSection === section.id;

          return (
            <Card key={section.id} className="overflow-hidden bg-card/50 border-border/50 hover:border-border transition-colors">
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full p-4 flex items-center justify-between hover:bg-accent/5 transition-colors"
              >
                <div className="flex items-center gap-3 text-left">
                  <Icon className="w-5 h-5 text-primary flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-foreground">{section.title}</p>
                    <p className="text-sm text-muted-foreground">{section.description}</p>
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                )}
              </button>

              {isExpanded && (
                <div className="border-t border-border/50 px-4 py-4 space-y-4 bg-background/30">
                  {/* Tips Grid */}
                  <div className="space-y-3">
                    {section.tips.map((tip, idx) => (
                      <div key={idx} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="flex gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Good</p>
                            <p className="text-sm font-mono text-green-600 dark:text-green-400">{tip.good}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Avoid</p>
                            <p className="text-sm font-mono text-red-600 dark:text-red-400">{tip.bad}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Impact */}
                  <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-md">
                    <p className="text-xs font-medium text-primary uppercase tracking-wide mb-1">Impact</p>
                    <p className="text-sm text-foreground">{section.impact}</p>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* CTA Section */}
      <Card className="p-6 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <div className="space-y-3">
          <h4 className="font-semibold text-foreground">Ready to upload?</h4>
          <p className="text-sm text-muted-foreground">
            Use the checklist above to verify your CSV before uploading. The system will show you a data health report after import, highlighting any completeness issues.
          </p>
          <div className="flex gap-2 pt-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={onOpenGuide}>
              View Full Guide
            </Button>
          </div>
        </div>
      </Card>

      {/* Required Fields Reference */}
      <Card className="p-4 bg-card/50 border-border/50">
        <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Required CSV Fields
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span className="text-foreground">Loop Name</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span className="text-foreground">Closing Date (MM/DD/YYYY)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span className="text-foreground">Agents (comma-separated)</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span className="text-foreground">Price (numeric)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span className="text-foreground">Commission Rate (whole number)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span className="text-foreground">Loop Status (standardized)</span>
            </div>
          </div>
        </div>
      </Card>


    </div>
  );
}
