// @ts-nocheck
import { useState, useEffect } from 'react';
import { Download, Trash2, Eye, Search, Filter, Calendar, FileText, Loader2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { formatCurrency, formatDate } from '@/lib/formatUtils';

export default function CDAHistoryPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed'>('all');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });

  // Fetch CDA documents
  const { data: documents, isLoading, refetch } = trpc.cdaBuilder.getCDADocuments.useQuery();
  const deleteMutation = trpc.cdaBuilder.deleteCDADocument.useMutation();
  const downloadMutation = trpc.cdaBuilder.downloadCDADocument.useMutation();

  // Filter documents
  const filteredDocuments = documents?.filter(doc => {
    const matchesSearch = 
      doc.propertyAddress?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.buyerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.sellerName?.toLowerCase().includes(searchTerm.toLowerCase());

    const createdDate = new Date(doc.createdAt);
    const matchesDateRange =
      (!dateRange.from || createdDate >= new Date(dateRange.from)) &&
      (!dateRange.to || createdDate <= new Date(dateRange.to));

    return matchesSearch && matchesDateRange;
  }) || [];

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this CDA?')) return;
    try {
      await deleteMutation.mutateAsync({ id });
      refetch();
    } catch (error) {
      console.error('Error deleting CDA:', error);
    }
  };

  const handleDownload = async (id: string) => {
    try {
      const { pdfUrl } = await downloadMutation.mutateAsync({ id });
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = `CDA_${id}.pdf`;
      link.click();
    } catch (error) {
      console.error('Error downloading CDA:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0d1117] via-[#1a2332] to-[#0d1117] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">CDA Document History</h1>
          <p className="text-muted-foreground">View, download, and manage your Commission Disbursement Authorizations</p>
        </div>

        {/* Filters */}
        <div className="bg-secondary rounded-lg p-4 mb-6 border border-border">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by property, buyer, or seller..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Date From */}
            <div className="relative">
              <Calendar className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <input
                type="date"
                value={dateRange.from}
                onChange={e => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-sm text-gray-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Date To */}
            <div className="relative">
              <Calendar className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <input
                type="date"
                value={dateRange.to}
                onChange={e => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-sm text-gray-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Clear Filters */}
            <button
              onClick={() => {
                setSearchTerm('');
                setDateRange({ from: '', to: '' });
                setFilterStatus('all');
              }}
              className="px-4 py-2 bg-background border border-border rounded-lg text-sm text-foreground hover:border-emerald-500 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Documents Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="bg-secondary rounded-lg p-12 text-center border border-border">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-foreground font-medium mb-1">No CDA documents found</h3>
            <p className="text-muted-foreground text-sm">Start by creating a new CDA from the CDA Builder</p>
          </div>
        ) : (
          <div className="bg-secondary rounded-lg overflow-hidden border border-border">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-background border-b border-border">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Property</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Buyer / Seller</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Sale Price</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Created</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e2d3d]">
                  {filteredDocuments.map(doc => (
                    <tr key={doc.id} className="hover:bg-background/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-200">{doc.propertyAddress || 'N/A'}</div>
                        <div className="text-xs text-muted-foreground">{doc.city}, {doc.state}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-200">{doc.buyerName || 'N/A'}</div>
                        <div className="text-xs text-muted-foreground">{doc.sellerName || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-emerald-400">
                          {doc.salePrice ? formatCurrency(doc.salePrice) : 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-foreground">
                          {new Date(doc.createdAt).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(doc.createdAt).toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleDownload(doc.id)}
                            className="p-2 hover:bg-emerald-500/10 rounded-lg text-emerald-400 hover:text-emerald-300 transition-colors"
                            title="Download PDF"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(doc.id)}
                            disabled={deleteMutation.isPending}
                            className="p-2 hover:bg-red-500/10 rounded-lg text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary */}
            <div className="bg-background border-t border-border px-6 py-3">
              <p className="text-sm text-muted-foreground">
                Showing <span className="text-emerald-400 font-medium">{filteredDocuments.length}</span> of{' '}
                <span className="text-emerald-400 font-medium">{documents?.length || 0}</span> documents
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
