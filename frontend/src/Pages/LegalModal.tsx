import React from 'react';

type ModalType = 'terms' | 'privacy' | 'paid' | null;

interface LegalModalProps {
  type: ModalType;
  onClose: () => void;
}

const LegalModal: React.FC<LegalModalProps> = ({ type, onClose}) => {
  if (!type) return null;

  const isTerms = type === 'terms';
  const isPrivacy = type === 'privacy';
  const isPaid = type === 'paid';

  let title = '';
  let subtitle = '';

  if (isTerms) {
    title = 'Terms of Service';
    subtitle = 'Welcome to Rigzer';
  } else if (isPrivacy) {
    title = 'Privacy Policy';
    subtitle = 'Our Approach to Your Privacy';
  } else if (isPaid) {
    title = 'Paid Services Policy';
    subtitle = 'Understanding Cloud Stream Services';
  }

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
              {title}
            </h2>
            <p className="text-sm text-white/80 mt-1">
              {subtitle}
            </p>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
            
            {isTerms && (
              // --- TERMS OF SERVICE CONTENT ---
              <>
                <section>
                  <p className="text-sm leading-relaxed text-gray-800">
                    These Terms of Service ("Terms") form part of the User Agreement, which is a binding contract between you and Rigzer and our affiliates. They explain how you may use our services, including the website, mobile applications, features, notifications, and any other tools we offer now or in the future. We refer to all of these together as the "Services."
                  </p>
                  <p className="text-sm leading-relaxed text-gray-800 mt-2">
                    By accessing or using Rigzer, or by creating an account, you agree to follow these Terms. If you do not agree with these Terms, we kindly ask that you do not use the platform.
                  </p>
                  <p className="text-sm leading-relaxed text-gray-800 mt-2">
                    We refer to anything you post, share, upload, or create on Rigzer — such as text, photos, videos, links, 3D models, or other materials — as your "Content." These Terms are written in clear language so that you can easily understand the rules and your responsibilities. They are designed to help keep Rigzer a safe and respectful place for everyone.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-bold mb-2">Who May Use Rigzer</h3>
                  <p className="text-sm leading-relaxed text-gray-800">
                    You may use Rigzer only if you are able to form a binding legal contract with us and are not prevented from doing so under the laws of your country. In any case, you must be at least 13 years old to use the Services.
                  </p>
                  <p className="text-sm leading-relaxed text-gray-800 mt-2">
                    If you are under the age of majority in your country and a parent or guardian is creating or managing an account for you, that person must have the legal right to accept these Terms on your behalf. By using Rigzer or creating an account, you confirm that you meet these eligibility requirements. The words "you" and "your" refer to the person or entity using the Services.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-bold mb-2">Privacy</h3>
                  <p className="text-sm leading-relaxed text-gray-800">
                    Our Privacy Policy explains how we collect, use, store, and protect your personal information when you use Rigzer. By using the platform, you consent to the collection and use of your information as described in the Privacy Policy. This may include transferring your data to other countries for storage and processing by us and our service providers.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-bold mb-2">Your Account</h3>
                  <p className="text-sm leading-relaxed text-gray-800">
                    You may need to create an account to access most features of Rigzer. You are responsible for keeping your account secure. This means using a strong password, enabling two-factor authentication where available, and not sharing your login information with others. We cannot and will not be responsible for any loss or damage that occurs because you did not keep your account safe.
                  </p>
                  <p className="text-sm leading-relaxed text-gray-800 mt-2">
                    You may control most communications from Rigzer. However, we may still need to send you service announcements and important administrative messages. These are considered part of the Services, and you may not be able to opt out of receiving them. If you add a phone number to your account, please keep that information updated.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-bold mb-2">Your License to Use the Services</h3>
                  <p className="text-sm leading-relaxed text-gray-800">
                    We grant you a personal, worldwide, royalty-free, non-transferable, and non-exclusive license to use the software and features that form part of Rigzer. This license is for your personal use only. You may not sell, share, transfer, or assign this license to anyone else.
                  </p>
                  <p className="text-sm leading-relaxed text-gray-800 mt-2">
                    The Services, including their design, logos, and underlying technology, are protected by copyright, trademark, and other laws. You do not have any right to use our name, logos, or brand features without our express written permission. All rights in the Services, other than the Content provided by users, remain with us and our partners.
                  </p>
                  <p className="text-sm leading-relaxed text-gray-800 mt-2">
                    Any feedback, comments, or suggestions you provide about Rigzer are entirely voluntary, and we may use them freely to improve the platform.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-bold mb-2">Your Content</h3>
                  <p className="text-sm leading-relaxed text-gray-800">
                    You own the Content you create and post on Rigzer. This includes your 3D posts, game demos, code in Pockets, text, images, videos, and any other material you share.
                  </p>
                  <p className="text-sm leading-relaxed text-gray-800 mt-2">
                    By posting or creating Content on Rigzer, you grant us a worldwide, royalty-free license to show, host, distribute, and promote that Content as needed to operate the Services. This allows us to make your 3D models viewable, run your game demos through cloud gaming, display your Pockets, and enable others to interact with them.
                  </p>
                  <p className="text-sm leading-relaxed text-gray-800 mt-2">
                    You are fully responsible for everything you post or create. Your Content must follow these Terms, our Community Rules, and all applicable laws. You should only post or create Content that you are comfortable sharing with others, and you must have the necessary rights to share anything you post.
                  </p>
                  <p className="text-sm leading-relaxed text-gray-800 mt-2">
                    We especially welcome creative interactive content such as 3D posts for artists, game developers, architects, and product showcases, personal coding spaces in Pockets, and game demos played through our cloud gaming service. That said, we strongly discourage and will remove content that includes nudity, pornography, or any straight-up triggering or inappropriate material. We will also remove shady or harmful groups and any content that clearly falls outside our vision.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-bold mb-2">Misuse of the Services</h3>
                  <p className="text-sm leading-relaxed text-gray-800">
                    You agree not to misuse Rigzer. This includes interfering with the normal operation of the platform, accessing it through any method other than the official interfaces we provide, or attempting to reverse engineer, hack, jailbreak, or bypass any technical protections or safety features.
                  </p>
                  <p className="text-sm leading-relaxed text-gray-800 mt-2">
                    You must not access areas you are not authorised to reach, probe or test the security of our systems, scrape or collect data automatically without permission, send spam or viruses, overload the service, impersonate others, or engage in any activity that disrupts Rigzer or creates an unfair burden on it. You also must not help others do any of these things.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-bold mb-2">Moderation and Enforcement</h3>
                  <p className="text-sm leading-relaxed text-gray-800">
                    We reserve the right to review, monitor, and remove any Content that violates these Terms or our Community Rules. We may also suspend or limit access to features, or terminate accounts, when necessary to protect the platform and its users.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-bold mb-2">Disclaimers and Limitations</h3>
                  <p className="text-sm leading-relaxed text-gray-800">
                    Rigzer is provided "as is" and "as available." We do not guarantee that the Services will always be uninterrupted, error-free, or completely secure. Your use of the platform is at your own risk. To the fullest extent permitted by law, Rigzer and our affiliates will not be liable for any indirect, incidental, or consequential damages arising from your use of the Services.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-bold mb-2">Changes to These Terms</h3>
                  <p className="text-sm leading-relaxed text-gray-800">
                    We may update these Terms from time to time. If we make significant changes, we will notify you through the platform or by email. Your continued use of Rigzer after the changes take effect means you accept the updated Terms. If you do not agree with the changes, you should stop using the platform.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-bold mb-2">Ending These Terms</h3>
                  <p className="text-sm leading-relaxed text-gray-800">
                    You may end your agreement with us at any time by deactivating your account and discontinuing your use of Rigzer.
                  </p>
                  <p className="text-sm leading-relaxed text-gray-800 mt-2">
                    We may suspend or terminate your account or stop providing part or all of the Services if we reasonably believe you have violated these Terms, created legal risk for us, or if your account has been inactive for a long time. Even after termination, certain provisions of these Terms will continue to apply, including those related to ownership, licenses, disclaimers, and limitations of liability.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-bold mb-2">Governing Law and Contact</h3>
                  <p className="text-sm leading-relaxed text-gray-800">
                    These Terms are governed by the laws of India. Any disputes will be resolved in the courts of India.
                  </p>
                </section>
              </>
            )}

            {isPrivacy && (
              // --- PRIVACY POLICY CONTENT ---
              <>
                <section>
                  <p className="text-sm leading-relaxed text-gray-800">
                    We built Rigzer as a creative platform where people share 3D posts, play game demos through cloud gaming, build coding spaces in Pockets, and connect with other creators. We want you to feel in control of your information while enjoying these features. This policy explains in clear language what data we collect, why we collect it, how we use it, and what choices you have. We only gather information that is genuinely needed to run the platform safely and make your experience better.
                  </p>
                </section>
                
                <section>
                  <h3 className="text-lg font-bold mb-2">Creating an Account</h3>
                  <p className="text-sm leading-relaxed text-gray-800">
                    You need to create an account to access most of Rigzer's features and services. Without an account you cannot post 3D content, maintain Pockets, upload or play game demos, or fully interact with the community. During signup we collect basic details such as a username, email address, and password so you can sign in securely and manage your activity. You are free to use any username or pseudonym you like instead of your real name.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-bold mb-2">The Information We Gather</h3>
                  <p className="text-sm leading-relaxed text-gray-800 mb-2">
                    We collect several types of information to make Rigzer work properly:
                  </p>
                  <ul className="text-sm leading-relaxed list-disc list-inside space-y-1.5 text-gray-800">
                    <li><span className="font-semibold">Content you create and share:</span> This includes your 3D models, game demos, code and projects inside Pockets, text, images, videos, and comments.</li>
                    <li><span className="font-semibold">Usage information:</span> Data on which features you use most, time spent playing games, etc.</li>
                    <li><span className="font-semibold">Device information:</span> Type of device, operating system, browser, screen size.</li>
                    <li><span className="font-semibold">Log information:</span> Login times, session durations, error reports, and technical logs.</li>
                    <li><span className="font-semibold">Approximate location:</span> Based on your IP address to deliver better performance for cloud gaming.</li>
                    <li><span className="font-semibold">Preferences:</span> Notification settings, content visibility choices, etc.</li>
                    <li><span className="font-semibold">Billing information:</span> If we introduce paid products, details for transactions and subscriptions.</li>
                    <li><span className="font-semibold">Third-party sign-in:</span> Basic profile information if using Google, Apple, etc.</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-bold mb-2">Cookies and Similar Technologies</h3>
                  <p className="text-sm leading-relaxed text-gray-800">
                    We use cookies and similar tracking technologies to make Rigzer function smoothly. Cookies help us remember that you are logged in, save your preferences for 3D viewer settings or Pocket layouts, keep track of your progress in game demos, and understand how people use different features. You can manage or disable cookies through your browser settings.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-bold mb-2">Advertisements</h3>
                  <p className="text-sm leading-relaxed text-gray-800">
                    If we display advertisements on Rigzer in the future, we may use some of the information we collect (such as usage patterns and preferences) to show ads that are more relevant to your interests as a creator or player. We do not use sensitive personal information for advertising purposes.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-bold mb-2">How We Use Your Information</h3>
                  <p className="text-sm leading-relaxed text-gray-800">
                    We use your information primarily to operate and improve Rigzer. Account details let you log in and manage your profile and content. Usage, device, and log information helps us keep the platform secure, fix technical issues with 3D loading or cloud gaming, and make features more reliable.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-bold mb-2">Sharing What You Share</h3>
                  <p className="text-sm leading-relaxed text-gray-800">
                    Most of the content you post on Rigzer is public by design. We may share limited information with trusted service providers who help run parts of the platform, such as cloud hosting for game demos. We do not sell your personal information to third parties.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-bold mb-2">Your Control Over Your Data</h3>
                  <p className="text-sm leading-relaxed text-gray-800">
                    You can edit or delete most of your profile information, content, and preferences at any time through your account settings. You can delete your entire account at any time. After deletion we remove or securely delete your personal information from our active systems within a reasonable period.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-bold mb-2">Keeping Data Safe and How Long We Keep It</h3>
                  <p className="text-sm leading-relaxed text-gray-800">
                    We use reasonable technical and organisational measures to protect your information against unauthorised access, loss, or misuse. We keep your information only as long as it is needed to provide the services, meet legal obligations, resolve disputes, or enforce our agreements.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-bold mb-2">Privacy for Younger Users</h3>
                  <p className="text-sm leading-relaxed text-gray-800">
                    Rigzer is intended for users aged 13 and above. We do not knowingly collect personal information from children under 13.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-bold mb-2">Updates to This Policy</h3>
                  <p className="text-sm leading-relaxed text-gray-800">
                    We may update this Privacy Policy from time to time as Rigzer grows and we add new features. When we make significant changes we will notify you through the platform or by email.
                  </p>
                </section>
              </>
            )}

            {isPaid && (
              // --- PAID SERVICES POLICY CONTENT ---
              <>
                <section>
                  <p className="text-sm leading-relaxed text-gray-800">
                    This Paid Services Policy (the "Policy") governs your purchase and use of Cloud Stream services offered by Rigzer ("we," "us," or "the Company") through our social interactive media platform. This Policy supplements our main Terms of Service. By purchasing or using Cloud Stream, you agree to this Policy and the Terms of Service. In case of any conflict, this Policy controls for all paid Cloud Stream matters.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-bold mb-2">1. DESCRIPTION OF CLOUD STREAM SERVICES</h3>
                  <p className="text-sm leading-relaxed text-gray-800 mb-2">
                    Cloud Stream is a paid service that allows game developers (indie or studio), software companies, and individuals to market upcoming games, software demos, or playtest builds to our platform's community.
                  </p>
                  <ul className="text-sm leading-relaxed list-disc list-inside space-y-1.5 text-gray-800">
                    <li><span className="font-semibold">What you get:</span> A purchased quantity of "Streams" (cloud-powered views, impressions, or access instances) delivered via our cloud distribution system.</li>
                    <li><span className="font-semibold">Intended use:</span> Promoting game releases, public or closed demos, playtests, or software betas.</li>
                    <li><span className="font-semibold">Minimum purchase:</span> $100 USD (lowest tier). For the $100 tier you currently receive approximately 400 streams (around 4,000 minutes of total streaming time) plus an estimated 2,000–3,000 views. Note: Exact stream counts, view estimates, and pricing are subject to change. Current details are always shown on the purchase page at the time of buying.</li>
                    <li><span className="font-semibold">Delivery timeline:</span> For the $100 base tier, we aim to complete delivery of all purchased streams within 7 days (one week) from the date your campaign is activated. Larger purchases will be delivered on a proportional timeline.</li>
                    <li><span className="font-semibold">Performance:</span> We will make commercially reasonable efforts to deliver the number of streams you purchase. Stream numbers may fluctuate by a small margin due to technical and distribution factors.</li>
                  </ul>
                  <p className="text-sm leading-relaxed text-gray-800 mt-2">
                    We may modify, add, or discontinue Cloud Stream features at any time with reasonable prior notice.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-bold mb-2">2. ELIGIBILITY</h3>
                  <p className="text-sm leading-relaxed text-gray-800">
                    You must be at least 18 years old. The service is open to individual game developers, indie studios, established studios, software companies, and other creators. You must maintain an active account in good standing. No formal business verification is required.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-bold mb-2">3. PRICING AND PAYMENT</h3>
                  <p className="text-sm leading-relaxed text-gray-800">
                    Prices are shown in the transactional currency displayed during the checkout process. All purchases are exclusive of applicable taxes, which will be added at checkout. Payment is due in full at the time of purchase. Accepted payment methods are shown during checkout. We may offer volume discounts or updated pricing for higher tiers. Prices and package contents are subject to change.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-bold mb-2">4. DELIVERY AND USAGE NOTIFICATIONS</h3>
                  <p className="text-sm leading-relaxed text-gray-800">
                    Delivery begins once payment is confirmed and your campaign materials are approved. You will receive in-app and/or email notifications when 75% of your purchased streams have been used. We recommend purchasing additional streams in advance when you receive the 75% notification to prevent any interruption to your campaign. Streams are consumed as they are delivered. There is no automatic rollover of unused streams unless explicitly stated for your specific package.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-bold mb-2">5. REFUNDS AND CANCELLATIONS</h3>
                  <p className="text-sm leading-relaxed text-gray-800">
                    All Cloud Stream purchases are non-refundable, with one limited exception: If we are unable to deliver the full number of streams you purchased (despite our commercially reasonable efforts), you may request a pro-rated refund for the undelivered portion.
                  </p>
                  <p className="text-sm leading-relaxed text-gray-800 mt-2">
                    Determination of inability to deliver will be based on overall platform view counts and delivery metrics. If the campaign underperforms due to low user interest in your content (e.g., few people choose to try your game, build, or software), this will not qualify as our failure to deliver, and no refund will be issued. Requests must be submitted within 30 days of the expected delivery completion date.
                  </p>
                  <p className="text-sm leading-relaxed text-gray-800 mt-2">
                    No refunds will be issued for: any partial use of streams; campaigns you pause, cancel, or that underperform due to your content, targeting, or external factors; change of mind, project delays, or failure to achieve your marketing objectives.
                  </p>
                  <p className="text-sm leading-relaxed text-gray-800 mt-2">
                    Approved refunds will be processed back to the original payment method within 10–14 business days. Any chargeback or payment dispute filed without first contacting us may result in immediate suspension of your account and permanent ineligibility for future Cloud Stream purchases.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-bold mb-2">6. CAMPAIGN APPROVAL AND CONTENT REQUIREMENTS</h3>
                  <p className="text-sm leading-relaxed text-gray-800">
                    All demos, builds, and marketing materials must fully comply with our Community Guidelines and Terms of Service. We reserve the right to review, reject, or pause any campaign that violates platform rules, contains harmful content, or creates risk for users. You remain solely responsible for the legality, safety, and technical functionality of the games or software you distribute.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-bold mb-2">7. INTELLECTUAL PROPERTY AND LICENSES</h3>
                  <p className="text-sm leading-relaxed text-gray-800">
                    You grant us a limited, non-exclusive, royalty-free license to host, stream, and distribute your content solely to fulfill the Cloud Stream service. All platform technology, branding, and systems remain our exclusive property. Cloud Stream credits and access are non-transferable and may not be resold or shared with third parties.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-bold mb-2">8. TERMINATION AND SUSPENSION</h3>
                  <p className="text-sm leading-relaxed text-gray-800">
                    We may suspend or terminate your Cloud Stream access (with no refund) if you breach this Policy, the Terms of Service, or engage in abusive or fraudulent activity. You may stop purchasing future streams at any time, but any in-progress or completed campaigns are non-refundable. Unused streams are forfeited upon termination or account closure.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-bold mb-2">9. DISCLAIMERS AND LIMITATION OF LIABILITY</h3>
                  <p className="text-sm leading-relaxed text-gray-800">
                    Cloud Stream is provided "AS IS" without any warranties. We do not guarantee specific engagement rates, downloads, conversions, or commercial success for your campaigns. Our maximum liability to you for any claim related to Cloud Stream is limited to the amount you actually paid for the specific package in question. We are not liable for indirect, consequential, or punitive damages.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-bold mb-2">10. CHANGES TO THIS POLICY</h3>
                  <p className="text-sm leading-relaxed text-gray-800">
                    We may update this Policy. Material changes will be communicated via email or platform notification. Your continued use of Cloud Stream after the change takes effect means you accept the updated Policy.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-bold mb-2">11. GOVERNING LAW</h3>
                  <p className="text-sm leading-relaxed text-gray-800">
                    This Policy is governed by the laws of India. Any disputes will first be addressed through good-faith negotiation. Remaining disputes shall be resolved through binding arbitration or the courts located in Jaipur, India.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-bold mb-2">12. CONTACT US</h3>
             <p className="text-sm leading-relaxed text-gray-800">
              For support, billing questions, or refund requests, just use our feedback form! It doubles as our support desk, and we'll get right back to you.<br />
              We encourage lazy writing—just write to us.
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
          </div>
        </div>
      </div>
    </>
  );
};

export default LegalModal;