import PageLayout from "../../components/page/PageLayout";
import { store } from "../../data/store";

export default function PrivacyPolicy() {
  return (
    <PageLayout title="Privacy Policy">
      <p>
        <strong>PRIVACY POLICY</strong>
      </p>
      <p>
        This Privacy Policy outlines the types of personal information collected and received by SHOPNEST (&ldquo;we,&rdquo;
        &ldquo;us,&rdquo; or &ldquo;our&rdquo;) and how we use, disclose, and protect that information. By using or accessing our
        website, you consent to the terms and practices described in this policy.
      </p>

      <p>
        <strong>Information We Collect:</strong>
      </p>
      <p>
        a) Personal Information: we may collect personal information from you when you voluntarily provide it to us, such as when you
        create an account, make a purchase, subscribe to our newsletter, send us a message through our contact form or interact with our
        website&rsquo;s features. This may include your name, email address, phone number, shipping address and other details necessary to
        provide our services to you. Card payments are handled by our payment provider, Stripe: your card details are entered on
        Stripe&rsquo;s secure page and never reach or get stored on our servers.
        <br />
        <br />
        At all times, we will offer you the opportunity to unsubscribe out of any service or update to which you have subscribed, if you
        change your mind. You can switch marketing emails off at any time from the Profile page of your account, and any email we send you
        will contain an easy unsubscribe link.
      </p>
      <p>b) Non-Personal Information:</p>
      <p>
        We may also collect non-personal information about your interactions with our website. This may include your IP address, browser
        type, device information, and browsing behavior. Such information is collected through the use of cookies, log files, and similar
        technologies. Your cart and recently viewed products are stored in your own browser.
      </p>

      <p>
        <strong>Use of Information:</strong>
      </p>
      <p>
        a) Personal Information we may use to: process and fulfill your orders, provide customer support and respond to inquiries,
        customize and improve our website and services, send you promotional offers, updates, and newsletters (you can opt out at any
        time) and conduct market research and analyze trends.
      </p>
      <p>
        b) Non-Personal Information: non-personal information is primarily used to analyze and improve the functionality and performance of
        our website. This data helps us understand how users interact with our website and enables us to enhance user experience.
      </p>

      <p>
        <strong>Disclosure of Information:</strong>
      </p>
      <p>a) Service Providers:</p>
      <p>
        We may engage trusted third-party service providers — such as our payment processor and delivery partners — to assist us in
        operating our website and providing our services. These service providers may have access to your personal information but are
        obligated to keep it confidential and use it solely for the purposes specified by us.
      </p>
      <p>b) Legal Requirements:</p>
      <p>
        We may disclose your personal information if required to do so by law or in response to valid legal requests, such as subpoenas,
        court orders, or government regulations.
      </p>

      <p>
        <strong>Data Security:</strong>
      </p>
      <p>
        We implement appropriate technical and organizational measures to safeguard your personal information from unauthorized access,
        disclosure, alteration, or destruction — for example, passwords are stored only as secure one-way hashes. However, please note that
        no method of transmission over the internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
      </p>

      <p>
        <strong>Third-Party Links:</strong>
      </p>
      <p>
        We do collect information about site traffic, sales and other commercial information which we may pass on to third parties but
        this information does not include any information which can identify you personally.
      </p>

      <p>
        We reserve the right to update or modify this Privacy Policy at any time. Any changes will be effective when posted on this page. We
        encourage you to review this Privacy Policy periodically to stay informed about how we collect, use, and protect your information.
        For any further information or unsubscribing from our services you may contact us on <a href={store.phoneHref}>{store.phone}</a>{" "}
        or email us at <a href={`mailto:${store.email}`}>{store.email}</a>.
      </p>
    </PageLayout>
  );
}
