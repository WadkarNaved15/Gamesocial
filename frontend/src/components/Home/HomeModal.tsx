import React from 'react';
import backgroundImage from '../../assets/bg.png';

interface HomeModalProps {
  onClose: () => void;
}

const HomeModal: React.FC<HomeModalProps> = ({ onClose }) => {
  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-title"
    >
      <div className="bg-black shadow-lg w-full max-w-xl h-[350px] relative rounded-lg overflow-hidden">
        <div
          className="w-full h-full"
          style={{
            backgroundImage: `url(${backgroundImage})`,
            backgroundSize: 'contain',
            backgroundPosition: 'top',
            backgroundRepeat: 'no-repeat',
          }}
        >
          <div className="p-4">
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-2 right-2 text-white text-2xl hover:text-gray-300 transition"
              aria-label="Close welcome modal"
            >
              ✕
            </button>

            {/* Modal Content */}
            <h2
              id="welcome-title"
              className="text-3xl text-white font-semibold leading-tight tracking-wide"
            >
              WELCOME <br />
              TO <br />
              OUR <br />
              <br />
              FAMILY <br />
              SON
            </h2>

            {/* Future buttons or CTA can go here */}
            {/* <div className="mt-4">
              <button className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition">
                Log In
              </button>
            </div> */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomeModal;
