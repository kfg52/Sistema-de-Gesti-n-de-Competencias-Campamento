import { useEffect, useId, useRef } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { cn } from '@/lib/utils'

interface QRScannerProps {
  active: boolean
  onDecode: (text: string) => void
  onError: (message: string) => void
}

/**
 * Escáner QR por cámara (html5-qrcode) con alternativa de carga de imagen.
 * Cuando la cámara no está activa (permiso denegado, dispositivo sin cámara,
 * o el operador la detuvo) se ofrece subir una foto del código.
 */
export function QRScanner({ active, onDecode, onError }: QRScannerProps) {
  const elementId = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const stop = async () => {
    const scanner = scannerRef.current
    scannerRef.current = null
    if (!scanner) return
    try {
      await scanner.stop()
    } catch {
      /* ya estaba detenido */
    }
    try {
      scanner.clear()
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    let cancelled = false

    const start = async () => {
      await stop()
      try {
        const scanner = new Html5Qrcode(elementId)
        scannerRef.current = scanner
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (text) => {
            if (!cancelled && text) onDecode(text)
          },
          undefined,
        )
      } catch (err) {
        if (cancelled) return
        scannerRef.current = null
        const message = (err as Error)?.message ?? ''
        const lower = message.toLowerCase()
        if (lower.includes('permission') || lower.includes('denied') || lower.includes('notallowed')) {
          onError('Permiso de cámara denegado. Habilitalo en tu navegador o carga una foto del QR.')
        } else if (
          lower.includes('notfound') ||
          lower.includes('nocamera') ||
          lower.includes('no camera') ||
          lower.includes('camera not') ||
          lower.includes('device')
        ) {
          onError('No se detectó una cámara. Carga una foto del QR o usa la búsqueda manual.')
        } else {
          onError('No se pudo iniciar la cámara. Carga una foto del QR o usa la búsqueda manual.')
        }
      }
    }

    if (active) void start()

    return () => {
      cancelled = true
      void stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    try {
      const scanner = new Html5Qrcode(elementId)
      const text = await scanner.scanFile(file, false)
      if (text) onDecode(text)
    } catch {
      onError('No se pudo leer un código QR de esa imagen. Prueba con otra foto.')
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="flex flex-col gap-space-sm">
      <div
        id={elementId}
        className={cn(
          'w-full aspect-video rounded-xl overflow-hidden bg-black',
          !active && 'hidden',
        )}
      />
      {!active ? (
        <>
          <label className="flex items-center justify-center gap-2 h-11 rounded-lg border border-outline-variant/40 bg-surface-container-low text-on-surface font-label-md text-label-md font-bold active:scale-[0.99] transition-transform cursor-pointer">
            <span className="material-symbols-outlined text-[20px]">photo_library</span>
            Cargar foto del QR
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => void handleFile(e.target.files?.[0])}
            />
          </label>
          <p className="font-body-sm text-[12px] text-on-surface-variant text-center">
            Enfoca el código QR del carnet dentro del recuadro de la cámara.
          </p>
        </>
      ) : null}
    </div>
  )
}