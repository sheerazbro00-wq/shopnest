import { useEffect, useState } from "react";
import Collapsible from "../../components/common/Collapsible";
import { store } from "../../data/store";
import { sized, srcSet } from "../../utils/format";
import "../../components/page/Page.css";
import "./Careers.css";

const TEAM_IMAGE =
  "https://cdn.shopify.com/s/files/1/0537/9771/6146/files/MAN_TSHIRTS_629ea0fa-275d-4782-87cb-03e91cd0f65a.jpg?v=1789021644";

const JOBS = [
  {
    title: "Senior Manager Knits",
    duties: [
      "Develop and implement quality control standards and procedures for knitwear products.",
      "Monitor production processes to ensure compliance with approved specifications, fabrics, and workmanship standards.",
      "Conduct and supervise inspections at different stages including inline and final inspections.",
      "Work closely with sourcing, merchandising, and production teams to resolve quality-related issues.",
      "Identify root causes of quality defects and implement corrective and preventive actions.",
      "Ensure vendors follow quality requirements, testing standards, and compliance guidelines.",
      "Review product samples and approve pre-production and production samples from a quality perspective.",
      "Analyze quality reports and performance data to identify trends and areas for improvement.",
      "Manage and guide quality teams and inspectors across factories or production units.",
      "Ensure timely resolution of customer complaints and product returns related to quality.",
    ],
    requirements: [
      "Bachelor’s degree in Textile Engineering, Textile Technology, or a related field.",
      "7 - 8 years of experience in garment quality assurance, preferably in knitwear.",
      "Strong knowledge of knit fabrics, garment construction, and inspection standards.",
      "Experience managing factory audits, inline inspections, and final quality checks.",
      "Strong problem-solving, analytical, and communication skills.",
    ],
    location: `Head Office, ${store.headOffice}`,
  },
  {
    title: "Deputy Manager Planning",
    duties: [
      "Prepare the yearly sales budget by category, season, and channel.",
      "Develop seasonal assortment plans in line with brand strategy, market trends, and historical performance.",
      "Formulate the annual buying budget aligned with sales targets and inventory norms.",
      "Allocate buying budgets by category, season, and supplier.",
      "Prepare monthly sales forecasts based on historical data, current trends, and business inputs.",
      "Monitor forecast accuracy and revise plans proactively.",
      "Maintain and monitor IMU, Gross Margin (GM), discount levels, and buying budgets.",
      "Analyze variances and recommend corrective actions to improve profitability.",
      "Coordinate with sourcing, merchandising, and supply chain teams to ensure deliveries as per Assortment Plan (AP).",
      "Track order status and highlight risks related to delays or short shipments.",
      "Prepare and maintain weekly, monthly, quarterly, and yearly performance reports.",
      "Provide insights on sales, stock, margins, sell-through, and inventory health to management.",
    ],
    requirements: [
      "Bachelor's degree in Supply Chain Management or related field. (Masters degree is a plus)",
      "Minimum 4 years of relevant experience",
      "Strong analytical and planning skills",
      "Advanced Excel / MIS reporting knowledge",
      "Understanding of retail KPIs (IMU, GM, Sell-through, Stock Turn)",
      "Coordination and follow-up skills",
      "Ability to work under timelines and pressure",
    ],
    location: `Head Office, ${store.headOffice}`,
  },
];

const OFFERS = [
  { title: "Compensations & Benefits", text: "Market Competitive Salary, Annual Increments/Commissions/Bonus, Career Growth." },
  { title: "Team Member Discounts", text: "Do you love everything SHOPNEST? Our team members can buy them at a generous discount all year round." },
  { title: "Vacations", text: "We offer a generous Paid Time Off Program and New Parent Leave*." },
  {
    title: "Casual Environment",
    text: "A place you want to come to: Comfortable clothes every day. Company-wide lunches. Break rooms where you'll meet anyone from interns to the CEO.",
  },
  {
    title: "Open Book Policy",
    text: "We want our team members to feel like an integral part of our company. We share our financial results company-wide and CEO personally reviews our results with team members every quarter.",
  },
  {
    title: "Collaborative Environment",
    text: "Whether it's a copywriter recommending products to the merchants, or a warehouse manager providing the theme for an email blast, we welcome your talents and insight, wherever they apply.",
  },
];

const applyHref = (title) => `mailto:${store.hrEmail}?subject=${encodeURIComponent(`Application: ${title}`)}`;

export default function Careers() {
  const [open, setOpen] = useState(null);

  useEffect(() => {
    document.title = "Careers – ShopNest";
  }, []);

  return (
    <div className="careers">
      <section className="page-width careers-section careers-intro">
        <h1 className="careers-title">Love what you do</h1>
        <p>
          A job doesn&rsquo;t have to be business as usual. Come work for a company you can believe in, doing work you can be proud of, with
          people who inspire you.
        </p>
      </section>

      <section className="page-width careers-section careers-positions" aria-labelledby="OpenPositions">
        <h2 id="OpenPositions" className="careers-title">
          Open positions
        </h2>
        <div className="careers-jobs rte">
          {JOBS.map((job) => (
            <Collapsible key={job.title} title={job.title} open={open === job.title} onToggle={() => setOpen((o) => (o === job.title ? null : job.title))}>
              <p>
                <strong>Job Description:</strong>
              </p>
              <ul>
                {job.duties.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
              <p>
                <strong>Minimum Requirements:</strong>
              </p>
              <ul>
                {job.requirements.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
              <p>
                <strong>Location:</strong> {job.location}
              </p>
              <a className="btn careers-apply" href={applyHref(job.title)}>
                Apply now
              </a>
              <p className="careers-apply-note">
                Or email your CV to <a href={applyHref(job.title)}>{store.hrEmail}</a> with the job title in the subject line.
              </p>
            </Collapsible>
          ))}
        </div>
      </section>

      <section className="careers-feature">
        <div className="careers-feature__text">
          <p>
            <strong>WHY JOIN OUR TEAM</strong>
          </p>
          <p>
            At SHOPNEST, we see people as dynamic and ever-evolving. This is why we take a special interest in the career ambitions of our
            team members, and provide a fun, safe space for individuals to grow. We know most people spend a huge part of their lives with
            the people they work with, so we&rsquo;re ensuring it&rsquo;s an exciting and youthful space with constant opportunity!
          </p>
        </div>
        <div className="careers-feature__image">
          <img src={sized(TEAM_IMAGE, 1200)} srcSet={srcSet(TEAM_IMAGE, [540, 720, 900, 1200, 1500])} sizes="(max-width: 768px) 100vw, 600px" alt="" loading="lazy" />
        </div>
      </section>

      <section className="page-width careers-section careers-offer" aria-labelledby="WhatWeOffer">
        <h2 id="WhatWeOffer" className="careers-title">
          What we offer
        </h2>
        <ul className="careers-offer__grid">
          {OFFERS.map((o) => (
            <li key={o.title} className="careers-offer__card">
              <h3>{o.title}</h3>
              <p>{o.text}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
