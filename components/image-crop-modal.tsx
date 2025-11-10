"use client"

import { useState, useCallback } from "react"
import Cropper from "react-easy-crop"
import type { Area, Point } from "react-easy-crop"
import "react-easy-crop/react-easy-crop.css"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { X, RotateCw, ZoomIn, ZoomOut, Check, Loader2 } from "lucide-react"

interface ImageCropModalProps {
  imageSrc: string
  onClose: () => void
  onCropComplete: (croppedImageBlob: Blob) => void
  aspectRatio?: number
  shape?: "rect" | "round"
}

export function ImageCropModal({
  imageSrc,
  onClose,
  onCropComplete,
  aspectRatio = 1,
  shape = "round"
}: ImageCropModalProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const onCropChange = useCallback((crop: Point) => {
    setCrop(crop)
  }, [])

  const onZoomChange = useCallback((zoom: number) => {
    setZoom(zoom)
  }, [])

  const onRotationChange = useCallback((rotation: number) => {
    setRotation(rotation)
  }, [])

  const onCropCompleteCallback = useCallback(
    (croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels)
    },
    []
  )

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image()
      image.addEventListener("load", () => resolve(image))
      image.addEventListener("error", (error) => reject(error))
      // Handle CORS
      image.crossOrigin = "anonymous"
      image.src = url
    })

  const getRadianAngle = (degreeValue: number) => {
    return (degreeValue * Math.PI) / 180
  }

  const rotateSize = (width: number, height: number, rotation: number) => {
    const rotRad = getRadianAngle(rotation)
    return {
      width:
        Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
      height:
        Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
    }
  }

  const getCroppedImg = async (
    imageSrc: string,
    pixelCrop: Area,
    rotation: number = 0,
    flip = { horizontal: false, vertical: false }
  ): Promise<Blob> => {
    const image = await createImage(imageSrc)
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")

    if (!ctx) {
      throw new Error("No 2d context")
    }

    const rotRad = getRadianAngle(rotation)

    // Calculate bounding box of the rotated image
    const { width: bBoxWidth, height: bBoxHeight } = rotateSize(
      image.width,
      image.height,
      rotation
    )

    // Set canvas size to match the bounding box
    canvas.width = bBoxWidth
    canvas.height = bBoxHeight

    // Translate canvas context to center to allow rotation and flipping
    ctx.translate(bBoxWidth / 2, bBoxHeight / 2)
    ctx.rotate(rotRad)
    ctx.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1)
    ctx.translate(-image.width / 2, -image.height / 2)

    // Draw rotated image
    ctx.drawImage(image, 0, 0)

    const data = ctx.getImageData(
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height
    )

    // Set canvas size to final crop size
    canvas.width = pixelCrop.width
    canvas.height = pixelCrop.height

    // Paste the cropped image onto the new canvas
    ctx.putImageData(data, 0, 0)

    // If round shape, create a circular mask
    if (shape === "round") {
      const roundCanvas = document.createElement("canvas")
      roundCanvas.width = pixelCrop.width
      roundCanvas.height = pixelCrop.height
      const roundCtx = roundCanvas.getContext("2d")

      if (!roundCtx) {
        throw new Error("No 2d context for round canvas")
      }

      // Draw circular clipping path
      roundCtx.beginPath()
      roundCtx.arc(
        pixelCrop.width / 2,
        pixelCrop.height / 2,
        Math.min(pixelCrop.width, pixelCrop.height) / 2,
        0,
        2 * Math.PI
      )
      roundCtx.clip()

      // Draw the cropped image
      roundCtx.drawImage(canvas, 0, 0)

      return new Promise((resolve, reject) => {
        roundCanvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob)
            } else {
              reject(new Error("Failed to create blob"))
            }
          },
          "image/png",
          1
        )
      })
    }

    // Return rectangular crop
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error("Failed to create blob"))
          }
        },
        "image/png",
        1
      )
    })
  }

  const handleCrop = async () => {
    if (!croppedAreaPixels) {
      return
    }

    setIsProcessing(true)
    try {
      const croppedImage = await getCroppedImg(
        imageSrc,
        croppedAreaPixels,
        rotation
      )
      onCropComplete(croppedImage)
      onClose()
    } catch (error) {
      console.error("Error cropping image:", error)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <Card className="w-full max-w-2xl border-zinc-800 bg-zinc-950">
        <CardHeader className="flex flex-row items-center justify-between border-b border-zinc-800">
          <CardTitle className="text-white">Crop & Adjust Image</CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-zinc-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </Button>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {/* Cropper */}
          <div className="relative w-full h-96 bg-zinc-900 rounded-lg overflow-hidden">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={aspectRatio}
              onCropChange={onCropChange}
              onZoomChange={onZoomChange}
              onRotationChange={onRotationChange}
              onCropComplete={onCropCompleteCallback}
              cropShape={shape}
              showGrid={true}
              style={{
                containerStyle: {
                  width: "100%",
                  height: "100%",
                  position: "relative",
                },
              }}
            />
          </div>

          {/* Controls */}
          <div className="space-y-4">
            {/* Zoom Control */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-zinc-300">
                  <ZoomIn className="h-4 w-4" />
                  <span>Zoom</span>
                </div>
                <span className="text-zinc-400">{Math.round(zoom * 100)}%</span>
              </div>
              <Slider
                value={[zoom]}
                onValueChange={(value) => setZoom(value[0])}
                min={1}
                max={3}
                step={0.1}
                className="w-full"
              />
            </div>

            {/* Rotation Control */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-zinc-300">
                  <RotateCw className="h-4 w-4" />
                  <span>Rotation</span>
                </div>
                <span className="text-zinc-400">{rotation}°</span>
              </div>
              <Slider
                value={[rotation]}
                onValueChange={(value) => setRotation(value[0])}
                min={0}
                max={360}
                step={1}
                className="w-full"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 border-zinc-700 text-zinc-200 hover:bg-zinc-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCrop}
              disabled={isProcessing || !croppedAreaPixels}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Apply Crop
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

