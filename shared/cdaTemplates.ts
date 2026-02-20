/**
 * CDA Template System
 * 
 * Provides pre-configured commission structures for common real estate scenarios
 */

export interface CDATemplate {
  id: string;
  name: string;
  description: string;
  category: 'standard' | 'team' | 'referral' | 'dual' | 'advanced';
  icon: string; // Lucide icon name
  
  // Transaction defaults
  sellingSplitPercent: number;
  listingSplitPercent: number;
  
  // Selling side configuration
  sellingAgent1SplitPercent: number;
  sellingAgent2SplitPercent: number;
  sellingBrokerSplitPercent: number;
  
  // Listing side configuration
  listingAgent1SplitPercent: number;
  listingAgent2SplitPercent: number;
  listingBrokerSplitPercent: number;
  
  // Referral configuration
  referralFeePercent: number;
  referralDeductFrom: 'selling' | 'listing' | 'none';
  
  // Adjustments
  adjustments: Array<{
    description: string;
    amount: number;
    deductFrom: 'selling' | 'listing';
  }>;
  
  // Metadata
  usageNotes: string;
  commonScenarios: string[];
}

export const CDA_TEMPLATES: CDATemplate[] = [
  {
    id: 'standard-70-30',
    name: 'Standard 70/30 Split',
    description: 'Most common split for experienced agents with their broker',
    category: 'standard',
    icon: 'TrendingUp',
    sellingSplitPercent: 50,
    listingSplitPercent: 50,
    sellingAgent1SplitPercent: 70,
    sellingAgent2SplitPercent: 0,
    sellingBrokerSplitPercent: 30,
    listingAgent1SplitPercent: 70,
    listingAgent2SplitPercent: 0,
    listingBrokerSplitPercent: 30,
    referralFeePercent: 0,
    referralDeductFrom: 'none',
    adjustments: [],
    usageNotes: 'Standard split for experienced agents. Agent receives 70% of their side of the commission, broker receives 30%.',
    commonScenarios: [
      'Experienced agent with 2+ years',
      'Mid-level production volume',
      'Traditional brokerage model'
    ]
  },
  {
    id: 'new-agent-50-50',
    name: 'New Agent 50/50 Split',
    description: 'Traditional training model for new agents with full broker support',
    category: 'standard',
    icon: 'GraduationCap',
    sellingSplitPercent: 50,
    listingSplitPercent: 50,
    sellingAgent1SplitPercent: 50,
    sellingAgent2SplitPercent: 0,
    sellingBrokerSplitPercent: 50,
    listingAgent1SplitPercent: 50,
    listingAgent2SplitPercent: 0,
    listingBrokerSplitPercent: 50,
    referralFeePercent: 0,
    referralDeductFrom: 'none',
    adjustments: [],
    usageNotes: 'Even split for new agents receiving extensive training, leads, and support from broker.',
    commonScenarios: [
      'First-year agents',
      'Broker provides office, leads, marketing',
      'Full mentorship and training program'
    ]
  },
  {
    id: 'high-producer-85-15',
    name: 'High Producer 85/15 Split',
    description: 'Modern cloud brokerage model for high-performing agents',
    category: 'standard',
    icon: 'Award',
    sellingSplitPercent: 50,
    listingSplitPercent: 50,
    sellingAgent1SplitPercent: 85,
    sellingAgent2SplitPercent: 0,
    sellingBrokerSplitPercent: 15,
    listingAgent1SplitPercent: 85,
    listingAgent2SplitPercent: 0,
    listingBrokerSplitPercent: 15,
    referralFeePercent: 0,
    referralDeductFrom: 'none',
    adjustments: [],
    usageNotes: 'High split for top producers, common at cloud brokerages like Real Broker. Agent keeps 85% until reaching annual cap.',
    commonScenarios: [
      'Top 20% producers',
      'Cloud/virtual brokerages',
      'Minimal broker services needed'
    ]
  },
  {
    id: 'dual-agency-full',
    name: 'Dual Agency - Full Commission',
    description: 'One agent represents both buyer and seller, receives both sides',
    category: 'dual',
    icon: 'Users',
    sellingSplitPercent: 100,
    listingSplitPercent: 0,
    sellingAgent1SplitPercent: 70,
    sellingAgent2SplitPercent: 0,
    sellingBrokerSplitPercent: 30,
    listingAgent1SplitPercent: 0,
    listingAgent2SplitPercent: 0,
    listingBrokerSplitPercent: 0,
    referralFeePercent: 0,
    referralDeductFrom: 'none',
    adjustments: [],
    usageNotes: 'Agent represents both parties and receives full commission (both sides). Listing side set to 0% since selling agent handles everything.',
    commonScenarios: [
      'Agent has buyer for own listing',
      'Internal transaction within brokerage',
      'Full 6% commission to one agent/broker'
    ]
  },
  {
    id: 'team-lead-generated',
    name: 'Team Transaction - Team Lead',
    description: '50/50 split on team-generated lead with full support',
    category: 'team',
    icon: 'Users2',
    sellingSplitPercent: 50,
    listingSplitPercent: 50,
    sellingAgent1SplitPercent: 50,
    sellingAgent2SplitPercent: 0,
    sellingBrokerSplitPercent: 50, // Broker gets 20%, Team Lead gets 30% (handled in adjustments)
    listingAgent1SplitPercent: 50,
    listingAgent2SplitPercent: 0,
    listingBrokerSplitPercent: 50,
    referralFeePercent: 0,
    referralDeductFrom: 'none',
    adjustments: [
      {
        description: 'Team Lead Split (30%)',
        amount: 0, // Will be calculated as 30% of agent's side
        deductFrom: 'selling'
      }
    ],
    usageNotes: 'Team agent receives 50% of their commission, team lead receives 30%, broker receives 20%. Used when team provides lead, marketing, and transaction support.',
    commonScenarios: [
      'Team-provided lead',
      'Team marketing and branding',
      'Transaction coordinator provided'
    ]
  },
  {
    id: 'team-agent-generated',
    name: 'Team Transaction - Agent Lead',
    description: '70/30 split on agent-generated lead with team support',
    category: 'team',
    icon: 'UserCheck',
    sellingSplitPercent: 50,
    listingSplitPercent: 50,
    sellingAgent1SplitPercent: 70,
    sellingAgent2SplitPercent: 0,
    sellingBrokerSplitPercent: 30, // Broker gets 20%, Team Lead gets 10% (handled in adjustments)
    listingAgent1SplitPercent: 70,
    listingAgent2SplitPercent: 0,
    listingBrokerSplitPercent: 30,
    referralFeePercent: 0,
    referralDeductFrom: 'none',
    adjustments: [
      {
        description: 'Team Lead Split (10%)',
        amount: 0, // Will be calculated as 10% of agent's side
        deductFrom: 'selling'
      }
    ],
    usageNotes: 'Agent brings own client and receives 70%, team lead receives 10% for brand/support, broker receives 20%.',
    commonScenarios: [
      'Agent-generated lead',
      'Sphere of influence client',
      'Team provides brand and back-office only'
    ]
  },
  {
    id: 'referral-25-percent',
    name: 'Standard Referral (25%)',
    description: 'Standard 25% referral fee to out-of-market agent',
    category: 'referral',
    icon: 'Share2',
    sellingSplitPercent: 50,
    listingSplitPercent: 50,
    sellingAgent1SplitPercent: 70,
    sellingAgent2SplitPercent: 0,
    sellingBrokerSplitPercent: 30,
    listingAgent1SplitPercent: 70,
    listingAgent2SplitPercent: 0,
    listingBrokerSplitPercent: 30,
    referralFeePercent: 25,
    referralDeductFrom: 'selling',
    adjustments: [],
    usageNotes: 'Most common referral structure. Referring agent receives 25% of gross commission before agent/broker split.',
    commonScenarios: [
      'Out-of-state referral',
      'Client relocating to another market',
      'Standard referral network'
    ]
  },
  {
    id: 'referral-35-percent',
    name: 'Premium Referral (35%)',
    description: 'Higher referral fee for warm, qualified leads',
    category: 'referral',
    icon: 'Star',
    sellingSplitPercent: 50,
    listingSplitPercent: 50,
    sellingAgent1SplitPercent: 70,
    sellingAgent2SplitPercent: 0,
    sellingBrokerSplitPercent: 30,
    listingAgent1SplitPercent: 70,
    listingAgent2SplitPercent: 0,
    listingBrokerSplitPercent: 30,
    referralFeePercent: 35,
    referralDeductFrom: 'selling',
    adjustments: [],
    usageNotes: 'Premium referral for highly qualified, warm leads with personal introduction and detailed client information.',
    commonScenarios: [
      'Personal friend/family referral',
      'Pre-qualified buyer with lender approval',
      'Detailed client background provided'
    ]
  },
  {
    id: 'co-listing-agents',
    name: 'Co-Listing Agents (50/50)',
    description: 'Two agents share listing responsibilities and commission equally',
    category: 'team',
    icon: 'Users',
    sellingSplitPercent: 50,
    listingSplitPercent: 50,
    sellingAgent1SplitPercent: 70,
    sellingAgent2SplitPercent: 0,
    sellingBrokerSplitPercent: 30,
    listingAgent1SplitPercent: 35,
    listingAgent2SplitPercent: 35,
    listingBrokerSplitPercent: 30,
    referralFeePercent: 0,
    referralDeductFrom: 'none',
    adjustments: [],
    usageNotes: 'Two agents co-list property and split listing side commission equally (35% each after broker split).',
    commonScenarios: [
      'Luxury property requiring two agents',
      'Mentor/mentee co-listing',
      'Shared client relationship'
    ]
  },
  {
    id: 'transaction-coordinator-fee',
    name: 'With Transaction Coordinator',
    description: 'Standard split with $500 transaction coordinator fee',
    category: 'advanced',
    icon: 'FileText',
    sellingSplitPercent: 50,
    listingSplitPercent: 50,
    sellingAgent1SplitPercent: 70,
    sellingAgent2SplitPercent: 0,
    sellingBrokerSplitPercent: 30,
    listingAgent1SplitPercent: 70,
    listingAgent2SplitPercent: 0,
    listingBrokerSplitPercent: 30,
    referralFeePercent: 0,
    referralDeductFrom: 'none',
    adjustments: [
      {
        description: 'Transaction Coordinator Fee',
        amount: 500,
        deductFrom: 'selling'
      }
    ],
    usageNotes: 'Standard 70/30 split with $500 flat fee for transaction coordinator services deducted from agent commission.',
    commonScenarios: [
      'Complex transaction requiring TC',
      'Agent outsources paperwork',
      'Broker-provided TC services'
    ]
  }
];

export function getTemplateById(id: string): CDATemplate | undefined {
  return CDA_TEMPLATES.find(t => t.id === id);
}

export function getTemplatesByCategory(category: CDATemplate['category']): CDATemplate[] {
  return CDA_TEMPLATES.filter(t => t.category === category);
}

export function getAllTemplateCategories(): Array<{ value: CDATemplate['category']; label: string }> {
  return [
    { value: 'standard', label: 'Standard Splits' },
    { value: 'team', label: 'Team Transactions' },
    { value: 'referral', label: 'Referral Fees' },
    { value: 'dual', label: 'Dual Agency' },
    { value: 'advanced', label: 'Advanced Scenarios' }
  ];
}
