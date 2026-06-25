import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy — Tcall",
  description: "How Tcall collects, uses, and protects your data.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="Last updated: June 2026">
      <p>
        Tcall (&quot;we&quot;, &quot;us&quot;) provides real-time translated audio calls and messaging. This Privacy
        Policy explains what data we collect, how we use it, and the choices you have. By using Tcall you agree to this
        policy.
      </p>

      <LegalSection heading="1. Data we collect">
        <ul className="list-disc pl-5 space-y-1">
          <li><b>Account:</b> name, email, chosen language, password (stored only as a secure hash), and your Tcall ID.</li>
          <li><b>Optional profile:</b> avatar, bio, age, city, country, profession and similar details you add.</li>
          <li><b>Usage &amp; security:</b> device type, browser, IP address, and last login time — used to secure your account and prevent abuse.</li>
          <li><b>Communication data:</b> call and message metadata, and message content needed to deliver and translate your conversations.</li>
          <li><b>Payments:</b> subscription and payment records when you purchase a plan.</li>
          <li><b>Optional features:</b> a face photo (only if you enable the PIN lock with face recovery) and a Telegram chat ID (only if you link Telegram for notifications).</li>
        </ul>
      </LegalSection>

      <LegalSection heading="2. How we use your data">
        <p>To provide and improve the service: create your account, connect calls, deliver and translate messages, process subscriptions, send notifications, prevent fraud and abuse, and comply with the law.</p>
      </LegalSection>

      <LegalSection heading="3. Real-time translation &amp; processors">
        <p>
          To translate speech and text, relevant content is sent securely to our AI translation provider (OpenAI) solely
          to generate the translation. We also use service providers for hosting, push notifications, and — if you link
          it — Telegram for notification delivery. These providers process data on our behalf under their own terms.
        </p>
      </LegalSection>

      <LegalSection heading="4. Data sharing">
        <p>We do not sell your personal data. We share data only with the processors above, with other users as part of the calls/chats you participate in, or when required by law.</p>
      </LegalSection>

      <LegalSection heading="5. Data retention">
        <p>We keep your data while your account is active. You can delete your account at any time from <b>Settings → Account</b>, which removes your profile and associated data. Some records may be retained briefly where required for legal or security reasons.</p>
      </LegalSection>

      <LegalSection heading="6. Your rights">
        <p>You can access and update your information in the app, withdraw optional integrations (Telegram, face recovery), and delete your account. For requests, contact <a className="text-brand-600" href="mailto:support@tcall.uz">support@tcall.uz</a>.</p>
      </LegalSection>

      <LegalSection heading="7. Security">
        <p>Data is encrypted in transit. Passwords and PINs are stored only as secure hashes. No method of transmission is 100% secure, but we work to protect your information.</p>
      </LegalSection>

      <LegalSection heading="8. Children">
        <p>Tcall is not intended for children under 13 (or the minimum age required in your country). We do not knowingly collect data from children.</p>
      </LegalSection>

      <LegalSection heading="9. Changes">
        <p>We may update this policy. Material changes will be reflected by the &quot;Last updated&quot; date above.</p>
      </LegalSection>

      <LegalSection heading="10. Contact">
        <p>Questions? Email <a className="text-brand-600" href="mailto:support@tcall.uz">support@tcall.uz</a>.</p>
      </LegalSection>
    </LegalPage>
  );
}
