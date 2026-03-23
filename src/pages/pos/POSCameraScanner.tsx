/**
 * POSCameraScanner – Cross-platform camera barcode scanner.
 *
 * Uses html5-qrcode library which works on:
 *   - Desktop: Chrome, Firefox, Edge, Safari
 *   - Mobile:  Chrome Android, Safari iOS (14.3+), Firefox Android
 *
 * The native BarcodeDetector API only works on Chrome Android/ChromeOS,
 * so we use html5-qrcode for universal support.
 *
 * Flow:
 *   1. Dialog opens → starts camera scanning
 *   2. On barcode detected → calls onBarcodeDetected(rawValue)
 *   3. Parent handles product lookup + cart add
 *   4. Manual fallback input always available
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, X, Keyboard, Loader2, AlertTriangle } from 'lucide-react';
import type { Html5Qrcode as Html5QrcodeType } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

/* ── Constants ────────────────────────────────────────────────────────── */

const SCANNER_ELEMENT_ID = 'pos-barcode-scanner';
const SCAN_COOLDOWN_MS = 2000;

/* ── Component ────────────────────────────────────────────────────────── */

interface POSCameraScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBarcodeDetected: (barcode: string) => void;
  feedbackMessage?: string | null;
  feedbackType?: 'success' | 'error' | null;
}

export function POSCameraScanner({
  open,
  onOpenChange,
  onBarcodeDetected,
  feedbackMessage,
  feedbackType,
}: POSCameraScannerProps) {
  const scannerRef = useRef<Html5QrcodeType | null>(null);
  const lastDetectedRef = useRef<string>('');
  const cooldownRef = useRef<number>(0);

  const [mode, setMode] = useState<'camera' | 'manual'>('camera');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualBarcode, setManualBarcode] = useState('');
  const [scanning, setScanning] = useState(false);

  // Stable ref for the callback to avoid restarting the scanner
  const onBarcodeRef = useRef(onBarcodeDetected);
  onBarcodeRef.current = onBarcodeDetected;

  // ── Stop scanner ──
  const stopScanner = useCallback(async () => {
    try {
      if (scannerRef.current?.isScanning) {
        await scannerRef.current.stop();
      }
      scannerRef.current?.clear();
    } catch {
      // Ignore cleanup errors
    }
    scannerRef.current = null;
    setScanning(false);
  }, []);

  // ── Start scanner ──
  const startScanner = useCallback(async () => {
    setCameraError(null);
    setScanning(false);

    // Ensure the DOM element exists before creating the scanner
    await new Promise(resolve => setTimeout(resolve, 100));

    const container = document.getElementById(SCANNER_ELEMENT_ID);
    if (!container) {
      setCameraError('Scanner container not ready. Please try again.');
      return;
    }

    // Clean up any previous instance
    await stopScanner();

    try {
      // Lazy-load html5-qrcode — only downloaded when scanner dialog opens
      const { Html5Qrcode } = await import('html5-qrcode');
      const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID, { verbose: false });
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 280, height: 150 },
          aspectRatio: 16 / 9,
          disableFlip: false,
        },
        (decodedText) => {
          const now = Date.now();
          // Cooldown: prevent rapid duplicate detections
          if (decodedText === lastDetectedRef.current && now < cooldownRef.current) {
            return;
          }
          lastDetectedRef.current = decodedText;
          cooldownRef.current = now + SCAN_COOLDOWN_MS;
          onBarcodeRef.current(decodedText);
        },
        () => {
          // QR code not found in this frame — expected, ignore
        },
      );

      setScanning(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);

      // Check if running in an insecure context (HTTP instead of HTTPS)
      const isInsecure = window.isSecureContext === false
        || window.location.protocol === 'http:';

      if (isInsecure && (
        msg.includes('not supported') || msg.includes('getUserMedia') ||
        msg.includes('NotAllowedError') || msg.includes('undefined')
      )) {
        setCameraError(
          'Camera requires HTTPS. Access via https:// instead of http:// ' +
          '(accept the self-signed certificate warning on first visit).'
        );
      } else if (msg.includes('NotAllowedError') || msg.includes('Permission')) {
        setCameraError('Camera permission denied. Please allow camera access and try again.');
      } else if (msg.includes('NotFoundError') || msg.includes('no camera')) {
        setCameraError('No camera found on this device.');
      } else if (msg.includes('NotReadableError') || msg.includes('Could not start')) {
        setCameraError('Camera is already in use by another application.');
      } else if (msg.includes('not supported') || msg.includes('getUserMedia')) {
        setCameraError(
          'Camera streaming is not supported in this browser. ' +
          'Make sure you are using HTTPS (not HTTP).'
        );
      } else {
        setCameraError(`Camera error: ${msg}`);
      }
    }
  }, [stopScanner]);

  // ── Start/stop based on dialog open state + mode ──
  useEffect(() => {
    if (open && mode === 'camera') {
      startScanner();
    }

    return () => {
      stopScanner();
    };
  }, [open, mode, startScanner, stopScanner]);

  // ── Reset state when dialog closes ──
  useEffect(() => {
    if (!open) {
      setManualBarcode('');
      setCameraError(null);
      setMode('camera');
      lastDetectedRef.current = '';
      cooldownRef.current = 0;
    }
  }, [open]);

  // ── Manual submit ──
  const handleManualSubmit = () => {
    const trimmed = manualBarcode.trim();
    if (trimmed.length >= 3) {
      onBarcodeDetected(trimmed);
      setManualBarcode('');
    }
  };

  // ── Switch mode ──
  const handleSwitchMode = async () => {
    if (mode === 'camera') {
      await stopScanner();
      setMode('manual');
    } else {
      setCameraError(null);
      setMode('camera');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Camera className="size-4" />
            Scan Barcode
          </DialogTitle>
          <DialogDescription>
            {mode === 'camera'
              ? 'Point the camera at a product barcode.'
              : 'Enter the barcode manually below.'}
          </DialogDescription>
        </DialogHeader>

        {/* ── Camera view ── */}
        {mode === 'camera' && (
          <div className="mx-4 relative">
            {/* Scanner renders into this div */}
            <div
              id={SCANNER_ELEMENT_ID}
              className="rounded-lg overflow-hidden bg-black min-h-[220px]"
            />

            {/* Loading overlay */}
            {!scanning && !cameraError && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg">
                <div className="flex flex-col items-center gap-2 text-white">
                  <Loader2 className="size-8 animate-spin" />
                  <p className="text-sm">Starting camera...</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Camera error ── */}
        {cameraError && mode === 'camera' && (
          <div className="mx-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-start gap-2">
            <AlertTriangle className="size-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Camera unavailable</p>
              <p className="text-xs mt-0.5">{cameraError}</p>
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs mt-1 text-destructive underline"
                onClick={() => startScanner()}
              >
                Retry
              </Button>
            </div>
          </div>
        )}

        {/* ── Manual entry ── */}
        {mode === 'manual' && (
          <div className="px-4 space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder="Enter barcode..."
                value={manualBarcode}
                onChange={e => setManualBarcode(e.target.value)}
                className="flex-1"
                autoFocus
                onKeyDown={e => {
                  if (e.key === 'Enter') handleManualSubmit();
                }}
              />
              <Button
                onClick={handleManualSubmit}
                disabled={manualBarcode.trim().length < 3}
              >
                Search
              </Button>
            </div>
          </div>
        )}

        {/* ── Feedback message ── */}
        {feedbackMessage && (
          <div
            className={`mx-4 p-2.5 rounded-lg text-sm font-medium text-center ${
              feedbackType === 'success'
                ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400'
                : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400'
            }`}
          >
            {feedbackMessage}
          </div>
        )}

        {/* ── Bottom controls ── */}
        <div className="flex items-center justify-between p-4 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={handleSwitchMode}
          >
            {mode === 'camera' ? (
              <>
                <Keyboard className="size-3.5" />
                Manual Entry
              </>
            ) : (
              <>
                <Camera className="size-3.5" />
                Use Camera
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5"
            onClick={() => onOpenChange(false)}
          >
            <X className="size-3.5" />
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
