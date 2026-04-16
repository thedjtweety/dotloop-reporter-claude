import { useState, useEffect } from 'react';
import { Upload, Save, Loader2, AlertCircle } from 'lucide-react';
import { trpc } from '@/lib/trpc';

export default function BrandingSettingsForm() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    brokerageName: '',
    tagline: '',
    address: '',
    phone: '',
    licenseNumber: '',
    primaryColor: '#10b981',
    secondaryColor: '#8b5cf6',
    accentColor: '#f59e0b',
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Fetch branding settings
  const { data: branding } = trpc.branding.getBranding.useQuery();

  // Update form when branding data loads
  useEffect(() => {
    if (branding) {
      setFormData({
        brokerageName: branding.brokerageName || '',
        tagline: branding.tagline || '',
        address: branding.address || '',
        phone: branding.phone || '',
        licenseNumber: branding.licenseNumber || '',
        primaryColor: branding.primaryColor || '#10b981',
        secondaryColor: branding.secondaryColor || '#8b5cf6',
        accentColor: branding.accentColor || '#f59e0b',
      });
      if (branding.logoUrl) {
        setLogoPreview(branding.logoUrl);
      }
    }
  }, [branding]);

  // Mutations
  const updateBrandingMutation = trpc.branding.updateBranding.useMutation();
  const uploadLogoMutation = trpc.branding.uploadLogo.useMutation();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Logo file must be less than 5MB');
        return;
      }
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setLogoPreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      // Upload logo if selected
      if (logoFile) {
        await uploadLogoMutation.mutateAsync({ file: logoFile });
      }

      // Update branding settings
      await updateBrandingMutation.mutateAsync(formData);

      setSuccess(true);
      setLogoFile(null);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save branding settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Error Alert */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="text-red-200 text-sm">{error}</div>
        </div>
      )}

      {/* Success Alert */}
      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
          <div className="text-emerald-200 text-sm">✓ Branding settings saved successfully</div>
        </div>
      )}

      {/* Branding Info */}
      <div className="bg-[#1a2332] rounded-lg p-6">
        <h3 className="text-white text-sm font-medium mb-4">Brokerage Information</h3>
        <div className="space-y-4">
          <div>
            <label className="text-gray-400 text-xs mb-2 block">Brokerage Name *</label>
            <input
              type="text"
              value={formData.brokerageName}
              onChange={e => handleInputChange('brokerageName', e.target.value)}
              placeholder="Your Brokerage Name"
              className="w-full bg-[#0d1117] border border-[#1e2d3d] rounded-md px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="text-gray-400 text-xs mb-2 block">Tagline / Slogan</label>
            <input
              type="text"
              value={formData.tagline}
              onChange={e => handleInputChange('tagline', e.target.value)}
              placeholder="Your Trusted Real Estate Partner"
              className="w-full bg-[#0d1117] border border-[#1e2d3d] rounded-md px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="text-gray-400 text-xs mb-2 block">Address</label>
            <input
              type="text"
              value={formData.address}
              onChange={e => handleInputChange('address', e.target.value)}
              placeholder="123 Business Ave, City, State"
              className="w-full bg-[#0d1117] border border-[#1e2d3d] rounded-md px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-gray-400 text-xs mb-2 block">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={e => handleInputChange('phone', e.target.value)}
                placeholder="(555) 123-4567"
                className="w-full bg-[#0d1117] border border-[#1e2d3d] rounded-md px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-2 block">License Number</label>
              <input
                type="text"
                value={formData.licenseNumber}
                onChange={e => handleInputChange('licenseNumber', e.target.value)}
                placeholder="License #"
                className="w-full bg-[#0d1117] border border-[#1e2d3d] rounded-md px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Brand Colors */}
      <div className="bg-[#1a2332] rounded-lg p-6">
        <h3 className="text-white text-sm font-medium mb-4">Brand Colors</h3>
        <div className="grid grid-cols-3 gap-4">
          {[
            { key: 'primaryColor', label: 'Primary Color' },
            { key: 'secondaryColor', label: 'Secondary Color' },
            { key: 'accentColor', label: 'Accent Color' },
          ].map(({ key, label }) => (
            <div key={key}>
              <label className="text-gray-400 text-xs mb-2 block">{label}</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formData[key as keyof typeof formData]}
                  onChange={e => handleInputChange(key, e.target.value)}
                  className="w-12 h-10 rounded-md cursor-pointer border border-[#1e2d3d]"
                />
                <input
                  type="text"
                  value={formData[key as keyof typeof formData]}
                  onChange={e => handleInputChange(key, e.target.value)}
                  className="flex-1 bg-[#0d1117] border border-[#1e2d3d] rounded-md px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Logo Upload */}
      <div className="bg-[#1a2332] rounded-lg p-6">
        <h3 className="text-white text-sm font-medium mb-4 flex items-center gap-2">
          <Upload className="w-4 h-4 text-emerald-400" /> CDA Logo
        </h3>
        <div className="space-y-4">
          {logoPreview && (
            <div className="flex items-center gap-4">
              <img
                src={logoPreview}
                alt="Logo preview"
                className="w-24 h-24 object-contain bg-[#0d1117] rounded-lg p-2 border border-[#1e2d3d]"
              />
              <div className="text-gray-400 text-sm">
                <div>Logo preview</div>
                <button
                  onClick={() => {
                    setLogoFile(null);
                    setLogoPreview(null);
                  }}
                  className="text-red-400 hover:text-red-300 text-xs mt-1"
                >
                  Remove
                </button>
              </div>
            </div>
          )}
          <label className="border-2 border-dashed border-[#1e2d3d] rounded-lg p-6 text-center hover:border-emerald-500 transition-colors cursor-pointer block">
            <div className="text-gray-400 text-sm mb-1">Click to upload or drag and drop</div>
            <div className="text-gray-500 text-xs">PNG, JPG (Max 5MB)</div>
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoSelect}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 text-white font-medium rounded-lg transition-colors"
      >
        {saving ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="w-4 h-4" />
            Save Branding Settings
          </>
        )}
      </button>
    </div>
  );
}
