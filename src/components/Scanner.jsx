import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { UploadCloud, Camera, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { identifyPlant } from '../services/aiservise';
import PlantResult from './PlantResult';

export default function Scanner({ onScanComplete }) {
  const [imagePreview, setImagePreview] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Create preview
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
    setResult(null);
    setError(null);
    setIsScanning(true);

    // Call AI Service (Gemini Vision + Wikipedia enrichment)
    try {
      const response = await identifyPlant(file);
      if (response.success) {
        setResult(response);
        onScanComplete?.({
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          scannedAt: new Date().toISOString(),
          confidenceScore: response.confidenceScore,
          plantData: response.plantData,
          wikipedia: response.wikipedia,
        });
      } else {
        // API returned success:false — show the error message
        setError(response.error || 'Could not identify the plant. Please try a clearer photo.');
      }
    } catch (err) {
      console.error('Identification failed:', err);
      setError('Something went wrong. Please check your connection and try again.');
    } finally {
      setIsScanning(false);
    }
  };

  const resetScanner = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(null);
    setResult(null);
    setError(null);
    setIsScanning(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="scanner-shell max-w-2xl mx-auto p-4 space-y-6">

      {/* Upload Area — shown when no image selected yet */}
      {!imagePreview && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="scanner-dropzone border-2 border-dashed border-emerald-300 rounded-2xl p-12 text-center bg-emerald-50 cursor-pointer hover:bg-emerald-100 transition-colors"
          onClick={() => fileInputRef.current.click()}
        >
          {/* No capture= attribute so it shows both camera & file picker options */}
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleImageUpload}
          />
          <UploadCloud className="mx-auto h-12 w-12 text-emerald-600 mb-4" />
          <h3 className="text-lg font-semibold text-gray-800">Tap to upload or take a photo</h3>
          <p className="text-sm text-gray-500 mt-2">Supports JPG, PNG — from camera or Downloads folder</p>

          <button
            type="button"
            className="scanner-button mt-6 bg-emerald-600 text-white px-6 py-2 rounded-full font-medium flex items-center justify-center mx-auto space-x-2"
          >
            <Camera className="w-4 h-4" />
            <span>Choose Photo</span>
          </button>
        </motion.div>
      )}

      {/* Loading State */}
      {isScanning && (
        <div className="scanner-loading flex flex-col items-center justify-center p-12 space-y-4">
          <div className="relative">
            <img src={imagePreview} alt="Scanning" className="w-48 h-48 object-cover rounded-2xl opacity-50" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-12 h-12 text-emerald-600 animate-spin" />
            </div>
          </div>
          <p className="text-emerald-700 font-medium animate-pulse">AI is analyzing the plant features...</p>
        </div>
      )}

      {/* Error State — shown when API call fails or returns error */}
      {error && !isScanning && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-4 bg-red-50 border border-red-200 rounded-2xl p-8 text-center"
        >
          {imagePreview && (
            <img src={imagePreview} alt="Uploaded" className="w-32 h-32 object-cover rounded-xl opacity-70" />
          )}
          <div className="flex items-center gap-2 text-red-700 font-semibold text-base">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>Identification Failed</span>
          </div>
          <p className="text-sm text-red-600 max-w-sm">{error}</p>
          <button
            type="button"
            onClick={resetScanner}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-full font-medium text-sm transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Try Another Photo
          </button>
        </motion.div>
      )}

      {/* Result View */}
      {result && !isScanning && (
        <PlantResult result={result} imagePreview={imagePreview} onReset={resetScanner} />
      )}
    </div>
  );
}
