import React from 'react';
import { X } from 'lucide-react';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectNewImage: () => void;
  onRemoveImage: () => void;
}

export const EditProfileModal = React.memo(
  ({ isOpen, onClose, onSelectNewImage, onRemoveImage }: EditProfileModalProps) => {
    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold">Edit Profile Picture</h3>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 transition-colors">
              <X size={24} />
            </button>
          </div>

          <div className="space-y-4">
            <ModalButton
              onClick={onSelectNewImage}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              label="Select New Image"
            />
            <ModalButton
              onClick={onRemoveImage}
              className="bg-red-600 hover:bg-red-700 text-white"
              label="Remove Current Image"
            />
            <ModalButton
              onClick={onClose}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800"
              label="Cancel"
            />
          </div>
        </div>
      </div>
    );
  }
);

const ModalButton = ({
  onClick,
  className,
  label,
}: {
  onClick: () => void;
  className: string;
  label: string;
}) => (
  <button
    onClick={onClick}
    className={`w-full py-2 px-4 rounded-lg transition-colors ${className}`}
  >
    {label}
  </button>
);
