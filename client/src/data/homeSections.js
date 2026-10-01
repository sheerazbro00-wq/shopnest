const file = (name) => `https://cdn.shopify.com/s/files/1/0537/9771/6146/files/${name}`;

const hero = (title, desktop, mobile, collection, extra = {}) => ({
  type: "hero",
  title,
  image: file(desktop),
  mobileImage: file(mobile),
  url: `/collections/${collection}`,
  ...extra,
});

const row = (title, collection, extra = {}) => ({
  type: "featured-collection",
  title,
  collection,
  url: `/collections/${collection}`,
  ...extra,
});

export const homeSections = [
  hero(
    "Breakfast, Again?",
    "top_banner_man_17c12968-f216-4936-8112-b872c6c92452.jpg?v=1789021192",
    "top_banner_man-1_d2d3a457-eb43-4f3e-acfc-3d721df7c6e4.jpg?v=1789021191",
    "man-meanwhile-pre-fall1-fw-26",
    { eager: true }
  ),
  row("New", "man-meanwhile-pre-fall1-fw-26"),
  {
    type: "sale-tiles",
    title: "The End of Season Sale",
    tiles: [
      { label: "View All", url: "/collections/man-overall-combined", image: file("MAS26TP516-BEIGE-HOLIDAY-SHIRT-b4acaa_6.jpg?v=1781093942") },
      { label: "40%", url: "/collections/man-overall-40", image: file("MAS26BT055-KHAKI-RELAXED-PLEATED-PANTS-d3cbbe_5.jpg?v=1783332814") },
      { label: "60%", url: "/collections/man-overall-60", image: file("MAS26TP516-BEIGE-HOLIDAY-SHIRT-b4acaa_6.jpg?v=1781093942") },
      { label: "Shoes on Sale", url: "/collections/man-footwear-combined", image: file("MFW25BT010-BROWN-LEATHER-URBAN-HIKERS-512e1a_3.jpg?v=1762888354") },
    ],
  },
  hero(
    "Shoes",
    "sneakers_man_7510e8d4-b021-4799-8429-11e3affb007e.jpg?v=1789021455",
    "sneakers_man1_b8269e4f-5c72-48bb-abf1-add6f62bd242.jpg?v=1789021454",
    "man-shoes",
    { subtitle: "New" }
  ),
  row("Wearing Now", "man-shoes"),
  hero(
    "Laid Back Luxury",
    "homepage_Man_Polo_8c2c6bc3-e129-4385-9a7f-5fcbbd7f6490.jpg?v=1789020321",
    "homepage_Man_Polo-1_c04e6c68-0dcf-4820-8707-ed7d6d898496.jpg?v=1789020321",
    "polo-safari-shirts",
    { subtitle: "New", titleScale: 0.9 }
  ),
  row("Polos & Safaris", "polo-safari-shirts"),
  hero(
    "Soft Lounge Fits",
    "MAN_TSHIRTS_629ea0fa-275d-4782-87cb-03e91cd0f65a.jpg?v=1789021644",
    "MAN_TSHIRTS-1_9daa4652-ef69-4750-a836-8fc3013c9ff5.jpg?v=1789021647",
    "man-t-shirts",
    { subtitle: "New" }
  ),
  row("T-Shirts", "man-t-shirts"),
  hero(
    "New Season, New Styles",
    "Man_shirts_desk_7c8ab14b-62a9-4036-a18b-721e7d0b7933.jpg?v=1788416747",
    "Man_Shirts_mob_b14fb0ea-91ad-482b-afe6-fc7def752239.jpg?v=1788416752",
    "man-shirts"
  ),
  row("Shirts", "man-shirts"),
  hero(
    "Bottoms",
    "MAN_JEANS_PANTS_3b8e3b3a-9d9f-44c6-8a1a-2c5f5f5ef275.jpg?v=1789021754",
    "MAN_JEANS_PANTS-1_6bb9a8fa-825a-48e5-8ec6-6acc06acc7ec.jpg?v=1789021754",
    "man-pants",
    { subtitle: "New" }
  ),
  row("", "man-pants"),
];
