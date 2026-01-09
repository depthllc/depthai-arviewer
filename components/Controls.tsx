import React from 'react';
import { Settings, Upload, Box, RotateCw, ScanFace, X } from 'lucide-react';
import { SceneSettings } from '../types';

interface ControlsProps {
  settings: SceneSettings;
  onSettingsChange: (newSettings: SceneSettings) => void;
  onFileUpload: (file: File) => void;
  onEnterAR: () => void;
  isAR: boolean;
  arSupported: boolean;
}

export const Controls: React.FC<ControlsProps> = ({
  settings,
  onSettingsChange,
  onFileUpload,
  onEnterAR,
  isAR,
  arSupported
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileUpload(e.target.files[0]);
    }
  };

  const updateSetting = (key: keyof SceneSettings, value: number | boolean) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  return (
    <div className="p-6 flex flex-col gap-4">
      
      {isAR && (
        <div className="text-center text-white/90 text-sm font-semibold bg-black/40 p-2 rounded-lg backdrop-blur-sm mx-auto mb-2 animate-pulse border border-white/10">
            Point camera at a surface. Tap to place model.
        </div>
      )}

      <div className="flex justify-between items-end gap-2 max-w-3xl mx-auto w-full">
        
        {/* Settings Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-4 bg-gray-900/80 backdrop-blur-md border border-white/10 rounded-2xl text-white hover:bg-gray-800 transition-colors shadow-lg active:scale-95"
          aria-label="Settings"
        >
          <Settings size={24} />
        </button>

        {/* Enter AR Button */}
        {!isAR ? (
          <button
            onClick={onEnterAR}
            disabled={!arSupported}
            className={`flex-1 flex items-center justify-center gap-3 px-6 py-3 rounded-2xl shadow-xl font-bold text-lg transition-all active:scale-95 ${
              arSupported 
                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20' 
                : 'bg-gray-800 text-gray-500 cursor-not-allowed border border-white/5'
            }`}
          >
            {arSupported ? <Box size={24} /> : <ScanFace size={24} />}
            <div className="flex flex-col items-start leading-tight">
                <span>{arSupported ? 'Enter AR Mode' : 'AR Not Supported'}</span>
                {arSupported && <span className="text-[10px] opacity-80 font-normal">Required for Camera Access</span>}
            </div>
          </button>
        ) : (
          <div className="flex-1 bg-red-500/20 border border-red-500/30 rounded-2xl p-4 flex items-center justify-center gap-2 text-red-100 text-sm font-medium backdrop-blur-md">
             <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"/>
             Live Session Active
          </div>
        )}

        {/* Upload Button */}
        <label className="p-4 bg-gray-900/80 backdrop-blur-md border border-white/10 rounded-2xl text-white hover:bg-gray-800 transition-colors cursor-pointer shadow-lg active:scale-95">
          <Upload size={24} />
          <input
            type="file"
            /* 
               Crucial Fix for Android: 
               Providing specific MIME types ensures the 'Files' app intent is triggered 
               instead of the 'Media/Gallery' picker which only shows images/videos.
               'application/octet-stream' acts as a fallback for some devices.
            */
            accept=".glb,.gltf,model/gltf-binary,model/gltf+json,application/octet-stream"
            className="hidden"
            onChange={handleFileChange}
          />
        </label>
      </div>

      {/* Expandable Settings Panel */}
      {isOpen && (
        <div className="bg-gray-900/95 backdrop-blur-xl rounded-3xl p-6 text-white space-y-6 border border-white/10 animate-slide-up max-w-3xl mx-auto w-full shadow-2xl absolute bottom-24 left-0 right-0 mx-6">
          <div className="flex justify-between items-center border-b border-white/10 pb-4">
            <h3 className="font-semibold text-lg">Scene Settings</h3>
            <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white p-2">
                <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-400 uppercase tracking-wider font-medium">
                <label>Model Scale</label>
                <span>{settings.scale.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="3"
                step="0.1"
                value={settings.scale}
                onChange={(e) => updateSetting('scale', parseFloat(e.target.value))}
                className="w-full accent-blue-500 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-400 uppercase tracking-wider font-medium">
                <label>Light Intensity</label>
                <span>{settings.directionalIntensity.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="5"
                step="0.1"
                value={settings.directionalIntensity}
                onChange={(e) => updateSetting('directionalIntensity', parseFloat(e.target.value))}
                className="w-full accent-blue-500 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

           <div className="flex items-center justify-between pt-2">
            <span className="text-sm text-gray-300">Auto-Rotate Model</span>
            <button 
              onClick={() => updateSetting('autoRotate', !settings.autoRotate)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors font-medium text-sm ${
                settings.autoRotate 
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' 
                  : 'bg-gray-800 text-gray-400 border border-gray-700'
              }`}
            >
              <RotateCw size={16} />
              {settings.autoRotate ? 'On' : 'Off'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};