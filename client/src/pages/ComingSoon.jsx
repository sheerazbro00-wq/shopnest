import { Link } from "react-router-dom";

export default function ComingSoon() {
  return (
    <div className="page-width" style={{ padding: "90px 0", textAlign: "center" }}>
      <h1 style={{ fontFamily: "var(--font-header)", fontWeight: 400, fontSize: 30, textTransform: "uppercase" }}>
        Coming soon
      </h1>
      <p style={{ marginTop: 16, fontSize: 15.3 }}>This page is being built next.</p>
      <Link to="/" className="btn" style={{ marginTop: 30 }}>
        Continue shopping
      </Link>
    </div>
  );
}
