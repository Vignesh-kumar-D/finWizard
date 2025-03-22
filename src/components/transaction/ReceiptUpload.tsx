import React, { useState } from 'react';
import Image from 'next/image';
import { Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FormLabel } from '@/components/ui/form';

export function ReceiptUpload({
  receiptImage,
  setReceiptImage,
}: {
  receiptImage: File | null;
  setReceiptImage: (file: File | null) => void;
}) {
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
          {receiptImage ? 'Change Image' : 'Upload Image'}
        </Button>
        {receiptImage && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setReceiptImage(null);
              setImagePreview(null);
            }}
          >
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

      {imagePreview && (
        <div className="mt-2 relative h-48 w-auto max-w-full">
          <Image
            src={imagePreview}
            alt="Receipt preview"
            fill
            style={{ objectFit: 'contain' }}
            className="rounded-md border"
            unoptimized // This is important for data URLs
          />
        </div>
      )}
    </div>
  );
}
