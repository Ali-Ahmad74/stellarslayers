import { Settings, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useBulkEntrySettings, BulkEntrySettings } from "@/hooks/useBulkEntrySettings";
import { toast } from "sonner";

interface SettingRowProps {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

function SettingRow({ label, description, checked, onCheckedChange }: SettingRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="space-y-0.5">
        <Label className="text-sm font-medium">{label}</Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

export function BulkEntrySettingsDialog() {
  const { settings, updateSettings, resetSettings } = useBulkEntrySettings();

  const handleReset = () => {
    resetSettings();
    toast.success("Settings reset to defaults");
  };

  const handleUpdate = <K extends keyof BulkEntrySettings>(key: K, value: BulkEntrySettings[K]) => {
    updateSettings({ [key]: value });
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="shrink-0">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Bulk Entry Settings</DialogTitle>
          <DialogDescription>
            Configure default preferences for the performance entry grid. These settings will persist across sessions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Display</h4>
          <SettingRow
            label="Auto-scroll on focus"
            description="Automatically scroll to keep focused cell visible"
            checked={settings.autoScrollEnabled}
            onCheckedChange={(v) => handleUpdate("autoScrollEnabled", v)}
          />
          <SettingRow
            label="Show only selected players"
            description="Hide unselected players from the grid"
            checked={settings.showOnlySelected}
            onCheckedChange={(v) => handleUpdate("showOnlySelected", v)}
          />
          <SettingRow
            label="Show validation warnings"
            description="Display warnings for unusual stat combinations"
            checked={settings.showWarnings}
            onCheckedChange={(v) => handleUpdate("showWarnings", v)}
          />
        </div>

        <Separator />

        <div className="space-y-1">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Behavior</h4>
          <SettingRow
            label="Select all players by default"
            description="Auto-select all players when loading a new match"
            checked={settings.defaultSelectAll}
            onCheckedChange={(v) => handleUpdate("defaultSelectAll", v)}
          />
          <SettingRow
            label="Confirm before saving"
            description="Show confirmation dialog before saving performances"
            checked={settings.confirmBeforeSave}
            onCheckedChange={(v) => handleUpdate("confirmBeforeSave", v)}
          />
          <SettingRow
            label="Clear grid after save"
            description="Reset all values to zero after successful save"
            checked={settings.clearAfterSave}
            onCheckedChange={(v) => handleUpdate("clearAfterSave", v)}
          />
        </div>

        <Separator />

        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Defaults
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
