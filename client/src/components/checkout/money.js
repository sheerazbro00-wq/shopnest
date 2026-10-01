// Shopify's checkout formats money as "Rs 15,120.00" (space, no dot).
export const money = (amount) =>
  `Rs ${Number(amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
