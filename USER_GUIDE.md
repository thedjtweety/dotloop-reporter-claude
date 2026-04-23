# Dotloop Reporting Tool - User Guide

## Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard](#dashboard)
3. [Commission Management](#commission-management)
4. [Team Management](#team-management)
5. [Reporting](#reporting)
6. [Settings](#settings)
7. [FAQ](#faq)

## Getting Started

### Account Setup

1. **Sign In**: Navigate to https://dotloopreport.com and click "Sign In"
2. **Authenticate**: Use your Manus account credentials
3. **Connect Dotloop**: Click "Connect Dotloop Account" to authorize access to your Dotloop data
4. **Invite Team**: Go to Settings → Team Management to invite team members

### First Steps

1. Upload your first CSV export or connect to Dotloop for real-time sync
2. Review the Dashboard to see key metrics
3. Set up Commission Plans for your team
4. Generate your first report

## Dashboard

The Dashboard provides a real-time overview of your business metrics.

### Key Metrics

- **Total Transactions**: Number of deals in the selected period
- **Sales Volume**: Total transaction value
- **Gross Commission**: Total commission earned
- **Closing Rate**: Percentage of transactions that closed
- **Average Days to Close**: Average time from listing to closing

### Charts

- **Pipeline Breakdown**: Distribution of deals by status
- **Revenue by Agent**: Commission earned by each team member
- **Commission Trends**: Historical commission performance
- **Geographic Distribution**: Deals by location

### Filtering

Use the date range picker to filter data by custom periods. All metrics update automatically.

## Commission Management

### Creating a Commission Plan

1. Go to **Commission** → **Plans**
2. Click **New Plan**
3. Enter plan details:
   - **Name**: Descriptive name for the plan
   - **Split Percentage**: Your company's commission split (e.g., 50%)
   - **Cap Amount**: Maximum commission before post-cap split applies
   - **Tiers**: Optional tiered commission rates based on transaction value

4. Click **Save**

### Tiered Commission Example

For a tiered plan:
- 0-$100K: 4% commission
- $100K-$500K: 5% commission
- $500K+: 6% commission

### Assigning Plans to Agents

1. Go to **Commission** → **Agent Assignments**
2. Select an agent
3. Choose a commission plan
4. Set effective date
5. Click **Assign**

### Calculating Commissions

1. Go to **Commission** → **Calculate**
2. Select date range
3. Choose agents (or leave blank for all)
4. Click **Calculate**

Results show:
- Individual agent commissions
- Company dollar amounts
- Commission breakdowns by transaction

## Team Management

### Adding Team Members

1. Go to **Settings** → **Team Management**
2. Click **Add Member**
3. Enter email address
4. Select role:
   - **Admin**: Full access to all features
   - **Broker**: Can manage agents and view reports
   - **Member**: Can view reports and data
   - **Agent**: Can view personal transactions and commissions

5. Click **Send Invite**

### Managing Roles

1. Go to **Settings** → **Team Management**
2. Click the member's name
3. Select new role
4. Click **Update**

### Removing Team Members

1. Go to **Settings** → **Team Management**
2. Click the member's name
3. Click **Remove**
4. Confirm removal

## Reporting

### Generating Reports

1. Go to **Reporting** → **Generate**
2. Select report template:
   - **Commission Report**: Detailed commission breakdown
   - **Agent Leaderboard**: Performance rankings
   - **Financial Summary**: Revenue and profit analysis
   - **Transaction List**: Detailed transaction data

3. Choose format:
   - **PDF**: Professional formatted document
   - **Excel**: Spreadsheet for analysis

4. Set date range and filters
5. Click **Generate**

### Report Templates

#### Commission Report
Shows commission earned by agent, including:
- Transaction details
- Commission calculations
- Splits and deductions
- YTD totals

#### Agent Leaderboard
Ranks agents by:
- Total commission
- Number of deals
- Average deal size
- Closing rate

#### Financial Summary
Displays:
- Total revenue
- Company dollar
- Gross commission
- Net commission (after splits)
- Profit margins

### Scheduling Reports

1. Go to **Reporting** → **Schedules**
2. Click **New Schedule**
3. Enter schedule details:
   - **Name**: Schedule name
   - **Template**: Which report to generate
   - **Frequency**: Daily, Weekly, or Monthly
   - **Recipients**: Email addresses to send to

4. Click **Create**

Reports will be automatically generated and emailed on schedule.

### Exporting Data

1. Go to **Settings** → **Export**
2. Select data to export:
   - Transactions
   - Commission Plans
   - Team Members
   - Audit Logs

3. Choose format (JSON or CSV)
4. Click **Export**

## Settings

### Branding

1. Go to **Settings** → **Branding**
2. Upload company logo
3. Choose color scheme (Light/Dark/Auto)
4. Click **Save**

### Data Management

#### Backup Data
1. Go to **Settings** → **Data**
2. Click **Export All Data**
3. Save the JSON file

#### Reset Data
1. Go to **Settings** → **Data**
2. Click **Reset All Data**
3. Confirm (this cannot be undone)

### Security

#### Change Password
1. Go to **Settings** → **Security**
2. Click **Change Password**
3. Enter current and new password
4. Click **Update**

#### Two-Factor Authentication
1. Go to **Settings** → **Security**
2. Click **Enable 2FA**
3. Scan QR code with authenticator app
4. Enter verification code
5. Click **Enable**

### Audit Log

View all user actions and changes:

1. Go to **Settings** → **Audit Log**
2. Filter by:
   - Date range
   - User
   - Action type

3. Click on entries for details

## FAQ

### Q: How do I connect my Dotloop account?

A: Go to **Settings** → **Dotloop Integration** and click **Connect Account**. You'll be redirected to authorize access. Once authorized, transactions will sync automatically.

### Q: Can I have multiple commission plans?

A: Yes! You can create unlimited plans and assign different agents to different plans. This is useful for different commission structures (e.g., new agents vs. experienced agents).

### Q: How often are reports updated?

A: Dashboard metrics update in real-time. Scheduled reports are generated at the specified time. Manual reports are generated on-demand.

### Q: Can I export my data?

A: Yes! Go to **Settings** → **Export** to download all your data in JSON or CSV format.

### Q: What happens if I remove a team member?

A: The member loses access to the system immediately. Historical data and reports remain intact. You can re-invite them later if needed.

### Q: How do I change my commission plan?

A: Go to **Commission** → **Plans** and edit the plan. Changes apply to new transactions immediately. To recalculate existing transactions, use the **Recalculate** option.

### Q: Can I schedule multiple reports?

A: Yes! Create multiple schedules with different templates, frequencies, and recipients.

### Q: What's the difference between roles?

- **Admin**: Full system access, can manage users and settings
- **Broker**: Can manage agents and view all reports
- **Member**: Can view reports and data
- **Agent**: Can only view personal transactions

### Q: How do I troubleshoot sync issues?

A: Go to **Settings** → **Dotloop Integration** and click **Manual Sync**. Check the sync log for any errors. Contact support if issues persist.

### Q: Can I customize reports?

A: Currently, reports use predefined templates. Custom report builder coming soon!

## Support

For additional help:

- **Email**: support@dotloopreport.com
- **Chat**: Available in-app during business hours
- **Documentation**: https://dotloopreport.com/docs

## Keyboard Shortcuts

- `?` - Open help menu
- `Cmd/Ctrl + K` - Search
- `Cmd/Ctrl + /` - Toggle sidebar
- `Esc` - Close dialogs

## Tips & Tricks

1. **Use Filters**: Combine date range and agent filters for targeted analysis
2. **Export for Excel**: Export transaction data to Excel for custom analysis
3. **Schedule Reports**: Set up weekly reports to stay updated automatically
4. **Bookmark Reports**: Save frequently used report configurations
5. **Mobile Access**: Access reports on mobile via the responsive web interface

---

Last updated: April 22, 2026
