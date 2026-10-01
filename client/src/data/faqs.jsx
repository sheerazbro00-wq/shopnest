import { Link } from "react-router-dom";
import { store } from "./store";

const rs = (n) => `PKR ${n.toLocaleString("en-US")}`;
const Phone = () => <a href={store.phoneHref}>{store.phone}</a>;
const Email = ({ to = store.email }) => <a href={`mailto:${to}`}>{to}</a>;

// Adapted from the reference store's FAQ page, rewritten to match what
// ShopNest actually does (fees, payments, account features).
export const faqs = [
  {
    q: "What is ShopNest?",
    a: <p>SHOPNEST is a high-street menswear brand bringing together everyday essentials and seasonal fashion.</p>,
  },
  {
    q: "Who are we?",
    a: (
      <p>
        Design, production, and retail are the heart of the SHOPNEST business model. The brand is committed to bringing to you quality
        apparel and accessories that are priced competitively and are durable to last beyond the current season.
        <br />
        <br />
        SHOPNEST proudly brings to you high-end, locally manufactured, quality clothes and accessories, which are usually exported and
        rarely available in Pakistan. Our material is sourced from international production houses as well as from factories in Pakistan
        that are primarily export-based. These factories adhere to the highest international standards and comply with our labor laws.
      </p>
    ),
  },
  {
    q: "What is the aim at SHOPNEST?",
    a: (
      <p>
        Our design focus is on quality products for men. SHOPNEST is committed to constantly evolve with the needs of our customers,
        keeping in mind quality, comfort, durability, and fashion trends.
      </p>
    ),
  },
  {
    q: "What products do you have?",
    a: (
      <p>
        SHOPNEST offers you a wide range of <Link to="/collections/man-apparel-new-in">apparel</Link>,{" "}
        <Link to="/collections/man-shoes">footwear</Link> and <Link to="/collections/man-accessories">accessories</Link> for men.
      </p>
    ),
  },
  {
    q: "Does SHOPNEST have a physical store?",
    a: <p>Yes, SHOPNEST has stores in Lahore, Islamabad and Karachi. You can find the addresses under Store Location at the bottom of every page.</p>,
  },
  {
    q: "What is the delivery time?",
    a: <p>We expect to deliver confirmed orders across Pakistan within 3 to 5 working days.</p>,
  },
  {
    q: "What delivery service is used?",
    a: <p>We use third-party delivery services like Call Courier, PostEx and TCS to facilitate deliveries to our customers nationwide.</p>,
  },
  {
    q: "What are the delivery charges?",
    a: (
      <p>
        The standard delivery charge is {rs(store.shippingFee)} for orders under {rs(store.freeShippingMin)}. Orders of{" "}
        {rs(store.freeShippingMin)} and above are delivered free.
      </p>
    ),
  },
  {
    q: "How do I place my order?",
    a: (
      <>
        <p>PLACE YOUR ORDER IN THREE EASY STEPS!</p>
        <ul>
          <li>Add the desired items to your cart and simply checkout</li>
          <li>Submit an order with the correct delivery and contact details</li>
          <li>Kindly wait for a confirmation call from our customer service representative</li>
        </ul>
      </>
    ),
  },
  {
    q: "Do you have a return policy?",
    a: (
      <p>
        At SHOPNEST we do not accept returns, but we do offer exchanges. See our <Link to="/pages/return-exchange-policy">Return &amp; Exchange Policy</Link>.
      </p>
    ),
  },
  {
    q: "Do you have a refund policy?",
    a: <p>At SHOPNEST we do not refund orders however, we do offer exchanges.</p>,
  },
  {
    q: "Can I exchange my products, if needed?",
    a: (
      <p>
        Yes, you can exchange products within 30 days of purchase with the original sales receipt, if the product is defective or of an
        incorrect size. Articles must be unworn, unaltered and tagged. Promotional merchandise is non-exchangeable. Full details are in our{" "}
        <Link to="/pages/return-exchange-policy">Return &amp; Exchange Policy</Link>.
      </p>
    ),
  },
  {
    q: "What do I do if I receive a faulty item in my order?",
    a: (
      <p>
        Kindly do not accept an order if the parcel is damaged or the seal is opened. If you receive a faulty product, immediately call our
        customer care helpline at <Phone /> between {store.opens} and {store.closes}. You can also email us at <Email />.
      </p>
    ),
  },
  {
    q: "If there is an item missing in my order, what should I do?",
    a: (
      <p>
        We may send your items in separate parcels, so please be patient if all your items are not delivered together. If the delay is
        beyond one business day, please <Link to="/pages/contact">contact our Customer Care team</Link> for further assistance.
      </p>
    ),
  },
  {
    q: "The size I ordered doesn’t fit me, what should I do?",
    a: (
      <p>
        If the order does not fit please see our <Link to="/pages/return-exchange-policy">exchange policy</Link>, to order a different size
        and arrange for an exchange.
      </p>
    ),
  },
  {
    q: "Can I cancel my order?",
    a: <p>Orders cannot be canceled once we have verified an order with you and it has been processed and dispatched.</p>,
  },
  {
    q: "Can I make changes to my order after confirming it?",
    a: (
      <p>
        Yes, changes to order are accepted if you immediately call Customer Care and advise them. Once the order has been processed and
        dispatched we are unable to make changes.
      </p>
    ),
  },
  {
    q: "Can I have my parcel redirected to a different address?",
    a: <p>For your security, we are unable to change the address once we have confirmed your order with you.</p>,
  },
  {
    q: "Can you tell me when out-of-stock items will be available?",
    a: (
      <p>
        We do not currently have the facility to advise when a specific item is back in stock. However, we do tend to re-stock quite
        frequently, so recommend you check back!
      </p>
    ),
  },
  {
    q: "How can I purchase from SHOPNEST?",
    a: (
      <p>
        You can shop online on <Link to="/">our website</Link> for nationwide delivery or visit our physical stores.
      </p>
    ),
  },
  {
    q: "How should I choose my size?",
    a: (
      <p>
        Every product page has a size chart for your assistance — tap &ldquo;Size chart&rdquo; next to the size options. Our{" "}
        <Link to="/pages/size-guides">Size Guides</Link> also show how to measure yourself.
      </p>
    ),
  },
  {
    q: "How will I know that you have received my order?",
    a: (
      <p>
        After successfully placing your order, you will see your order number on the screen. If you are signed in, the order also appears
        under <Link to="/account">My Account &rarr; Orders</Link>.
      </p>
    ),
  },
  {
    q: "Is the color shown on the website accurate?",
    a: (
      <p>
        Actual colors may vary. Although we try extremely hard to ensure that our photos are as life-like as possible there may be a slight
        difference due to the device screens.
      </p>
    ),
  },
  {
    q: "What should I do if the items I want to purchase are out of stock?",
    a: <p>Our restocking is usually done on Mondays and Fridays, we recommend you check back or visit us in stores.</p>,
  },
  {
    q: "Is SHOPNEST online payment safe?",
    a: (
      <p>
        Yes. Card payments are processed by Stripe on their secure, SSL-encrypted checkout page — your card details never reach our
        servers and we never store them.
      </p>
    ),
  },
  {
    q: "What are the payment methods for SHOPNEST?",
    a: <p>We offer online card payments and cash-on-delivery for our valued customers.</p>,
  },
  {
    q: "Does SHOPNEST deliver outside Pakistan?",
    a: <p>Currently, we are only delivering across Pakistan.</p>,
  },
  {
    q: "Do you offer discounts?",
    a: (
      <p>
        Yes, we offer promotional discounts. See everything currently on sale in our <Link to="/collections/man-overall-combined">End of Season Sale</Link>.
      </p>
    ),
  },
  {
    q: "Does SHOPNEST have Customer Support, and if so, what are the timings?",
    a: (
      <p>
        Yes, we have a customer care team at SHOPNEST that can be contacted via call, chat and/or email from 9 a.m. to 9 p.m., Monday to
        Saturday.
      </p>
    ),
  },
  {
    q: "Where is SHOPNEST’s head office located?",
    a: <p>SHOPNEST head office is located at {store.address}.</p>,
  },
  {
    q: "Is SHOPNEST available on social media?",
    a: <p>Yes, we are available on social media platforms such as Instagram, Facebook, YouTube and TikTok.</p>,
  },
  {
    q: "What is SHOPNEST HR email?",
    a: (
      <p>
        SHOPNEST&rsquo;s HR email is <Email to={store.hrEmail} />. You can also see our open positions on the <Link to="/pages/careers">Careers</Link> page.
      </p>
    ),
  },
  {
    q: "Does SHOPNEST have an official website?",
    a: (
      <p>
        Yes — you&rsquo;re on it! Shop the full range on <Link to="/">our website</Link>.
      </p>
    ),
  },
  {
    q: "Do I need to set up an account to make a purchase online?",
    a: <p>You can create an account or check out as a guest for all online purchases.</p>,
  },
  {
    q: "How do I create an account?",
    a: (
      <p>
        You can <Link to="/account/register">sign up</Link> on the official SHOPNEST website to track your orders, save your addresses and
        stay up to date with the latest trends and offers.
      </p>
    ),
  },
  {
    q: "How do I change my details once I have created an account?",
    a: (
      <p>
        You can change your details by logging into your account and editing your personal information on the{" "}
        <Link to="/account/profile">Profile</Link> page.
      </p>
    ),
  },
  {
    q: "Why is my product disappearing from the cart?",
    a: (
      <p>
        Please bear in mind that even though you have placed an item in your cart, it does not count as a purchase. Another customer may
        have checked out the item while it was in your cart and the product is now out of stock.
      </p>
    ),
  },
  {
    q: "Is my package secured and do I need to sign for my order?",
    a: (
      <p>
        Your package is sealed and secured. You are required to sign for the parcel at the time of delivery to make sure the parcel was
        delivered to the right person/address.
      </p>
    ),
  },
  {
    q: "Does SHOPNEST ship to multiple addresses?",
    a: (
      <p>
        We are only able to deliver to one address per order. If you would like to send your purchases to multiple addresses, we suggest
        you place a separate order for each destination.
      </p>
    ),
  },
  {
    q: "How do I track my order?",
    a: (
      <p>
        If you are signed in, you can follow your order&rsquo;s status under <Link to="/account">My Account &rarr; Orders</Link>. After
        confirmed orders are dispatched, a unique tracking number is provided which you can use on the delivery service&rsquo;s website.
      </p>
    ),
  },
  {
    q: "Do you offer a repair service?",
    a: <p>SHOPNEST does not offer repair services for any items purchased.</p>,
  },
  {
    q: "Do you offer gift cards?",
    a: <p>We don&rsquo;t offer gift cards at the moment.</p>,
  },
  {
    q: "I have a coupon code. How can I redeem it?",
    a: <p>We don&rsquo;t use coupon codes at the moment — sale prices are applied automatically, so what you see on the product is what you pay.</p>,
  },
  {
    q: "What happens if a paid order is canceled?",
    a: (
      <p>
        If a paid order is canceled prior to delivery for any reason on the customer&rsquo;s request we offer the amount to be issued in
        the form of an e-store coupon which can be used online anytime up to 3 months.
        <br />
        <br />
        Likewise, if the order is canceled due to any reason from the company&rsquo;s end we can offer an e-store coupon or the amount can
        also be refunded to your card and may take up to 7-10 business days to reflect.
      </p>
    ),
  },
  {
    q: "I haven’t received a confirmation email. What should I do?",
    a: (
      <p>
        In case you have not received an email confirming your order then please wait for the confirmation call from a SHOPNEST customer
        care representative. In case there is no confirmation call either, reach out to us at <Phone /> or email us at <Email />.
      </p>
    ),
  },
];
