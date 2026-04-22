// @ts-nocheck
import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, Upload, Check } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';

export default function BrandingSettingsPage() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch current branding
  const { data: branding, isLoading: isBrandingLoading } = trpc.branding.getBranding.useQuery();

  // Mutations
  const updateBrandingMutation = trpc.branding.updateBranding.useMutation();
  const uploadLogoMutation = trpc.branding.uploadLogo.useMutation();

  // Form state
  const [formData, setFormData] = useState({
    brokerageName: branding?.brokerageName || '',
    tagline: branding?.tagline || '',
    address: branding?.address || '',
    phone: branding?.phone || '',
    licenseNumber: branding?.licenseNumber || '',
    primaryColor: branding?.primaryColor || '#10b981',
    secondaryColor: branding?.secondaryColor || '#3b82f6',
    accentColor: branding?.accentColor || '#8b5cf6',
  });

  const [logoPreview, setLogoPreview] = useState<string | null>(branding?.logoUrl || null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Update form when branding data loads
  React.useEffect(() => {
    if (branding) {
      setFormData({
        brokerageName: branding.brokerageName || '',
        tagline: branding.tagline || '',
        address: branding.address || '',
        phone: branding.phone || '',
        licenseNumber: branding.licenseNumber || '',
        primaryColor: branding.primaryColor || '#10b981',
        secondaryColor: branding.secondaryColor || '#3b82f6',
        accentColor: branding.accentColor || '#8b5cf6',
      });
      if (branding.logoUrl) {
        setLogoPreview(branding.logoUrl);
      }
    }
  }, [branding]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setSaveMessage({ type: 'error', text: 'Please upload an image file' });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setSaveMessage({ type: 'error', text: 'Logo must be less than 5MB' });
      return;
    }

    try {
      // Create preview
      const reader = new FileReader();
      reader.onload = (event) => {
        setLogoPreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Upload to server
      const formDataToSend = new FormData();
      formDataToSend.append('file', file);

      const response = await uploadLogoMutation.mutateAsync({ file });
      setSaveMessage({ type: 'success', text: 'Logo uploaded successfully' });
    } catch (error) {
      setSaveMessage({ type: 'error', text: 'Failed to upload logo' });
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateBrandingMutation.mutateAsync(formData);
      setSaveMessage({ type: 'success', text: 'Branding settings saved successfully' });
    } catch (error) {
      setSaveMessage({ type: 'error', text: 'Failed to save branding settings' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isBrandingLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading branding settings...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Settings</h1>
          <p className="text-muted-foreground">Manage your brokerage configuration</p>
        </div>

        {/* Save Message */}
        {saveMessage && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
            saveMessage.type === 'success' 
              ? 'bg-green-500/10 text-green-700 border border-green-500/20' 
              : 'bg-red-500/10 text-red-700 border border-red-500/20'
          }`}>
            {saveMessage.type === 'success' ? (
              <Check className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <span>{saveMessage.text}</span>
          </div>
        )}

        {/* Brokerage Section */}
        <Card className="p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                🏢 Brokerage
              </h2>
              <p className="text-muted-foreground text-sm mt-1">Your brokerage name and details</p>
            </div>
            <Button onClick={() => setFormData(formData)} variant="outline">
              Edit
            </Button>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Brokerage Name</label>
              <Input
                name="brokerageName"
                value={formData.brokerageName}
                onChange={handleInputChange}
                placeholder="e.g., Compass Point Realty"
                className="bg-slate-900/50"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Phone</label>
                <Input
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="(512) 645-8894"
                  className="bg-slate-900/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">License #</label>
                <Input
                  name="licenseNumber"
                  value={formData.licenseNumber}
                  onChange={handleInputChange}
                  placeholder="TX-578869"
                  className="bg-slate-900/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Address</label>
              <Textarea
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                placeholder="456 Business Ave, Austin TX"
                className="bg-slate-900/50"
                rows={2}
              />
            </div>
          </div>
        </Card>

        {/* Branding & White Label Section */}
        <Card className="p-8 mb-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              🎨 Branding & White Label
            </h2>
            <p className="text-muted-foreground text-sm mt-2">
              Customize your brokerage appearance across CDA documents, email reports, and the dashboard
            </p>
          </div>

          <div className="space-y-6">
            {/* Tagline */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Tagline</label>
              <Input
                name="tagline"
                value={formData.tagline}
                onChange={handleInputChange}
                placeholder="e.g., Compass Point Realty — Your Trusted Real Estate Partner"
                className="bg-slate-900/50"
              />
            </div>

            {/* Brand Colors */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-4">Brand Colors</label>
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs text-muted-foreground mb-2">Primary Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      name="primaryColor"
                      value={formData.primaryColor}
                      onChange={handleColorChange}
                      className="w-12 h-12 rounded cursor-pointer"
                    />
                    <span className="text-sm font-mono text-foreground">{formData.primaryColor}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-2">Secondary Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      name="secondaryColor"
                      value={formData.secondaryColor}
                      onChange={handleColorChange}
                      className="w-12 h-12 rounded cursor-pointer"
                    />
                    <span className="text-sm font-mono text-foreground">{formData.secondaryColor}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-2">Accent Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      name="accentColor"
                      value={formData.accentColor}
                      onChange={handleColorChange}
                      className="w-12 h-12 rounded cursor-pointer"
                    />
                    <span className="text-sm font-mono text-foreground">{formData.accentColor}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Logo Section */}
        <Card className="p-8 mb-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              🖼️ CDA Logo
            </h2>
            <p className="text-muted-foreground text-sm mt-2">
              Upload your brokerage logo to appear on Commission Disbursement Authorizations
            </p>
          </div>

          <div className="space-y-6">
            {/* Logo Preview */}
            <div className="border-2 border-dashed border-border rounded-lg p-8 flex flex-col items-center justify-center min-h-48">
              {logoPreview ? (
                <div className="text-center">
                  <img src={logoPreview} alt="Logo preview" className="max-h-32 max-w-xs mx-auto mb-4" />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Change Logo
                  </Button>
                </div>
              ) : (
                <div className="text-center">
                  <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-foreground font-medium mb-2">Click to upload logo</p>
                  <p className="text-muted-foreground text-sm">PNG, JPG, or GIF (max 5MB)</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-4"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Logo
                  </Button>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
            </div>
          </div>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end gap-3">
          <Button variant="outline">Cancel</Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || updateBrandingMutation.isPending}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {isSaving || updateBrandingMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}
