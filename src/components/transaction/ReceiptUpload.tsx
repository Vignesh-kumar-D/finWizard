// components/transaction/ReceiptUpload.tsx
import React, { useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FormLabel } from '@/components/ui/form';
import Image from 'next/image';

interface ReceiptUploadProps {
  receiptImage: File | null;
  setReceiptImage: (file: File | null) => void;
  existingImageUrl?: string | null;
  onRemove?: () => void;
}

export function ReceiptUpload({
  receiptImage,
  setReceiptImage,
  existingImageUrl,
  onRemove,
}: ReceiptUploadProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setReceiptImage(file);

      // Create preview URL
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemove = () => {
    setReceiptImage(null);
    setImagePreview(null);
    if (onRemove) {
      onRemove();
    }
  };

  const hasImage = receiptImage || existingImageUrl;

  return (
    <div className="space-y-2">
      <FormLabel>Receipt Image (Optional)</FormLabel>
      <div className="flex items-center gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => document.getElementById('receipt-upload')?.click()}
        >
          <ImageIcon className="h-4 w-4 mr-2" />
          {hasImage ? 'Change Image' : 'Upload Image'}
        </Button>
        {hasImage && (
          <Button type="button" variant="ghost" onClick={handleRemove}>
            Remove
          </Button>
        )}
        <input
          id="receipt-upload"
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {imagePreview ? (
        <div className="mt-2 relative h-48">
          <Image
            src={imagePreview}
            alt="Receipt preview"
            className="rounded-md border"
            fill
            style={{ objectFit: 'contain' }}
            unoptimized // This is important for data URLs
          />
        </div>
      ) : existingImageUrl ? (
        <div className="mt-2 relative h-48">
          <Image
            src={existingImageUrl}
            alt="Receipt"
            fill
            style={{ objectFit: 'contain' }}
            className=" rounded-md border"
            unoptimized // This is important for data URLs
          />
        </div>
      ) : null}
    </div>
  );
}
