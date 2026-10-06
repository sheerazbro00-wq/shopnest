import { Navigate, useParams, useSearchParams } from "react-router-dom";

// PayPal sends shoppers back with its own ?token=<PayPal order id>, which would clash
// with the thank-you page's ?token=<order access token> (plan 004 §1). Our token rides
// along as ?t= and this hop swaps it into the normal thank-you link.
export default function PayPalReturn() {
  const { id } = useParams();
  const [params] = useSearchParams();
  return <Navigate to={`/checkout/thank-you/${id}?token=${encodeURIComponent(params.get("t") || "")}`} replace />;
}
