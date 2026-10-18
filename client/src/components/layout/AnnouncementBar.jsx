import { useCurrency } from "../../context/CurrencyContext";
import { store } from "../../data/store";
import "./AnnouncementBar.css";

export default function AnnouncementBar() {
  const { currency, money } = useCurrency();
  // Rupees keep the original wording; other currencies show the converted amount (spec 007).
  // USD/GBP shoppers ship abroad, so they get the international threshold (spec 008).
  const threshold = currency === "PKR" ? `Rs. ${store.freeShippingMin}` : money(store.intlFreeShippingMin);

  return (
    <div className="announcement-bar">
      <div className="page-width">
        <span className="announcement-text">Free shipping on orders above {threshold}</span>
      </div>
    </div>
  );
}
