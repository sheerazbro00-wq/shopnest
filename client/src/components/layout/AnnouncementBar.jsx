import { useCurrency } from "../../context/CurrencyContext";
import { store } from "../../data/store";
import "./AnnouncementBar.css";

export default function AnnouncementBar() {
  const { currency, money } = useCurrency();
  // Rupees keep the original wording; other currencies show the converted amount (spec 007).
  const threshold = currency === "PKR" ? `Rs. ${store.freeShippingMin}` : money(store.freeShippingMin);

  return (
    <div className="announcement-bar">
      <div className="page-width">
        <span className="announcement-text">Free shipping on orders above {threshold}</span>
      </div>
    </div>
  );
}
