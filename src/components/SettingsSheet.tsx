import { useState, ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { STORAGE_KEY_SETTINGS } from '@/lib/constants';
import { Trash } from '@phosphor-icons/react';
import { toast } from 'sonner';

export interface StreamSettings {
  baseUrl: string;
  streamId: string;
  showDebug: boolean;
}

interface SettingsSheetProps {
  settings: StreamSettings;
  onChange: (settings: StreamSettings) => void;
  disabled?: boolean;
  children?: ReactNode;
}

export function SettingsSheet({ settings, onChange, disabled, children }: SettingsSheetProps) {
  const [open, setOpen] = useState(false);

  const handleOpenChange = (newOpen: boolean) => {
    if (!disabled) {
      setOpen(newOpen);
    }
  };

  const generateStreamId = () => {
    return `web-${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`;
  };

  const handleChange = (field: keyof StreamSettings, value: string | boolean) => {
    onChange({ ...settings, [field]: value });
  };

  const handleStreamIdBlur = () => {
    if (settings.streamId.trim() === '') {
      onChange({ ...settings, streamId: generateStreamId() });
    }
  };

  const handleClearData = () => {
    // Clear only the whip-settings from localStorage
    window.localStorage.removeItem(STORAGE_KEY_SETTINGS);
    toast.success('Stream settings cleared');
    window.location.reload();
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild disabled={disabled}>
        {children}
      </SheetTrigger>
      <SheetContent side="bottom" className="h-full w-full max-w-none p-0 flex flex-col" onOpenAutoFocus={(e) => e.preventDefault()}>
        <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-8 sm:py-10">
          <div className="space-y-8 max-w-2xl">
            <SheetHeader className="p-0">
              <SheetTitle className="text-2xl">Stream Settings</SheetTitle>
              <SheetDescription className="text-base">
                Configure your WHIP server connection details
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-3">
              <Label htmlFor="base-url" className="text-base">Base URL</Label>
              <Input
                id="base-url"
                type="url"
                placeholder="https://raspberrypi.local:1990"
                value={settings.baseUrl}
                onChange={(e) => handleChange('baseUrl', e.target.value)}
                className="font-mono text-base h-12"
              />
              <p className="text-base text-muted-foreground">
                The base URL of your SRS server
              </p>
            </div>

            <div className="space-y-3">
              <Label htmlFor="stream-id" className="text-base">Stream ID</Label>
              <Input
                id="stream-id"
                placeholder="web-123456"
                value={settings.streamId}
                onChange={(e) => handleChange('streamId', e.target.value)}
                onBlur={handleStreamIdBlur}
                className="font-mono text-base h-12"
              />
              <p className="text-base text-muted-foreground">
                Unique identifier for your stream
              </p>
            </div>

            <div className="space-y-3">
              <Label className="text-base text-muted-foreground">Full WHIP URL</Label>
              <div className="rounded-lg bg-muted p-4 font-mono text-base break-all">
                {settings.baseUrl}/rtc/v1/whip/?app=live&stream={settings.streamId || 'web-XXXXXX'}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="show-debug" className="text-base">Debug Information</Label>
                <p className="text-base text-muted-foreground">
                  Show connection quality, latency, bitrate and audio level
                </p>
              </div>
              <Switch
                id="show-debug"
                checked={settings.showDebug}
                onCheckedChange={(checked) => handleChange('showDebug', checked)}
              />
            </div>

            <div className="space-y-3">
              <Label className="text-base">Clear Saved Data</Label>
              <p className="text-base text-muted-foreground mb-3">
                Remove all saved settings and preferences
              </p>
              <Button 
                variant="destructive" 
                onClick={handleClearData}
                className="w-full gap-2"
              >
                <Trash weight="bold" />
                Clear All Data
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
