import React from 'react';

type ModalType = 'terms' | 'privacy' | 'paid' | null;

interface LegalModalProps {
  type: ModalType;
  onClose: () => void;
}

const LegalModal: React.FC<LegalModalProps> = ({ type, onClose }) => {
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
                  <p className="text-sm font-semibold text-gray-800">
                    Last updated August 01, 2026
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-bold mb-2">AGREEMENT TO OUR LEGAL TERMS</h3>
                  <p className="text-sm leading-relaxed text-gray-800">
                    We are Rigzer Private Limited ("Company," "we," "us," "our"), a company registered in India at 15 JP colony, Jaipur, Rajasthan 302015.
                  </p>
                  <p className="text-sm leading-relaxed text-gray-800 mt-2">
                    We operate the website https://www.rigzer.com (the "Site"), as well as any other related products and services that refer or link to these legal terms (the "Legal Terms") (collectively, the "Services").
                  </p>
                  <p className="text-sm leading-relaxed text-gray-800 mt-2">
                    Rigzer is a social interactive media platform that enables users to run and purchase cloud-based game demos for upcoming titles, upload 3D models and media, share content in a social feed, and communicate via direct messaging.
                  </p>
                  <p className="text-sm leading-relaxed text-gray-800 mt-2">
                    You can contact us by phone at 09602350226, email at adamya@rigzer.com, or by mail to 15 JP colony, Jaipur, Rajasthan 302015, India.
                  </p>
                  <p className="text-sm leading-relaxed text-gray-800 mt-2">
                    These Legal Terms constitute a legally binding agreement made between you, whether personally or on behalf of an entity ("you"), and Rigzer Private Limited, concerning your access to and use of the Services. You agree that by accessing the Services, you have read, understood, and agreed to be bound by all of these Legal Terms. IF YOU DO NOT AGREE WITH ALL OF THESE LEGAL TERMS, THEN YOU ARE EXPRESSLY PROHIBITED FROM USING THE SERVICES AND YOU MUST DISCONTINUE USE IMMEDIATELY.
                  </p>
                  <p className="text-sm leading-relaxed text-gray-800 mt-2">
                    Supplemental terms and conditions or documents that may be posted on the Services from time to time are hereby expressly incorporated herein by reference. We reserve the right, in our sole discretion, to make changes or modifications to these Legal Terms from time to time. We will alert you about any changes by updating the "Last updated" date of these Legal Terms, and you waive any right to receive specific notice of each such change. It is your responsibility to periodically review these Legal Terms to stay informed of updates. You will be subject to, and will be deemed to have been made aware of and to have accepted, the changes in any revised Legal Terms by your continued use of the Services after the date such revised Legal Terms are posted.
                  </p>
                  <p className="text-sm leading-relaxed text-gray-800 mt-2">
                    The Services are intended for users who are at least 13 years of age. All users who are minors in the jurisdiction in which they reside (generally under the age of 18) must have the permission of, and be directly supervised by, their parent or guardian to use the Services. If you are a minor, you must have your parent or guardian read and agree to these Legal Terms prior to you using the Services.
                  </p>
                  <p className="text-sm leading-relaxed text-gray-800 mt-2">
                    We recommend that you print a copy of these Legal Terms for your records.
                  </p>
                </section>

                {/* --- ADDED TABLE OF CONTENTS --- */}
                <section>
                  <h3 className="text-lg font-bold mb-2">TABLE OF CONTENTS</h3>
                  <ol className="list-decimal list-inside space-y-1.5 text-sm leading-relaxed text-gray-800">
                    <li>OUR SERVICES</li>
                    <li>INTELLECTUAL PROPERTY RIGHTS</li>
                    <li>USER REPRESENTATIONS</li>
                    <li>USER REGISTRATION</li>
                    <li>PURCHASES AND PAYMENT</li>
                    <li>POLICY</li>
                    <li>PROHIBITED ACTIVITIES</li>
                    <li>USER GENERATED CONTRIBUTIONS</li>
                    <li>CONTRIBUTION LICENSE</li>
                    <li>GUIDELINES FOR REVIEWS</li>
                    <li>SOCIAL MEDIA</li>
                    <li>ADVERTISERS</li>
                    <li>SERVICES MANAGEMENT</li>
                    <li>PRIVACY POLICY</li>
                    <li>TERM AND TERMINATION</li>
                    <li>MODIFICATIONS AND INTERRUPTIONS</li>
                    <li>GOVERNING LAW</li>
                    <li>DISPUTE RESOLUTION</li>
                    <li>CORRECTIONS</li>
                    <li>DISCLAIMER</li>
                    <li>LIMITATIONS OF LIABILITY</li>
                    <li>INDEMNIFICATION</li>
                    <li>USER DATA</li>
                    <li>ELECTRONIC COMMUNICATIONS, TRANSACTIONS, AND SIGNATURES</li>
                    <li>CALIFORNIA USERS AND RESIDENTS</li>
                    <li>MISCELLANEOUS</li>
                    <li>YOUR CONTENT</li>
                    <li>MISUSE OF THE SERVICES</li>
                    <li>YOUR LICENSE TO USE THE SERVICES</li>
                    <li>CONTACT US</li>
                  </ol>
                </section>

                <section>
                  <h3 className="text-lg font-bold mb-2">1. OUR SERVICES</h3>
                  <p className="text-sm leading-relaxed text-gray-800">
                    The information provided when using the Services is not intended for distribution to or use by any person or entity in any jurisdiction or country where such distribution or use would be contrary to law or regulation or which would subject us to any registration requirement within such jurisdiction or country. Accordingly, those persons who choose to access the Services from other locations do so on their own initiative and are solely responsible for compliance with local laws, if and to the extent local laws are applicable.
                  </p>
                  <p className="text-sm leading-relaxed text-gray-800 mt-2">
                    The Services are not tailored to comply with industry-specific regulations (Health Insurance Portability and Accountability Act (HIPAA), Federal Information Security Management Act (FISMA), etc.), so if your interactions would be subjected to such laws, you may not use the Services. You may not use the Services in a way that would violate the Gramm-Leach-Bliley Act (GLBA).
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-bold mb-2">2. INTELLECTUAL PROPERTY RIGHTS</h3>
                  <p className="text-sm font-bold text-gray-800 mt-2">Our intellectual property</p>
                  <p className="text-sm leading-relaxed text-gray-800">
                    We are the owner or the licensee of all intellectual property rights in our Services, including all source code, databases, functionality, software, website designs, audio, video, text, photographs, and graphics in the Services (collectively, the "Content"), as well as the trademarks, service marks, and logos contained therein (the "Marks").
                  </p>
                  <p className="text-sm leading-relaxed text-gray-800 mt-2">
                    Our Content and Marks are protected by copyright and trademark laws (and various other intellectual property rights and unfair competition laws) and treaties in the United States and around the world.
                  </p>
                  <p className="text-sm leading-relaxed text-gray-800 mt-2">
                    The Content and Marks are provided in or through the Services "AS IS" for your personal, non-commercial use or internal business purpose only.
                  </p>
                  
                  <p className="text-sm font-bold text-gray-800 mt-4">Your use of our Services</p>
                  <p className="text-sm leading-relaxed text-gray-800">
                    Subject to your compliance with these Legal Terms, including the "PROHIBITED ACTIVITIES" section below, we grant you a non-exclusive, non-transferable, revocable license to:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-sm leading-relaxed text-gray-800 mt-2">
                    <li>access the Services; and</li>
                    <li>download or print a copy of any portion of the Content to which you have properly gained access,</li>
                  </ul>
                  <p className="text-sm leading-relaxed text-gray-800 mt-2">
                    solely for your personal, non-commercial use or internal business purpose.
                  </p>
                  <p className="text-sm leading-relaxed text-gray-800 mt-2">
                    Except as set out in this section or elsewhere in our Legal Terms, no part of the Services and no Content or Marks may be copied, reproduced, aggregated, republished, uploaded, posted, publicly displayed, encoded, translated, transmitted, distributed, sold, licensed, or otherwise exploited for any commercial purpose whatsoever, without our express prior written permission.
                  </p>
                  <p className="text-sm leading-relaxed text-gray-800 mt-2">
                    If you wish to make any use of the Services, Content, or Marks other than as set out in this section or elsewhere in our Legal Terms, please address your request to: adamya@rigzer.com. If we ever grant you the permission to post, reproduce, or publicly display any part of our Services or Content, you must identify us as the owners or licensors of the Services, Content, or Marks and ensure that any copyright or proprietary notice appears or is visible on posting, reproducing, or displaying our Content.
                  </p>
                  <p className="text-sm leading-relaxed text-gray-800 mt-2">
                    We reserve all rights not expressly granted to you in and to the Services, Content, and Marks.
                  </p>
                  <p className="text-sm leading-relaxed text-gray-800 mt-2">
                    Any breach of these Intellectual Property Rights will constitute a material breach of our Legal Terms and your right to use our Services will terminate immediately.
                  </p>

                  <p className="text-sm font-bold text-gray-800 mt-4">Your submissions and contributions</p>
                  <p className="text-sm leading-relaxed text-gray-800">
                    Please review this section and the "PROHIBITED ACTIVITIES" section carefully prior to using our Services to understand the (a) rights you give us and (b) obligations you have when you post or upload any content through the Services.
                  </p>
                  <p className="text-sm leading-relaxed text-gray-800 mt-2">
                    <strong>Submissions:</strong> By directly sending us any question, comment, suggestion, idea, feedback, or other information about the Services ("Submissions"), you agree to assign to us all intellectual property rights in such Submission. You agree that we shall own this Submission and be entitled to its unrestricted use and dissemination for any lawful purpose, commercial or otherwise, without acknowledgment or compensation to you.
                  </p>
                  <p className="text-sm leading-relaxed text-gray-800 mt-2">
                    <strong>Contributions:</strong> The Services may invite you to chat, contribute to, or participate in blogs, message boards, online forums, and other functionality during which you may create, submit, post, display, transmit, publish, distribute, or broadcast content and materials to us or through the Services, including but not limited to text, writings, video, audio, photographs, music, graphics, comments, reviews, rating suggestions, personal information, or other material ("Contributions"). Any Submission that is publicly posted shall also be treated as a Contribution.
                  </p>
                  <p className="text-sm leading-relaxed text-gray-800 mt-2">
                    You understand that Contributions may be viewable by other users of the Services.
                  </p>
                  <p className="text-sm leading-relaxed text-gray-800 mt-2">
                    <strong>When you post Contributions, you grant us a license (including use of your name, trademarks, and logos):</strong> By posting any Contributions, you grant us an unrestricted, unlimited, irrevocable, perpetual, non-exclusive, transferable, royalty-free, fully-paid, worldwide right, and license to: use, copy, reproduce, distribute, sell, resell, publish, broadcast, retitle, store, publicly perform, publicly display, reformat, translate, excerpt (in whole or in part), and exploit your Contributions (including, without limitation, your image, name, and voice) for any purpose, commercial, advertising, or otherwise, to prepare derivative works of, or incorporate into other works, your Contributions, and to sublicense the licenses granted in this section. Our use and distribution may occur in any media formats and through any media channels.
                  </p>
                  <p className="text-sm leading-relaxed text-gray-800 mt-2">
                    This license includes our use of your name, company name, and franchise name, as applicable, and any of the trademarks, service marks, trade names, logos, and personal and commercial images you provide.
                  </p>
                  <p className="text-sm leading-relaxed text-gray-800 mt-2">
                    <strong>You are responsible for what you post or upload:</strong> By sending us Submissions and/or posting Contributions through any part of the Services or making Contributions accessible through the Services by linking your account through the Services to any of your social networking accounts, you:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-sm leading-relaxed text-gray-800 mt-2">
                    <li>confirm that you have read and agree with our "PROHIBITED ACTIVITIES" and will not post, send, publish, upload, or transmit through the Services any Submission nor post any Contribution that is illegal, harassing, hateful, harmful, defamatory, obscene, bullying, abusive, discriminatory, threatening to any person or group, sexually explicit, false, inaccurate, deceitful, or misleading;</li>
                    <li>to the extent permissible by applicable law, waive any and all moral rights to any such Submission and/or Contribution;</li>
                    <li>warrant that any such Submission and/or Contributions are original to you or that you have the necessary rights and licenses to submit such Submissions and/or Contributions and that you have full authority to grant us the above-mentioned rights in relation to your Submissions and/or Contributions; and</li>
                    <li>warrant and represent that your Submissions and/or Contributions do not constitute confidential information.</li>
                  </ul>
                  <p className="text-sm leading-relaxed text-gray-800 mt-2">
                    You are solely responsible for your Submissions and/or Contributions and you expressly agree to reimburse us for any and all losses that we may suffer because of your breach of (a) this section, (b) any third party’s intellectual property rights, or (c) applicable law.
                  </p>
                  <p className="text-sm leading-relaxed text-gray-800 mt-2">
                    <strong>We may remove or edit your Content:</strong> Although we have no obligation to monitor any Contributions, we shall have the right to remove or edit any Contributions at any time without notice if in our reasonable opinion we consider such Contributions harmful or in breach of these Legal Terms. If we remove or edit any such Contributions, we may also suspend or disable your account and report you to the authorities.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-bold mb-2">3. USER REPRESENTATIONS</h3>
                  <p className="text-sm leading-relaxed text-gray-800">
                    By using the Services, you represent and warrant that: (1) all registration information you submit will be true, accurate, current, and complete; (2) you will maintain the accuracy of such information and promptly update such registration information as necessary; (3) you have the legal capacity and you agree to comply with these Legal Terms; (4) you are not under the age of 13; (5) you are not a minor in the jurisdiction in which you reside, or if a minor, you have received parental permission to use the Services; (6) you will not access the Services through automated or non-human means, whether through a bot, script or otherwise; (7) you will not use the Services for any illegal or unauthorized purpose; and (8) your use of the Services will not violate any applicable law or regulation.
                  </p>
                  <p className="text-sm leading-relaxed text-gray-800 mt-2">
                    If you provide any information that is untrue, inaccurate, not current, or incomplete, we have the right to suspend or terminate your account and refuse any and all current or future use of the Services (or any portion thereof).
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-bold mb-2">4. USER REGISTRATION</h3>
                  <p className="text-sm leading-relaxed text-gray-800">
                    You may be required to register to use the Services. You agree to keep your password confidential and will be responsible for all use of your account and password. We reserve the right to remove, reclaim, or change a username you select if we determine, in our sole discretion, that such username is inappropriate, obscene, or otherwise objectionable.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-bold mb-2">5. PURCHASES AND PAYMENT</h3>
                  <p className="text-sm leading-relaxed text-gray-800">
                    We accept the following forms of payment:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-sm leading-relaxed text-gray-800 mt-2">
                    <li>Visa</li>
                    <li>Mastercard</li>
                  </ul>
                  <p className="text-sm leading-relaxed text-gray-800 mt-2">
                    You agree to provide current, complete, and accurate purchase and account information for all purchases made via the Services. You further agree to promptly update account and payment information, including email address, payment method, and payment card expiration date, so that we can complete your transactions and contact you as needed. Sales tax will be added to the price of purchases as deemed required by us. We may change prices at any time. All payments shall be in US dollars.
                  </p>
                  <p className="text-sm leading-relaxed text-gray-800 mt-2">
                    You agree to pay all charges at the prices then in effect for your purchases and any applicable shipping fees, and you authorize us to charge your chosen payment provider for any such amounts upon placing your order. We reserve the right to correct any errors or mistakes in pricing, even if we have already requested or received payment.
                  </p>
                  <p className="text-sm leading-relaxed text-gray-800 mt-2">
                    We reserve the right to refuse any order placed through the Services. We may, in our sole discretion, limit or cancel quantities purchased per person, per household, or per order. These restrictions may include orders placed by or under the same customer account, the same payment method, and/or orders that use the same billing or shipping address. We reserve the right to limit or prohibit orders that, in our sole judgment, appear to be placed by dealers, resellers, or distributors.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-bold mb-2">6. POLICY</h3>
                  <p className="text-sm leading-relaxed text-gray-800">
                    All sales are final and no refund will be issued.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-bold mb-2">7. PROHIBITED ACTIVITIES</h3>
                  <p className="text-sm leading-relaxed text-gray-800">
                    You may not access or use the Services for any purpose other than that for which we make the Services available. The Services may not be used in connection with any commercial endeavors except those that are specifically endorsed or approved by us.
                  </p>
                  <p className="text-sm leading-relaxed text-gray-800 mt-2">
                    As a user of the Services, you agree not to:
                  </p>
                  <ul className="list-disc list-inside space-y-1.5 text-sm leading-relaxed text-gray-800 mt-2">
                    <li>Systematically retrieve data or other content from the Services to create or compile, directly or indirectly, a collection, compilation, database, or directory without written permission from us.</li>
                    <li>Trick, defraud, or mislead us and other users, especially in any attempt to learn sensitive account information such as user passwords.</li>
                    <li>Circumvent, disable, or otherwise interfere with security-related features of the Services, including features that prevent or restrict the use or copying of any Content or enforce limitations on the use of the Services and/or the Content contained therein.</li>
                    <li>Disparage, tarnish, or otherwise harm, in our opinion, us and/or the Services.</li>
                    <li>Use any information obtained from the Services in order to harass, abuse, or harm another person.</li>
                    <li>Make improper use of our support services or submit false reports of abuse or misconduct.</li>
                    <li>Use the Services in a manner inconsistent with any applicable laws or regulations.</li>
                    <li>Engage in unauthorized framing of or linking to the Services.</li>
                    <li>Upload or transmit (or attempt to upload or to transmit) viruses, Trojan horses, or other material, including excessive use of capital letters and spamming (continuous posting of repetitive text), that interferes with any party’s uninterrupted use and enjoyment of the Services or modifies, impairs, disrupts, alters, or interferes with the use, features, functions, operation, or maintenance of the Services.</li>
                    <li>Engage in any automated use of the system, such as using scripts to send comments or messages, or using any data mining, robots, or similar data gathering and extraction tools.</li>
                    <li>Delete the copyright or other proprietary rights notice from any Content.</li>
                    <li>Attempt to impersonate another user or person or use the username of another user.</li>
                    <li>Upload or transmit (or attempt to upload or to transmit) any material that acts as a passive or active information collection or transmission mechanism, including without limitation, clear graphics interchange formats ("gifs"), 1×1 pixels, web bugs, cookies, or other similar devices (sometimes referred to as "spyware" or "passive collection mechanisms" or "pcms").</li>
                    <li>Interfere with, disrupt, or create an undue burden on the Services or the networks or services connected to the Services.</li>
                    <li>Harass, annoy, intimidate, or threaten any of our employees or agents engaged in providing any portion of the Services to you.</li>
                    <li>Attempt to bypass any measures of the Services designed to prevent or restrict access to the Services, or any portion of the Services.</li>
                    <li>Copy or adapt the Services' software, including but not limited to Flash, PHP, HTML, JavaScript, or other code.</li>
                    <li>Except as permitted by applicable law, decipher, decompile, disassemble, or reverse engineer any of the software comprising or in any way making up a part of the Services.</li>
                    <li>Except as may be the result of standard search engine or Internet browser usage, use, launch, develop, or distribute any automated system, including without limitation, any spider, robot, cheat utility, scraper, or offline reader that accesses the Services, or use or launch any unauthorized script or other software.</li>
                    <li>Use a buying agent or purchasing agent to make purchases on the Services.</li>
                    <li>Make any unauthorized use of the Services, including collecting usernames and/or email addresses of users by electronic or other means for the purpose of sending unsolicited email, or creating user accounts by automated means or under false pretenses.</li>
                    <li>Use the Services as part of any effort to compete with us or otherwise use the Services and/or the Content for any revenue-generating endeavor or commercial enterprise.</li>
                    <li>Sell or otherwise transfer your profile.</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-bold mb-2">8. USER GENERATED CONTRIBUTIONS</h3>
                  <p className="text-sm leading-relaxed text-gray-800">
                    The Services may invite you to chat, contribute to, or participate in blogs, message boards, online forums, and other functionality, and may provide you with the opportunity to create, submit, post, display, transmit, perform, publish, distribute, or broadcast content and materials to us or on the Services, including but not limited to text, writings, video, audio, photographs, graphics, comments, suggestions, or personal information or other material (collectively, "Contributions"). Contributions may be viewable by other users of the Services and through third-party websites. As such, any Contributions you transmit may be treated as non-confidential and non-proprietary. When you create or make available any Contributions, you thereby represent and warrant that:
                  </p>
                  <ul className="list-disc list-inside space-y-1.5 text-sm leading-relaxed text-gray-800 mt-2">
                    <li>The creation, distribution, transmission, public display, or performance, and the accessing, downloading, or copying of your Contributions do not and will not infringe the proprietary rights, including but not limited to the copyright, patent, trademark, trade secret, or moral rights of any third party.</li>
                    <li>You are the creator and owner of or have the necessary licenses, rights, consents, releases, and permissions to use and to authorize us, the Services, and other users of the Services to use your Contributions in any manner contemplated by the Services and these Legal Terms.</li>
                    <li>You have the written consent, release, and/or permission of each and every identifiable individual person in your Contributions to use the name or likeness of each and every such identifiable individual person to enable inclusion and use of your Contributions in any manner contemplated by the Services and these Legal Terms.</li>
                    <li>Your Contributions are not false, inaccurate, or misleading.</li>
                    <li>Your Contributions are not unsolicited or unauthorized advertising, promotional materials, pyramid schemes, chain letters, spam, mass mailings, or other forms of solicitation.</li>
                    <li>Your Contributions are not obscene, lewd, lascivious, filthy, violent, harassing, libelous, slanderous, or otherwise objectionable (as determined by us).</li>
                    <li>Your Contributions do not ridicule, mock, disparage, intimidate, or abuse anyone.</li>
                    <li>Your Contributions are not used to harass or threaten (in the legal sense of those terms) any other person and to promote violence against a specific person or class of people.</li>
                    <li>Your Contributions do not violate any applicable law, regulation, or rule.</li>
                    <li>Your Contributions do not violate the privacy or publicity rights of any third party.</li>
                    <li>Your Contributions do not violate any applicable law concerning child pornography, or otherwise intended to protect the health or well-being of minors.</li>
                    <li>Your Contributions do not include any offensive comments that are connected to race, national origin, gender, sexual preference, or physical handicap.</li>
                    <li>Your Contributions do not otherwise violate, or link to material that violates, any provision of these Legal Terms, or any applicable law or regulation.</li>
                  </ul>
                  <p className="text-sm leading-relaxed text-gray-800 mt-2">
                    Any use of the Services in violation of the foregoing violates these Legal Terms and may result in, among other things, termination or suspension of your rights to use the Services.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-bold mb-2">9. CONTRIBUTION LICENSE</h3>
                  <p className="text-sm leading-relaxed text-gray-800">
                    By posting your Contributions to any part of the Services or making Contributions accessible to the Services by linking your account from the Services to any of your social networking accounts, you automatically grant, and you represent and warrant that you have the right to grant, to us an unrestricted, unlimited, irrevocable, perpetual, non-exclusive, transferable, royalty-free, fully-paid, worldwide right, and license to host, use, copy, reproduce, disclose, sell, resell, publish, broadcast, retitle, archive, store, cache, publicly perform, publicly display, reformat, translate, transmit, excerpt (in whole or in part), and distribute such Contributions (including, without limitation, your image and voice) for any purpose, commercial, advertising, or otherwise, and to prepare derivative works of, or incorporate into other works, such Contributions, and grant and authorize sublicenses of the foregoing. The use and distribution may occur in any media formats and through any media channels.
                  </p>
                  <p className="text-sm leading-relaxed text-gray-800 mt-2">
                    This license will apply to any form, media, or technology now known or hereafter developed, and includes our use of your name, company name, and franchise name, as applicable, and any of the trademarks, service marks, trade names, logos, and personal and commercial images you provide. You waive all moral rights in your Contributions, and you warrant that moral rights have not otherwise been asserted in your Contributions.
                  </p>
                  <p className="text-sm leading-relaxed text-gray-800 mt-2">
                    We do not assert any ownership over your Contributions. You retain full ownership of all of your Contributions and any intellectual property rights or other proprietary rights associated with your Contributions. We are not liable for any statements or representations in your Contributions provided by you in any area on the Services. You are solely responsible for your Contributions to the Services and you expressly agree to exonerate us from any and all responsibility and to refrain from any legal action against us regarding your Contributions.
                  </p>
                  <p className="text-sm leading-relaxed text-gray-800 mt-2">
                    We have the right, in our sole and absolute discretion, (1) to edit, redact, or otherwise change any Contributions; (2) to re-categorize any Contributions to place them in more appropriate locations on the Services; and (3) to pre-screen or delete any Contributions at any time and for any reason, without notice. We have no obligation to monitor your Contributions.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-bold mb-2">10. GUIDELINES FOR REVIEWS</h3>
                  <p className="text-sm leading-relaxed text-gray-800">
                    We may provide you areas on the Services to leave reviews or ratings. When posting a review, you must comply with the following criteria: (1) you should have firsthand experience with the person/entity being reviewed; (2) your reviews should not contain offensive profanity, or abusive, racist, offensive, or hateful language; (3) your reviews should not contain discriminatory references based on religion, race, gender, national origin, age, marital status, sexual orientation, or disability; (4) your reviews should not contain references to illegal activity; (5) you should not be affiliated with competitors if posting negative reviews; (6) you should not make any conclusions as to the legality of conduct; (7) you may not post any false or misleading statements; and (8) you may not organize a campaign encouraging others to post reviews, whether positive or negative.
                  </p>
                  <p className="text-sm leading-relaxed text-gray-800 mt-2">
                    We may accept, reject, or remove reviews in our sole discretion. We have absolutely no obligation to screen reviews or to delete reviews, even if anyone considers reviews objectionable or inaccurate. Reviews are not endorsed by us, and do not necessarily represent our opinions or the views of any of our affiliates or partners. We do not assume liability for any review or for any claims, liabilities, or losses resulting from any review. By posting a review, you hereby grant to us a perpetual, non-exclusive, worldwide, royalty-free, fully paid, assignable, and sublicensable right and license to reproduce, modify, translate, transmit by any means, display, perform, and/or distribute all content relating to review.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-bold mb-2">11. SOCIAL MEDIA</h3>
                  <p className="text-sm leading-relaxed text-gray-800">
                    As part of the functionality of the Services, you may link your account with online accounts you have with third-party service providers (each such account, a "Third-Party Account") by either: (1) providing your Third-Party Account login information through the Services; or (2) allowing us to access your Third-Party Account, as is permitted under the applicable terms and conditions that govern your use of each Third-Party Account. You represent and warrant that you are entitled to disclose your Third-Party Account login information to us and/or grant us access to your Third-Party Account, without breach by you of any of the terms and conditions that govern your use of the applicable Third-Party Account, and without obligating us to pay any fees or making us subject to any usage limitations imposed by the third-party service provider of the Third-Party Account. By granting us access to any Third-Party Accounts, you understand that (1) we may access, make available, and store (if applicable) any content that you have provided to and stored in your Third-Party Account (the "Social Network Content") so that it is available on and through the Services via your account, including without limitation any friend lists and (2) we may submit to and receive from your Third-Party Account additional information to the extent you are notified when you link your account with the Third-Party Account. Depending on the Third-Party Accounts you choose and subject to the privacy settings that you have set in such Third-Party Accounts, personally identifiable information that you post to your Third-Party Accounts may be available on and through your account on the Services. Please note that if a Third-Party Account or associated service becomes unavailable or our access to such Third-Party Account is terminated by the third-party service provider, then Social Network Content may no longer be available on and through the Services. You will have the ability to disable the connection between your account on the Services and your Third-Party Accounts at any time. PLEASE NOTE THAT YOUR RELATIONSHIP WITH THE THIRD-PARTY SERVICE PROVIDERS ASSOCIATED WITH YOUR THIRD-PARTY ACCOUNTS IS GOVERNED SOLELY BY YOUR AGREEMENT(S) WITH SUCH THIRD-PARTY SERVICE PROVIDERS. We make no effort to review any Social Network Content for any purpose, including but not limited to, for accuracy, legality, or non-infringement, and we are not responsible for any Social Network Content. You acknowledge and agree that we may access your email address book associated with a Third-Party Account and your contacts list stored on your mobile device or tablet computer solely for purposes of identifying and informing you of those contacts who have also registered to use the Services. You can deactivate the connection between the Services and your Third-Party Account by contacting us using the contact information below or through your account settings (if applicable). We will attempt to delete any information stored on our servers that was obtained through such Third-Party Account, except the username and profile picture that become associated with your account.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-bold mb-2">12. ADVERTISERS</h3>
                  <p className="text-sm leading-relaxed text-gray-800">
                    We allow advertisers to display their advertisements and other information in certain areas of the Services, such as sidebar advertisements or banner advertisements. We simply provide the space to place such advertisements, and we have no other relationship with advertisers.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-bold mb-2">13. SERVICES MANAGEMENT</h3>
                  <p className="text-sm leading-relaxed text-gray-800">
                    We reserve the right, but not the obligation, to: (1) monitor the Services for violations of these Legal Terms; (2) take appropriate legal action against anyone who, in our sole discretion, violates the law or these Legal Terms, including without limitation, reporting such user to law enforcement authorities; (3) in our sole discretion and without limitation, refuse, restrict access to, limit the availability of, or disable (to the extent technologically feasible) any of your Contributions or any portion thereof; (4) in our sole discretion and without limitation, notice, or liability, to remove from the Services or otherwise disable all files and content that are excessive in size or are in any way burdensome to our systems; and (5) otherwise manage the Services in a manner designed to protect our rights and property and to facilitate the proper functioning of the Services.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-bold mb-2">14. PRIVACY POLICY</h3>
                  <p className="text-sm leading-relaxed text-gray-800">
                    We care about data privacy and security. By using the Services, you agree to be bound by our Privacy Policy posted on the Services, which is incorporated into these Legal Terms. Please be advised the Services are hosted in India. If you access the Services from any other region of the world with laws or other requirements governing personal data collection, use, or disclosure that differ from applicable laws in India, then through your continued use of the Services, you are transferring your data to India, and you expressly consent to have your data transferred to and processed in India. Further, we do not knowingly accept, request, or solicit information from children or knowingly market to children. Therefore, in accordance with the U.S. Children’s Online Privacy Protection Act, if we receive actual knowledge that anyone under the age of 13 has provided personal information to us without the requisite and verifiable parental consent, we will delete that information from the Services as quickly as is reasonably practical.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-bold mb-2">15. TERM AND TERMINATION</h3>
                  <p className="text-sm leading-relaxed text-gray-800">
                    These Legal Terms shall remain in full force and effect while you use the Services. WITHOUT LIMITING ANY OTHER PROVISION OF THESE LEGAL TERMS, WE RESERVE THE RIGHT TO, IN OUR SOLE DISCRETION AND WITHOUT NOTICE OR LIABILITY, DENY ACCESS TO AND USE OF THE SERVICES (INCLUDING BLOCKING CERTAIN IP ADDRESSES), TO ANY PERSON FOR ANY REASON OR FOR NO REASON, INCLUDING WITHOUT LIMITATION FOR BREACH OF ANY REPRESENTATION, WARRANTY, OR COVENANT CONTAINED IN THESE LEGAL TERMS OR OF ANY APPLICABLE LAW OR REGULATION. WE MAY TERMINATE YOUR USE OR PARTICIPATION IN THE SERVICES OR DELETE YOUR ACCOUNT AND ANY CONTENT OR INFORMATION THAT YOU POSTED AT ANY TIME, WITHOUT WARNING, IN OUR SOLE DISCRETION.
                  </p>
                  <p className="text-sm leading-relaxed text-gray-800 mt-2">
                    If we terminate or suspend your account for any reason, you are prohibited from registering and creating a new account under your name, a fake or borrowed name, or the name of any third party, even if you may be acting on behalf of the third party. In addition to terminating or suspending your account, we reserve the right to take appropriate legal action, including without limitation pursuing civil, criminal, and injunctive redress.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-bold mb-2">16. MODIFICATIONS AND INTERRUPTIONS</h3>
                  <p className="text-sm leading-relaxed text-gray-800">
                    We reserve the right to change, modify, or remove the contents of the Services at any time or for any reason at our sole discretion without notice. However, we have no obligation to update any information on our Services. We will not be liable to you or any third party for any modification, price change, suspension, or discontinuance of the Services.
                  </p>
                  <p className="text-sm leading-relaxed text-gray-800 mt-2">
                    We cannot guarantee the Services will be available at all times. We may experience hardware, software, or other problems or need to perform maintenance related to the Services, resulting in interruptions, delays, or errors. We reserve the right to change, revise, update, suspend, discontinue, or otherwise modify the Services at any time or for any reason without notice to you. You agree that we have no liability whatsoever for any loss, damage, or inconvenience caused by your inability to access or use the Services during any downtime or discontinuance of the Services. Nothing in these Legal Terms will be construed to obligate us to maintain and support the Services or to supply any corrections, updates, or releases in connection therewith.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-bold mb-2">17. GOVERNING LAW</h3>
                  <p className="text-sm leading-relaxed text-gray-800">
                    These Legal Terms shall be governed by and defined following the laws of India. Rigzer Private Limited and yourself irrevocably consent that the courts of India shall have exclusive jurisdiction to resolve any dispute which may arise in connection with these Legal Terms.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-bold mb-2">18. DISPUTE RESOLUTION</h3>
                  <p className="text-sm font-bold text-gray-800 mt-2">Informal Negotiations</p>
                  <p className="text-sm leading-relaxed text-gray-800">
                    To expedite resolution and control the cost of any dispute, controversy, or claim related to these Legal Terms (each a "Dispute" and collectively, the "Disputes") brought by either you or us (individually, a "Party" and collectively, the "Parties"), the Parties agree to first attempt to negotiate any Dispute (except those Disputes expressly provided below) informally for at least ninety (90) days before initiating arbitration. Such informal negotiations commence upon written notice from one Party to the other Party.
                  </p>
                  <p className="text-sm font-bold text-gray-800 mt-4">Binding Arbitration</p>
                  <p className="text-sm leading-relaxed text-gray-800">
                    If the parties are unable to resolve the dispute through informal negotiation, the dispute shall be finally resolved by arbitration in accordance with the United Nations Commission on International Trade Law Arbitration Rules in force at the time of commencement of the arbitration. The number of arbitrators shall be four (4). The seat, or legal place, or arbitration shall be jaipur, India. The language of the proceedings shall be english. The governing law of these Legal Terms shall be substantive law of India.
                  </p>
                  <p className="text-sm font-bold text-gray-800 mt-4">Restrictions</p>
                  <p className="text-sm leading-relaxed text-gray-800">
                    The Parties agree that any arbitration shall be limited to the Dispute between the Parties individually. To the full extent permitted by law, (a) no arbitration shall be joined with any other proceeding; (b) there is no right or authority for any Dispute to be arbitrated on a class-action basis or to utilize class action procedures; and (c) there is no right or authority for any Dispute to be brought in a purported representative capacity on behalf of the general public or any other persons.
                  </p>
                  <p className="text-sm font-bold text-gray-800 mt-4">Exceptions to Informal Negotiations and Arbitration</p>
                  <p className="text-sm leading-relaxed text-gray-800">
                    The Parties agree that the following Disputes are not subject to the above provisions concerning informal negotiations binding arbitration: (a) any Disputes seeking to enforce or protect, or concerning the validity of, any of the intellectual property rights of a Party; (b) any Dispute related to, or arising from, allegations of theft, piracy, invasion of privacy, or unauthorized use; and (c) any claim for injunctive relief. If this provision is found to be illegal or unenforceable, then neither Party will elect to arbitrate any Dispute falling within that portion of this provision found to be illegal or unenforceable and such Dispute shall be decided by a court of competent jurisdiction within the courts listed for jurisdiction above, and the Parties agree to submit to the personal jurisdiction of that court.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-bold mb-2">19. CORRECTIONS</h3>
                  <p className="text-sm leading-relaxed text-gray-800">
                    There may be information on the Services that contains typographical errors, inaccuracies, or omissions, including descriptions, pricing, availability, and various other information. We reserve the right to correct any errors, inaccuracies, or omissions and to change or update the information on the Services at any time, without prior notice.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-bold mb-2">20. DISCLAIMER</h3>
                  <p className="text-sm leading-relaxed text-gray-800 uppercase">
                    THE SERVICES ARE PROVIDED ON AN AS-IS AND AS-AVAILABLE BASIS. YOU AGREE THAT YOUR USE OF THE SERVICES WILL BE AT YOUR SOLE RISK. TO THE FULLEST EXTENT PERMITTED BY LAW, WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, IN CONNECTION WITH THE SERVICES AND YOUR USE THEREOF, INCLUDING, WITHOUT LIMITATION, THE IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE MAKE NO WARRANTIES OR REPRESENTATIONS ABOUT THE ACCURACY OR COMPLETENESS OF THE SERVICES' CONTENT OR THE CONTENT OF ANY WEBSITES OR MOBILE APPLICATIONS LINKED TO THE SERVICES AND WE WILL ASSUME NO LIABILITY OR RESPONSIBILITY FOR ANY (1) ERRORS, MISTAKES, OR INACCURACIES OF CONTENT AND MATERIALS, (2) PERSONAL INJURY OR PROPERTY DAMAGE, OF ANY NATURE WHATSOEVER, RESULTING FROM YOUR ACCESS TO AND USE OF THE SERVICES, (3) ANY UNAUTHORIZED ACCESS TO OR USE OF OUR SECURE SERVERS AND/OR ANY AND ALL PERSONAL INFORMATION AND/OR FINANCIAL INFORMATION STORED THEREIN, (4) ANY INTERRUPTION OR CESSATION OF TRANSMISSION TO OR FROM THE SERVICES, (5) ANY BUGS, VIRUSES, TROJAN HORSES, OR THE LIKE WHICH MAY BE TRANSMITTED TO OR THROUGH THE SERVICES BY ANY THIRD PARTY, AND/OR (6) ANY ERRORS OR OMISSIONS IN ANY CONTENT AND MATERIALS OR FOR ANY LOSS OR DAMAGE OF ANY KIND INCURRED AS A RESULT OF THE USE OF ANY CONTENT POSTED, TRANSMITTED, OR OTHERWISE MADE AVAILABLE VIA THE SERVICES. WE DO NOT WARRANT, ENDORSE, GUARANTEE, OR ASSUME RESPONSIBILITY FOR ANY PRODUCT OR SERVICE ADVERTISED OR OFFERED BY A THIRD PARTY THROUGH THE SERVICES, ANY HYPERLINKED WEBSITE, OR ANY WEBSITE OR MOBILE APPLICATION FEATURED IN ANY BANNER OR OTHER ADVERTISING, AND WE WILL NOT BE A PARTY TO OR IN ANY WAY BE RESPONSIBLE FOR MONITORING ANY TRANSACTION BETWEEN YOU AND ANY THIRD-PARTY PROVIDERS OF PRODUCTS OR SERVICES. AS WITH THE PURCHASE OF A PRODUCT OR SERVICE THROUGH ANY MEDIUM OR IN ANY ENVIRONMENT, YOU SHOULD USE YOUR BEST JUDGMENT AND EXERCISE CAUTION WHERE APPROPRIATE.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-bold mb-2">21. LIMITATIONS OF LIABILITY</h3>
                  <p className="text-sm leading-relaxed text-gray-800 uppercase">
                    IN NO EVENT WILL WE OR OUR DIRECTORS, EMPLOYEES, OR AGENTS BE LIABLE TO YOU OR ANY THIRD PARTY FOR ANY DIRECT, INDIRECT, CONSEQUENTIAL, EXEMPLARY, INCIDENTAL, SPECIAL, OR PUNITIVE DAMAGES, INCLUDING LOST PROFIT, LOST REVENUE, LOSS OF DATA, OR OTHER DAMAGES ARISING FROM YOUR USE OF THE SERVICES, EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-bold mb-2">22. INDEMNIFICATION</h3>
                  <p className="text-sm leading-relaxed text-gray-800">
                    You agree to defend, indemnify, and hold us harmless, including our subsidiaries, affiliates, and all of our respective officers, agents, partners, and employees, from and against any loss, damage, liability, claim, or demand, including reasonable attorneys’ fees and expenses, made by any third party due to or arising out of: (1) your Contributions; (2) use of the Services; (3) breach of these Legal Terms; (4) any breach of your representations and warranties set forth in these Legal Terms; (5) your violation of the rights of a third party, including but not limited to intellectual property rights; or (6) any overt harmful act toward any other user of the Services with whom you connected via the Services. Notwithstanding the foregoing, we reserve the right, at your expense, to assume the exclusive defense and control of any matter for which you are required to indemnify us, and you agree to cooperate, at your expense, with our defense of such claims. We will use reasonable efforts to notify you of any such claim, action, or proceeding which is subject to this indemnification upon becoming aware of it.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-bold mb-2">23. USER DATA</h3>
                  <p className="text-sm leading-relaxed text-gray-800">
                    We will maintain certain data that you transmit to the Services for the purpose of managing the performance of the Services, as well as data relating to your use of the Services. Although we perform regular routine backups of data, you are solely responsible for all data that you transmit or that relates to any activity you have undertaken using the Services. You agree that we shall have no liability to you for any loss or corruption of any such data, and you hereby waive any right of action against us arising from any such loss or corruption of such data.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-bold mb-2">24. ELECTRONIC COMMUNICATIONS, TRANSACTIONS, AND SIGNATURES</h3>
                  <p className="text-sm leading-relaxed text-gray-800">
                    Visiting the Services, sending us emails, and completing online forms constitute electronic communications. You consent to receive electronic communications, and you agree that all agreements, notices, disclosures, and other communications we provide to you electronically, via email and on the Services, satisfy any legal requirement that such communication be in writing. YOU HEREBY AGREE TO THE USE OF ELECTRONIC SIGNATURES, CONTRACTS, ORDERS, AND OTHER RECORDS, AND TO ELECTRONIC DELIVERY OF NOTICES, POLICIES, AND RECORDS OF TRANSACTIONS INITIATED OR COMPLETED BY US OR VIA THE SERVICES. You hereby waive any rights or requirements under any statutes, regulations, rules, ordinances, or other laws in any jurisdiction which require an original signature or delivery or retention of non-electronic records, or to payments or the granting of credits by any means other than electronic means.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-bold mb-2">25. CALIFORNIA USERS AND RESIDENTS</h3>
                  <p className="text-sm leading-relaxed text-gray-800">
                    If any complaint with us is not satisfactorily resolved, you can contact the Complaint Assistance Unit of the Division of Consumer Services of the California Department of Consumer Affairs in writing at 1625 North Market Blvd., Suite N 112, Sacramento, California 95834 or by telephone at (800) 952-5210 or (916) 445-1254.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-bold mb-2">26. MISCELLANEOUS</h3>
                  <p className="text-sm leading-relaxed text-gray-800">
                    These Legal Terms and any policies or operating rules posted by us on the Services or in respect to the Services constitute the entire agreement and understanding between you and us. Our failure to exercise or enforce any right or provision of these Legal Terms shall not operate as a waiver of such right or provision. These Legal Terms operate to the fullest extent permissible by law. We may assign any or all of our rights and obligations to others at any time. We shall not be responsible or liable for any loss, damage, delay, or failure to act caused by any cause beyond our reasonable control. If any provision or part of a provision of these Legal Terms is determined to be unlawful, void, or unenforceable, that provision or part of the provision is deemed severable from these Legal Terms and does not affect the validity and enforceability of any remaining provisions. There is no joint venture, partnership, employment or agency relationship created between you and us as a result of these Legal Terms or use of the Services. You agree that these Legal Terms will not be construed against us by virtue of having drafted them. You hereby waive any and all defenses you may have based on the electronic form of these Legal Terms and the lack of signing by the parties hereto to execute these Legal Terms.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-bold mb-2">27. YOUR CONTENT</h3>
                  <p className="text-sm leading-relaxed text-gray-800">
                    You own the Content you create and post on Rigzer. This includes your 3D posts, game demos, code in Pockets, text, images, videos, and any other material you share. By posting or creating Content on Rigzer, you grant us a worldwide, royalty-free license to show, host, distribute, and promote that Content as needed to operate the Services. This allows us to make your 3D models viewable, run your game demos through cloud gaming, display your Pockets, and enable others to interact with them. You are fully responsible for everything you post or create. Your Content must follow these Terms, our Community Rules, and all applicable laws. You should only post or create Content that you are comfortable sharing with others, and you must have the necessary rights to share anything you post. We especially welcome creative interactive content such as 3D posts for artists, game developers, architects, and product showcases, personal coding spaces in Pockets, and game demos played through our cloud gaming service. That said, we strongly discourage and will remove content that includes nudity, pornography, or any straight-up triggering or inappropriate material. We will also remove shady or harmful groups and any content that clearly falls outside our vision.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-bold mb-2">28. MISUSE OF THE SERVICES</h3>
                  <p className="text-sm leading-relaxed text-gray-800">
                    You agree not to misuse Rigzer. This includes interfering with the normal operation of the platform, accessing it through any method other than the official interfaces we provide, or attempting to reverse engineer, hack, jailbreak, or bypass any technical protections or safety features. You must not access areas you are not authorised to reach, probe or test the security of our systems, scrape or collect data automatically without permission, send spam or viruses, overload the service, impersonate others, or engage in any activity that disrupts Rigzer or creates an unfair burden on it. You also must not help others do any of these things.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-bold mb-2">29. YOUR LICENSE TO USE THE SERVICES</h3>
                  <p className="text-sm leading-relaxed text-gray-800">
                    We grant you a personal, worldwide, royalty-free, non-transferable, and non-exclusive license to use the software and features that form part of Rigzer. This license is for your personal use only. You may not sell, share, transfer, or assign this license to anyone else. The Services, including their design, logos, and underlying technology, are protected by copyright, trademark, and other laws. You do not have any right to use our name, logos, or brand features without our express written permission. All rights in the Services, other than the Content provided by users, remain with us and our partners. Any feedback, comments, or suggestions you provide about Rigzer are entirely voluntary, and we may use them freely to improve the platform.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-bold mb-2">30. CONTACT US</h3>
                  <p className="text-sm leading-relaxed text-gray-800">
                    In order to resolve a complaint regarding the Services or to receive further information regarding use of the Services, please contact us at:
                  </p>
                  <div className="text-sm leading-relaxed text-gray-800 mt-2">
                    <p>Rigzer Private Limited</p>
                    <p>15 JP colony</p>
                    <p>Jaipur, Rajasthan 302015</p>
                    <p>India</p>
                    <p>Phone: 09602350226</p>
                    <p>adamya@rigzer.com</p>
                  </div>
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