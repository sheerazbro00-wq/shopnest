const c = (handle) => `/collections/${handle}`;

export const mainMenu = [
  {
    title: "MAN",
    url: c("man-apparel-new-in"),
    links: [
      { title: "NEW IN", url: c("man-apparel-new-in") },
      { title: "SPRING SUMMER'26", url: c("man-spring-summer-26") },
      { title: "SHIRTS", url: c("man-shirts") },
      { title: "T-SHIRTS", url: c("man-t-shirts") },
      { title: "POLO", url: c("man-polo") },
      { title: "BLAZERS", url: c("man-blazers") },
      { title: "TANK TOPS", url: c("man-tank-tops") },
      { title: "BOXERS", url: c("man-boxers") },
      { title: "BOTTOMS", url: c("man-pants") },
      { title: "SHORTS", url: c("man-shorts") },
      { title: "SWEATERS & CARDIGANS", url: c("man-sweaters-cardigans") },
      { title: "JACKETS & COATS", url: c("man-jackets-coats") },
      { title: "HOODIES & SWEATSHIRTS", url: c("man-hoodies-sweatshirt") },
    ],
  },
  {
    title: "SHOES",
    url: c("man-shoes"),
    links: [
      { title: "NEW IN", url: c("man-shoes-new-in") },
      { title: "BOOTS", url: c("man-boots") },
      { title: "LOAFERS", url: c("man-loafers") },
      { title: "SNEAKERS", url: c("man-sneakers") },
      { title: "LACE-UPS", url: c("man-lace-ups") },
      { title: "SLIDES", url: c("man-slides") },
    ],
  },
  {
    title: "ACCESSORIES",
    url: c("man-accessories"),
    links: [
      { title: "NEW IN", url: c("man-accessories-new-in") },
      { title: "HEADWEAR", url: c("man-headwear") },
      { title: "BELTS", url: c("man-belts") },
      { title: "HANDBAGS", url: c("man-bags") },
      { title: "SOCKS", url: c("man-socks") },
      { title: "SHOES ACCESSORIES", url: c("man-shoes-accessories") },
    ],
  },
  { title: "CLEARANCE", url: c("man-overall-combined") },
];

export const footerLinks = [
  { title: "ABOUT US", url: "/pages/about-us" },
  { title: "CAREERS", url: "/pages/careers" },
  { title: "FAQs", url: "/pages/faqs" },
  { title: "RETURNS / EXCHANGES", url: "/pages/return-exchange-policy" },
  { title: "CONTACT US", url: "/pages/contact" },
  { title: "PRIVACY POLICY", url: "/pages/privacy-policy" },
];
