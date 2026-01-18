import { useState } from 'react';
import { toast } from 'sonner';
import { Save, Database, RefreshCw, AlertTriangle, Server, Cpu } from 'lucide-react';
import { Header } from '../components/Layout/Header';

export function Settings() {
  const [apiSettings, setApiSettings] = useState({
    rateLimit: 100,
    analysisDepth: 20,
    maxConcurrentJobs: 5,
    syncInterval: 6,
  });

  const handleSave = () => {
    toast.success('Settings saved successfully');
  };

  return (
    <div className="page-enter">
      <Header title="Settings" subtitle="Configure admin panel settings" />
      
      <div className="p-6 max-w-4xl">
        {/* API Configuration */}
        <div className="glass-card mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-accent/10 rounded-lg">
              <Server className="text-accent" size={20} />
            </div>
            <div>
              <h3 className="text-lg font-display font-semibold text-white">API Configuration</h3>
              <p className="text-sm text-noir-400">Configure API rate limits and timeouts</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="label">Rate Limit (requests/minute)</label>
              <input
                type="number"
                value={apiSettings.rateLimit}
                onChange={(e) => setApiSettings({ ...apiSettings, rateLimit: parseInt(e.target.value) })}
                className="input"
                min={1}
                max={1000}
              />
            </div>
            <div>
              <label className="label">Max Concurrent Jobs</label>
              <input
                type="number"
                value={apiSettings.maxConcurrentJobs}
                onChange={(e) => setApiSettings({ ...apiSettings, maxConcurrentJobs: parseInt(e.target.value) })}
                className="input"
                min={1}
                max={20}
              />
            </div>
          </div>
        </div>

        {/* Analysis Settings */}
        <div className="glass-card mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-info/10 rounded-lg">
              <Cpu className="text-info" size={20} />
            </div>
            <div>
              <h3 className="text-lg font-display font-semibold text-white">Analysis Settings</h3>
              <p className="text-sm text-noir-400">Configure default analysis parameters</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="label">Default Analysis Depth</label>
              <input
                type="number"
                value={apiSettings.analysisDepth}
                onChange={(e) => setApiSettings({ ...apiSettings, analysisDepth: parseInt(e.target.value) })}
                className="input"
                min={10}
                max={30}
              />
              <p className="text-xs text-noir-500 mt-1">Recommended: 18-22 for balance between speed and accuracy</p>
            </div>
            <div>
              <label className="label">Sync Interval (hours)</label>
              <input
                type="number"
                value={apiSettings.syncInterval}
                onChange={(e) => setApiSettings({ ...apiSettings, syncInterval: parseInt(e.target.value) })}
                className="input"
                min={1}
                max={24}
              />
              <p className="text-xs text-noir-500 mt-1">How often to sync games from linked accounts</p>
            </div>
          </div>
        </div>

        {/* Database Actions */}
        <div className="glass-card mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-warning/10 rounded-lg">
              <Database className="text-warning" size={20} />
            </div>
            <div>
              <h3 className="text-lg font-display font-semibold text-white">Database Actions</h3>
              <p className="text-sm text-noir-400">Manage database operations</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-noir-800/50 rounded-lg">
              <div>
                <p className="text-noir-200 font-medium">Recalculate All Statistics</p>
                <p className="text-sm text-noir-500">Rebuild user and opening statistics from game data</p>
              </div>
              <button className="btn-secondary">
                <RefreshCw size={16} /> Recalculate
              </button>
            </div>
            <div className="flex items-center justify-between p-4 bg-noir-800/50 rounded-lg">
              <div>
                <p className="text-noir-200 font-medium">Clear Failed Jobs</p>
                <p className="text-sm text-noir-500">Remove all failed analysis and sync jobs</p>
              </div>
              <button className="btn-secondary">
                <RefreshCw size={16} /> Clear
              </button>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="glass-card border-danger/20">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-danger/10 rounded-lg">
              <AlertTriangle className="text-danger" size={20} />
            </div>
            <div>
              <h3 className="text-lg font-display font-semibold text-danger">Danger Zone</h3>
              <p className="text-sm text-noir-400">Irreversible actions - proceed with caution</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-danger/5 border border-danger/20 rounded-lg">
              <div>
                <p className="text-noir-200 font-medium">Purge All Analysis Data</p>
                <p className="text-sm text-noir-500">Delete all analysis results (games will be marked for re-analysis)</p>
              </div>
              <button className="btn-danger">Purge Data</button>
            </div>
            <div className="flex items-center justify-between p-4 bg-danger/5 border border-danger/20 rounded-lg">
              <div>
                <p className="text-noir-200 font-medium">Reset Database</p>
                <p className="text-sm text-noir-500">⚠️ This will delete ALL data including users</p>
              </div>
              <button className="btn-danger">Reset Database</button>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end mt-6">
          <button onClick={handleSave} className="btn-primary">
            <Save size={18} /> Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}

