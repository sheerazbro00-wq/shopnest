import PageLayout from "../../components/page/PageLayout";
import { store } from "../../data/store";

export default function ReturnPolicy() {
  return (
    <PageLayout title="Return & Exchange Policy">
      <ul className="policy-list">
        <li>All sales are final. No refunds.</li>
        <li>You can exchange your purchase within 30 days accompanied by an original sales receipt and original SHOPNEST packaging.</li>
        <li>Merchandise can only be exchanged if it is not used, altered, washed or damaged and must have all its original tags on.</li>
        <li>
          Your exchange can be coordinated via email (<a href={`mailto:${store.email}`}>{store.email}</a>) or you can call us at{" "}
          <a href={store.phoneHref}>{store.phone}</a> between {store.opens} and {store.closes}, Monday to Saturday.
        </li>
        <li>In case of a mark-down in price due to sales promotion, customers are only eligible to make an exchange against the new, marked down price.</li>
        <li>Used/misused items will not be eligible for exchange.</li>
        <li>
          You can only make a claim of damaged merchandise within 3 days of purchase. If bought online, damaged/missing merchandise must be
          reported within 2 days of delivery.
        </li>
        <li>Claims and exchanges may take up to 3 weeks to be processed.</li>
        <li>No exchange can be made during sales / promotion periods.</li>
        <li>Products on promotion are not eligible for exchange.</li>
        <li>For hygiene and care, all underwear and boxers are final sale and cannot be exchanged or returned.</li>
        <li>All accessories, including bags, eyewear, fragrances and belts are not exchangeable.</li>
      </ul>
    </PageLayout>
  );
}
