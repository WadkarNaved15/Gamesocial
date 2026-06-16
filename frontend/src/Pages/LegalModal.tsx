import React from 'react';

type ModalType = 'terms' | 'privacy' | null;

interface LegalModalProps {
  type: ModalType;
  onClose: () => void;
  onAgree: () => void;
}

const LegalModal: React.FC<LegalModalProps> = ({ type, onClose, onAgree }) => {
  if (!type) return null;

  const isTerms = type === 'terms';

  return (
    <>
      {/* Modal Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Content Wrapper */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        {/* Modal Box: 75% width/height, white bg, black text */}
        <div className="w-[75vw] h-[75vh] bg-white text-black rounded-2xl shadow-2xl overflow-hidden flex flex-col pointer-events-auto">
          
          {/* Header */}
          <div 
            className="px-6 py-4 flex-shrink-0"
            style={{ background: 'linear-gradient(to bottom right, #3D7A6E, #000000)' }}
          >
            <h2 className="text-2xl font-bold text-white">
              {isTerms ? 'Terms of Service' : 'Privacy Policy'}
            </h2>
            <p className="text-sm text-white/80 mt-1">
              {isTerms ? 'Please read carefully before proceeding' : 'How we handle your data'}
            </p>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
            {isTerms ? (
              // --- TERMS OF SERVICE CONTENT ---
              <>
                <section>
                  <h3 className="text-lg font-bold mb-2">1. Acceptance of Terms</h3>
                  <p className="text-sm leading-relaxed text-gray-800">
                    By accessing and using Rigzer, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
                  </p>
                </section>
                <section>
                  <h3 className="text-lg font-bold mb-2">2. Use License</h3>
                  <p className="text-sm leading-relaxed text-gray-800 mb-2">
                    Permission is granted to temporarily download one copy of the materials (information or software) on Rigzer for personal, non-commercial transitory viewing only. Under this license you may not:
                  </p>
                  <ul className="text-sm leading-relaxed list-disc list-inside space-y-1.5 text-gray-800">
                    <li>Modify or copy the materials</li>
                    <li>Use materials for commercial purposes</li>
                    <li>Attempt to decompile or reverse engineer software</li>
                    <li>Transmit illicit content</li>
                    <li>Remove copyright or proprietary notations</li>
                  </ul>
                </section>
                <section>
                  <h3 className="text-lg font-bold mb-2">3. User Accounts</h3>
                  <p className="text-sm leading-relaxed text-gray-800">
                    You are responsible for maintaining the confidentiality of your account and password and for restricting access to your computer. You agree to accept responsibility for all activities that occur under your account.
                  </p>
                </section>
                <section>
                  <h3 className="text-lg font-bold mb-2">4. Disclaimer</h3>
                  <p className="text-sm leading-relaxed text-gray-800">
                    The materials on Rigzer are provided "as is". Rigzer makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including implied warranties of merchantability or fitness for a particular purpose.
                  </p>
                </section>
                <section>
                  <h3 className="text-lg font-bold mb-2">5. Limitations of Liability</h3>
                  <p className="text-sm leading-relaxed text-gray-800">
                    In no event shall Rigzer or its suppliers be liable for any damages (including loss of data or profit) arising out of the use or inability to use the materials on Rigzer.
                  </p>
                </section>
                <section>
                  <h3 className="text-lg font-bold mb-2">6. Modifications</h3>
                  <p className="text-sm leading-relaxed text-gray-800">
                    Rigzer may revise these terms of service for its website at any time without notice. By using this website, you are agreeing to be bound by the then current version of these terms of service.
                  </p>
                </section>
              </>
            ) : (
              // --- PRIVACY POLICY CONTENT ---
              <>
                <section>
                  <h3 className="text-lg font-bold mb-2">1. Introduction</h3>
                  <p className="text-sm leading-relaxed text-gray-800">
                    Rigzer ("we" or "us" or "our") respects the privacy of our users. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Service.
                  </p>
                </section>
                <section>
                  <h3 className="text-lg font-bold mb-2">2. Information We Collect</h3>
                  <p className="text-sm leading-relaxed text-gray-800 mb-2">
                    We collect information you provide directly such as:
                  </p>
                  <ul className="text-sm leading-relaxed list-disc list-inside space-y-1.5 text-gray-800">
                    <li><span className="font-semibold">Account Information:</span> Name, email, username, password</li>
                    <li><span className="font-semibold">Usage Data:</span> Browser type, IP address, pages visited, time spent</li>
                    <li><span className="font-semibold">Cookies:</span> We use cookies for tracking and preferences</li>
                  </ul>
                </section>
                <section>
                  <h3 className="text-lg font-bold mb-2">3. How We Use Your Information</h3>
                  <p className="text-sm leading-relaxed text-gray-800 mb-2">
                    We use collected data for various purposes:
                  </p>
                  <ul className="text-sm leading-relaxed list-disc list-inside space-y-1.5 text-gray-800">
                    <li>Provide and maintain our Service</li>
                    <li>Notify you about changes to our Service</li>
                    <li>Allow participation in interactive features</li>
                    <li>Provide customer support</li>
                    <li>Gather analysis to improve our Service</li>
                    <li>Monitor usage and detect fraud</li>
                  </ul>
                </section>
                <section>
                  <h3 className="text-lg font-bold mb-2">4. Cookies and Tracking Technologies</h3>
                  <p className="text-sm leading-relaxed text-gray-800">
                    We use cookies and similar tracking technologies to track activity on our Service. You can instruct your browser to refuse all cookies or to alert you when cookies are being sent. However, if you do not accept cookies, you may not be able to use some portions of our Service.
                  </p>
                </section>
                <section>
                  <h3 className="text-lg font-bold mb-2">5. Security of Your Data</h3>
                  <p className="text-sm leading-relaxed text-gray-800">
                    The security of your data is important to us. However, no method of transmission over the Internet is 100% secure. We strive to use commercially acceptable means to protect your personal information, but we cannot guarantee absolute security.
                  </p>
                </section>
                <section>
                  <h3 className="text-lg font-bold mb-2">6. Data Retention</h3>
                  <p className="text-sm leading-relaxed text-gray-800">
                    We retain your personal information for as long as necessary to provide our Service and fulfill the purposes outlined in this Privacy Policy. You can request deletion of your data at any time.
                  </p>
                </section>
                <section>
                  <h3 className="text-lg font-bold mb-2">7. Your Rights</h3>
                  <p className="text-sm leading-relaxed text-gray-800">
                    You have the right to access, correct, or delete your personal information. You can contact us at support@rigzer.com to exercise these rights.
                  </p>
                </section>
                <section>
                  <h3 className="text-lg font-bold mb-2">8. Contact Us</h3>
                  <p className="text-sm leading-relaxed text-gray-800">
                    If you have any questions about this Privacy Policy or our privacy practices, please contact us at support@rigzer.com or visit our website.
                  </p>
                </section>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 bg-gray-50 flex-shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg bg-gray-200 text-black hover:bg-gray-300 transition-colors font-medium text-sm"
            >
              Close
            </button>
            <button
              onClick={onAgree}
              className="px-4 py-2.5 rounded-lg bg-black text-white hover:bg-gray-800 transition-all font-medium text-sm shadow-md"
            >
              I Agree
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default LegalModal;