// Men's collections mirrored from the reference store's MAN mega-menu.
// `group` drives the header mega-menu columns; `nav: false` collections are
// used by homepage sections and sale tiles but not listed in the menu.
module.exports = [
  { handle: "man", title: "Man", group: null, nav: false },

  { handle: "man-apparel-new-in", title: "New In", group: "apparel" },
  { handle: "man-spring-summer-26", title: "Spring Summer'26", group: "apparel" },
  { handle: "man-shirts", title: "Shirts", group: "apparel" },
  { handle: "man-t-shirts", title: "T-Shirts", group: "apparel" },
  { handle: "man-polo", title: "Polo", group: "apparel" },
  { handle: "man-blazers", title: "Blazers", group: "apparel" },
  { handle: "man-tank-tops", title: "Tank Tops", group: "apparel" },
  { handle: "man-boxers", title: "Boxers", group: "apparel" },
  { handle: "man-pants", title: "Bottoms", group: "apparel" },
  { handle: "man-shorts", title: "Shorts", group: "apparel" },
  { handle: "man-sweaters-cardigans", title: "Sweaters & Cardigans", group: "apparel" },
  { handle: "man-jackets-coats", title: "Jackets & Coats", group: "apparel" },
  { handle: "man-hoodies-sweatshirt", title: "Hoodies & Sweatshirts", group: "apparel" },

  { handle: "man-shoes", title: "Shoes", group: "shoes", nav: false },
  { handle: "man-shoes-new-in", title: "New In", group: "shoes" },
  { handle: "man-boots", title: "Boots", group: "shoes" },
  { handle: "man-loafers", title: "Loafers", group: "shoes" },
  { handle: "man-sneakers", title: "Sneakers", group: "shoes" },
  { handle: "man-lace-ups", title: "Lace-Ups", group: "shoes" },
  { handle: "man-slides", title: "Slides", group: "shoes" },

  { handle: "man-accessories", title: "Accessories", group: "accessories", nav: false },
  { handle: "man-accessories-new-in", title: "New In", group: "accessories" },
  { handle: "man-headwear", title: "Headwear", group: "accessories" },
  { handle: "man-belts", title: "Belts", group: "accessories" },
  { handle: "man-bags", title: "Handbags", group: "accessories" },
  { handle: "man-socks", title: "Socks", group: "accessories" },
  { handle: "man-shoes-accessories", title: "Shoes Accessories", group: "accessories" },

  { handle: "man-meanwhile-pre-fall1-fw-26", title: "New", group: null, nav: false },
  { handle: "polo-safari-shirts", title: "Polos & Safaris", group: null, nav: false },
  { handle: "man-overall-combined", title: "End of Season Sale", group: null, nav: false },
  { handle: "man-overall-40", title: "40% Off", group: null, nav: false },
  { handle: "man-overall-60", title: "60% Off", group: null, nav: false },
  { handle: "man-footwear-combined", title: "Shoes on Sale", group: null, nav: false },
];
