import { Link } from "react-router-dom";
import PageLayout from "../../components/page/PageLayout";

const Brand = () => (
  <Link to="/" title="ShopNest">
    SHOPNEST
  </Link>
);

const VALUES = ["Inclusivity", "Collaboration", "Ownership", "Excellence", "Simplicity", "Integrity"];

export default function AboutUs() {
  return (
    <PageLayout title="About Us">
      <h3>Who are we?</h3>
      <p>
        Founded in 2020, <Brand /> is a high-street brand with a focus on combining functional, sustainable design with
        popular fashion for a diverse audience spanning different ages and lifestyles.
      </p>
      <p>
        The culture at <Brand /> is about simplicity, kindness, growth and inclusivity. The customer is at the heart of
        the <Brand /> business model. We are committed to providing a comprehensive shopping experience that evolves with
        what our customers want more and better of.
      </p>

      <h3>Vision</h3>
      <p>
        We create simple lifestyle choices that let you{" "}
        <em>
          <strong>tell your own stories</strong>
        </em>
        .
      </p>

      <h3>Core Values</h3>
      <p>SHOPNEST is committed to expanding rapidly nationwide and evolving every season through:</p>
      <ul>
        {VALUES.map((v) => (
          <li key={v}>- {v}</li>
        ))}
      </ul>
    </PageLayout>
  );
}
