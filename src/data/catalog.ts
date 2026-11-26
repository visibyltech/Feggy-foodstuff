import type { InstallmentFrequency, Product, ProductCategory } from '../types';

export const FEGGY_LOGO_URL = '/assets/aistudio/file_00000000e0dc82438cbf84c694c2d42d_f79511b4.png';

export const CATEGORY_LABELS: Record<ProductCategory | 'all', string> = {
  all: 'All Foodstuffs',
  bundles: 'Food Bundles',
  rice: 'Rice (5kg - 50kg)',
  beans: 'Beans',
  garri: 'Garri',
  palm_oil: 'Palm Oil',
  groundnut_oil: 'Soya & Groundnut Oil',
  vegetable_oil: 'Vegetable Oil',
  yam: 'Yam & Swallow',
  onions: 'Onions',
  tomatoes: 'Tomatoes & Paste',
  pasta_noodles: 'Noodles & Pasta',
  swallow_flour: 'Semolina & Flour',
  meat_fish: 'Meat, Poultry & Fish',
  spices_seasoning: 'Seasoning & Spices',
};

export function formatNgn(amount: number): string {
  return `₦${Math.round(amount).toLocaleString('en-NG')}`;
}

export function getMinimumInstallment(frequency: InstallmentFrequency): number {
  if (frequency === 'daily') return 500;
  if (frequency === 'weekly') return 5000;
  return 10000;
}

export function getPresetAmounts(frequency: InstallmentFrequency, totalTargetNgn: number): number[] {
  if (frequency === 'daily') {
    const base = [500, 1000, 2000, 5000];
    return base.filter((amt) => amt <= totalTargetNgn || amt === 500);
  }
  if (frequency === 'weekly') {
    const base = [5000, 10000, 15000, 25000];
    return base.filter((amt) => amt <= totalTargetNgn || amt === 5000);
  }
  const twoMonths = Math.max(1000, Math.ceil(totalTargetNgn / 2 / 500) * 500);
  const threeMonths = Math.max(1000, Math.ceil(totalTargetNgn / 3 / 500) * 500);
  const fourMonths = Math.max(1000, Math.ceil(totalTargetNgn / 4 / 500) * 500);
  return Array.from(new Set([twoMonths, threeMonths, fourMonths])).sort((a, b) => a - b);
}

export function computePlanSchedule(
  totalTargetNgn: number,
  frequency: InstallmentFrequency,
  installmentAmountNgn: number,
  fromDate: Date = new Date()
) {
  const safeInstallment = Math.min(
    totalTargetNgn,
    Math.max(getMinimumInstallment(frequency), installmentAmountNgn)
  );
  const totalInstallments = Math.max(1, Math.ceil(totalTargetNgn / safeInstallment));
  const remainingAfterFirst = Math.max(0, totalTargetNgn - safeInstallment);
  const remainingSteps = Math.max(0, totalInstallments - 1);

  const daysPerStep = frequency === 'daily' ? 1 : frequency === 'weekly' ? 7 : 30;
  const nextDue = new Date(fromDate);
  nextDue.setDate(nextDue.getDate() + (remainingAfterFirst > 0 ? daysPerStep : 0));

  const completionDate = new Date(fromDate);
  completionDate.setDate(completionDate.getDate() + remainingSteps * daysPerStep);

  return {
    installmentAmountNgn: safeInstallment,
    totalInstallments,
    firstPaymentNgn: safeInstallment,
    remainingAfterFirstNgn: remainingAfterFirst,
    nextDueDate: nextDue.toISOString().slice(0, 10),
    expectedCompletionDate: completionDate.toISOString().slice(0, 10),
  };
}

export function formatReadableDate(isoDate: string): string {
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return parsed.toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// Products & verified photographs imported directly from Supermart.ng
export const INITIAL_NIGERIAN_CATALOG: Product[] = [
  // READY-MADE FOOD BUNDLES
  {
    id: 'sm-bundle-family-pantry',
    name: 'Family Monthly Pantry Food Bundle',
    slug: 'family-monthly-pantry-food-bundle',
    category: 'bundles',
    description:
      'Complete monthly household kitchen pack built from Nigeria’s top staple brands: Royal Stallion 25kg Rice, Nini Honey Beans, Golden Penny Garri 5kg, King’s Vegetable Oil 5L, Palm Oil 5L, De Rica Tomato Paste, and Indomie.',
    imageUrl:
      'https://cdn.shopify.com/s/files/1/0773/4037/7385/files/spcgri545.jpg?v=1699457558',
    isBundle: true,
    bundleItems: [
      'Royal Stallion Parboiled Rice 25 kg',
      'Nini Foods Honey Beans 2 kg',
      'Golden Penny Garri 5 kg',
      "King's Vegetable Oil 5 L",
      'Fresh Red Palm Oil 5 L',
      'De Rica Tomato Paste Sachet 70 g x10',
      'Knorr Chicken Cubes 8 g x50',
    ],
    variants: [
      { label: 'Standard Family Pack', weightKg: 42, priceNgn: 96500, stock: 25 },
      { label: 'Mega 50kg Rice Family Pack', weightKg: 72, priceNgn: 148000, stock: 14 },
    ],
    minPriceNgn: 96500,
    minDailyNgn: 500,
    minWeeklyNgn: 5000,
    featured: true,
    active: true,
  },
  {
    id: 'sm-bundle-student-essential',
    name: 'Bachelor & Student Essentials Bundle',
    slug: 'bachelor-student-essentials-bundle',
    category: 'bundles',
    description:
      'Smart Nigerian pantry starter pack with Caprice 5kg Rice, Garri Ijebu Paint Bucket, Indomie Carton (40 packs), Golden Penny Spaghetti, and Power Vegetable Oil.',
    imageUrl:
      'https://cdn.shopify.com/s/files/1/0773/4037/7385/files/OkeA311.jpg?v=1756131892',
    isBundle: true,
    bundleItems: [
      'Caprice Parboiled Rice 5 kg',
      'Garri - Ijebu (Paint Bucket)',
      'Indomie Instant Noodles Chicken 70 g x40',
      'Golden Penny Spaghetti 500 g x4',
      'Power Vegetable Oil 2.6 L',
      'Maggi Star Seasoning Cubes x100',
    ],
    variants: [
      { label: 'Single Term Box', weightKg: 18, priceNgn: 45500, stock: 35 },
      { label: 'Double Term Box', weightKg: 36, priceNgn: 88000, stock: 16 },
    ],
    minPriceNgn: 45500,
    minDailyNgn: 500,
    minWeeklyNgn: 5000,
    featured: true,
    active: true,
  },

  // RICE (5KG, 10KG, 25KG, 50KG)
  {
    id: 'sm-rice-royal-stallion',
    name: 'Royal Stallion Parboiled Rice',
    slug: 'royal-stallion-parboiled-rice',
    category: 'rice',
    description:
      'Premium long-grain, stone-free Royal Stallion parboiled rice imported for clean Jollof, fried rice, and daily family meals. Choose 5kg, 10kg, 25kg, or 50kg bag.',
    imageUrl:
      'https://cdn.shopify.com/s/files/1/0773/4037/7385/files/spcgri545.jpg?v=1699457558',
    isBundle: false,
    variants: [
      { label: '5 kg', weightKg: 5, priceNgn: 9500, stock: 60 },
      { label: '10 kg', weightKg: 10, priceNgn: 17000, stock: 45 },
      { label: '25 kg', weightKg: 25, priceNgn: 36500, stock: 30 },
      { label: '50 kg', weightKg: 50, priceNgn: 76500, stock: 22 },
    ],
    minPriceNgn: 9500,
    minDailyNgn: 500,
    minWeeklyNgn: 5000,
    featured: true,
    active: true,
  },
  {
    id: 'sm-rice-caprice',
    name: 'Caprice Parboiled Rice',
    slug: 'caprice-parboiled-rice',
    category: 'rice',
    description:
      'Clean, fluffy Caprice long-grain parboiled rice available across 5kg, 10kg, 25kg, and 50kg full bags with Pay Small Small price lock.',
    imageUrl:
      'https://cdn.shopify.com/s/files/1/0773/4037/7385/files/spmt1362.jpg?v=1794594751',
    isBundle: false,
    variants: [
      { label: '5 kg', weightKg: 5, priceNgn: 9500, stock: 55 },
      { label: '10 kg', weightKg: 10, priceNgn: 17000, stock: 40 },
      { label: '25 kg', weightKg: 25, priceNgn: 36000, stock: 28 },
      { label: '50 kg', weightKg: 50, priceNgn: 76500, stock: 18 },
    ],
    minPriceNgn: 9500,
    minDailyNgn: 500,
    minWeeklyNgn: 5000,
    featured: true,
    active: true,
  },
  {
    id: 'sm-rice-big-bull',
    name: 'Big Bull Parboiled Rice',
    slug: 'big-bull-parboiled-rice',
    category: 'rice',
    description:
      'Nigerian-milled Big Bull long-grain parboiled rice, non-sticky and richly fortified for everyday rice dishes.',
    imageUrl:
      'https://cdn.shopify.com/s/files/1/0773/4037/7385/files/SPARNW298.jpg?v=1689903732',
    isBundle: false,
    variants: [
      { label: '5 kg', weightKg: 5, priceNgn: 8230, stock: 50 },
      { label: '10 kg', weightKg: 10, priceNgn: 16375, stock: 34 },
      { label: '25 kg', weightKg: 25, priceNgn: 40320, stock: 20 },
    ],
    minPriceNgn: 8230,
    minDailyNgn: 500,
    minWeeklyNgn: 5000,
    featured: false,
    active: true,
  },
  {
    id: 'sm-rice-ofada-doublet',
    name: 'Double T & Arike Original Ofada Rice',
    slug: 'double-t-arike-original-ofada-rice',
    category: 'rice',
    description:
      'Authentic unpolished local Nigerian Ofada brown rice, hygienically destoned and packaged in 5kg sacks or paint buckets.',
    imageUrl:
      'https://cdn.shopify.com/s/files/1/0773/4037/7385/files/whrt086.jpg?v=1689903851',
    isBundle: false,
    variants: [
      { label: 'Paint Bucket (4L)', weightKg: 4, priceNgn: 16800, stock: 26 },
      { label: '5 kg Bag', weightKg: 5, priceNgn: 19850, stock: 22 },
      { label: '25 kg Sack', weightKg: 25, priceNgn: 94000, stock: 10 },
    ],
    minPriceNgn: 16800,
    minDailyNgn: 500,
    minWeeklyNgn: 5000,
    featured: false,
    active: true,
  },
  {
    id: 'sm-rice-basmati',
    name: 'Tropical Sun Golden Sella Basmati Rice',
    slug: 'tropical-sun-golden-sella-basmati-rice',
    category: 'rice',
    description:
      'Extra-long fragrant Golden Sella Basmati rice for special fried rice, party Jollof, and biryani.',
    imageUrl:
      'https://cdn.shopify.com/s/files/1/0773/4037/7385/files/HBM2224.jpg?v=1756131885',
    isBundle: false,
    variants: [
      { label: '2 kg', weightKg: 2, priceNgn: 12400, stock: 38 },
      { label: '5 kg', weightKg: 5, priceNgn: 27500, stock: 25 },
    ],
    minPriceNgn: 12400,
    minDailyNgn: 500,
    minWeeklyNgn: 5000,
    featured: false,
    active: true,
  },

  // BEANS
  {
    id: 'sm-beans-nini-honey',
    name: 'Nini Foods Oloyin Honey Beans',
    slug: 'nini-foods-oloyin-honey-beans',
    category: 'beans',
    description:
      'Clean, hand-picked Nigerian Oloyin honey beans sealed for freshness. Cooks soft and creamy with natural sweetness.',
    imageUrl:
      'https://cdn.shopify.com/s/files/1/0773/4037/7385/files/spasho2086_8270f73a-7ec6-40ef-827a-d1075b9155e2.jpg?v=1738324726',
    isBundle: false,
    variants: [
      { label: '1 kg', weightKg: 1, priceNgn: 7740, stock: 50 },
      { label: '2 kg', weightKg: 2, priceNgn: 13890, stock: 35 },
      { label: '5 kg Pack', weightKg: 5, priceNgn: 33500, stock: 18 },
    ],
    minPriceNgn: 7740,
    minDailyNgn: 500,
    minWeeklyNgn: 5000,
    featured: true,
    active: true,
  },
  {
    id: 'sm-beans-double-t-brown',
    name: 'Double T & Abebi Brown Beans',
    slug: 'double-t-abebi-brown-beans',
    category: 'beans',
    description:
      'Picked Nigerian drum brown beans ideal for beans porridge, akara, and moi-moi. Clean, stone-free packaging.',
    imageUrl:
      'https://cdn.shopify.com/s/files/1/0773/4037/7385/products/spar10769.jpg?v=1688377892',
    isBundle: false,
    variants: [
      { label: '1 kg', weightKg: 1, priceNgn: 5695, stock: 45 },
      { label: '2 kg', weightKg: 2, priceNgn: 10360, stock: 32 },
      { label: '5 kg Pack', weightKg: 5, priceNgn: 25000, stock: 15 },
    ],
    minPriceNgn: 5695,
    minDailyNgn: 500,
    minWeeklyNgn: 5000,
    featured: false,
    active: true,
  },

  // GARRI
  {
    id: 'sm-garri-ijebu',
    name: 'Ijebu Crispy Garri (Paint Bucket & Bags)',
    slug: 'ijebu-crispy-garri',
    category: 'garri',
    description:
      'Authentic sour-crispy Ijebu garri roasted dry and sifted clean. Great for soaking with groundnuts or making smooth eba.',
    imageUrl:
      'https://cdn.shopify.com/s/files/1/0773/4037/7385/files/rspwxyz31_ba8de2de-955a-492c-9aa2-a0728475ae5c.jpg?v=1757501780',
    isBundle: false,
    variants: [
      { label: 'Paint Bucket (4L)', weightKg: 3.5, priceNgn: 2100, stock: 80 },
      { label: '5 kg Bag', weightKg: 5, priceNgn: 6925, stock: 45 },
      { label: '25 kg Sack', weightKg: 25, priceNgn: 32500, stock: 20 },
    ],
    minPriceNgn: 2100,
    minDailyNgn: 500,
    minWeeklyNgn: 5000,
    featured: true,
    active: true,
  },
  {
    id: 'sm-garri-golden-penny',
    name: 'Golden Penny & Yellow Garri',
    slug: 'golden-penny-yellow-garri',
    category: 'garri',
    description:
      'Hygienically packaged Golden Penny 5kg garri and Delta yellow palm-oil-enriched garri for smooth everyday eba.',
    imageUrl:
      'https://cdn.shopify.com/s/files/1/0773/4037/7385/files/SPRSI72810_b0a7005d-626e-4b54-808f-13da080e4370.jpg?v=1756131822',
    isBundle: false,
    variants: [
      { label: 'Yellow Paint Bucket', weightKg: 3.5, priceNgn: 2800, stock: 60 },
      { label: 'Golden Penny 5 kg', weightKg: 5, priceNgn: 6925, stock: 40 },
      { label: '25 kg Sack', weightKg: 25, priceNgn: 34000, stock: 16 },
    ],
    minPriceNgn: 2800,
    minDailyNgn: 500,
    minWeeklyNgn: 5000,
    featured: false,
    active: true,
  },

  // PALM OIL
  {
    id: 'sm-palm-oil-fresh',
    name: 'Fresh Red Palm Oil',
    slug: 'fresh-red-palm-oil',
    category: 'palm_oil',
    description:
      'Pure, rich Nigerian red palm oil bottled fresh without adulteration. Essential for Egusi, Ogbono, Banga, and traditional stews.',
    imageUrl:
      'https://cdn.shopify.com/s/files/1/0773/4037/7385/files/alt3007.webp?v=1694606291',
    isBundle: false,
    variants: [
      { label: '1.5 Litres', weightKg: 1.5, priceNgn: 3950, stock: 70 },
      { label: '5 Litres Keg', weightKg: 5, priceNgn: 12000, stock: 48 },
      { label: '25 Litres Jerrycan', weightKg: 25, priceNgn: 58000, stock: 15 },
    ],
    minPriceNgn: 3950,
    minDailyNgn: 500,
    minWeeklyNgn: 5000,
    featured: true,
    active: true,
  },
  {
    id: 'sm-palm-oil-okomu',
    name: 'Okomu Banga Red Palm Oil',
    slug: 'okomu-banga-red-palm-oil',
    category: 'palm_oil',
    description:
      'Factory-sealed Okomu Banga pure Nigerian red palm oil with natural Vitamin A and rich aroma.',
    imageUrl:
      'https://cdn.shopify.com/s/files/1/0773/4037/7385/files/spxspy2324.jpg?v=1756131903',
    isBundle: false,
    variants: [
      { label: '2 Litres', weightKg: 2, priceNgn: 9200, stock: 40 },
      { label: '4 Litres', weightKg: 4, priceNgn: 15800, stock: 30 },
    ],
    minPriceNgn: 9200,
    minDailyNgn: 500,
    minWeeklyNgn: 5000,
    featured: false,
    active: true,
  },

  // VEGETABLE OIL
  {
    id: 'sm-oil-kings-vegetable',
    name: "King's Pure Vegetable Oil",
    slug: 'kings-pure-vegetable-oil',
    category: 'vegetable_oil',
    description:
      "Devon King's pure refined palm olein vegetable oil — cholesterol-free, golden clear, and ideal for frying, Jollof rice, and baking.",
    imageUrl:
      'https://cdn.shopify.com/s/files/1/0773/4037/7385/files/spxabc416_king-s_pure_refined_palm_olein_5_l.jpg?v=1688846700',
    isBundle: false,
    variants: [
      { label: '1 Litre', weightKg: 1, priceNgn: 5250, stock: 75 },
      { label: '3 Litres', weightKg: 3, priceNgn: 14765, stock: 45 },
      { label: '5 Litres', weightKg: 5, priceNgn: 23800, stock: 35 },
      { label: '10 Litres', weightKg: 10, priceNgn: 46500, stock: 18 },
    ],
    minPriceNgn: 5250,
    minDailyNgn: 500,
    minWeeklyNgn: 5000,
    featured: true,
    active: true,
  },
  {
    id: 'sm-oil-mamador-vegetable',
    name: 'Mamador Pure Vegetable Oil',
    slug: 'mamador-pure-vegetable-oil',
    category: 'vegetable_oil',
    description:
      'Vitamin-fortified Mamador pure vegetable cooking oil with zero trans fat for crisp frying and tasty Nigerian stews.',
    imageUrl:
      'https://cdn.shopify.com/s/files/1/0773/4037/7385/files/1516643459527_spx257_mamador_pure_vegetable_oil_3-5l.jpg?v=1688846615',
    isBundle: false,
    variants: [
      { label: '1.5 Litres', weightKg: 1.5, priceNgn: 7995, stock: 50 },
      { label: '2.5 Litres', weightKg: 2.5, priceNgn: 13925, stock: 36 },
      { label: '3.5 Litres', weightKg: 3.5, priceNgn: 17290, stock: 28 },
    ],
    minPriceNgn: 7995,
    minDailyNgn: 500,
    minWeeklyNgn: 5000,
    featured: false,
    active: true,
  },
  {
    id: 'sm-oil-power-vegetable',
    name: 'Power Oil Pure Vegetable Oil',
    slug: 'power-oil-pure-vegetable-oil',
    category: 'vegetable_oil',
    description:
      'Triple-filtered, heart-friendly Power Vegetable Oil sealed with tamper-proof cap for healthy daily cooking.',
    imageUrl:
      'https://cdn.shopify.com/s/files/1/0773/4037/7385/files/spmt3150.jpg?v=1688846867',
    isBundle: false,
    variants: [
      { label: '750 ml', weightKg: 0.75, priceNgn: 4150, stock: 65 },
      { label: '2.6 Litres', weightKg: 2.6, priceNgn: 14605, stock: 38 },
      { label: '4.5 Litres', weightKg: 4.5, priceNgn: 22705, stock: 25 },
    ],
    minPriceNgn: 4150,
    minDailyNgn: 500,
    minWeeklyNgn: 5000,
    featured: false,
    active: true,
  },

  // SOYA & GROUNDNUT OIL
  {
    id: 'sm-oil-golden-terra-soya',
    name: 'Golden Terra Pure Soya & Cooking Oil',
    slug: 'golden-terra-pure-soya-cooking-oil',
    category: 'groundnut_oil',
    description:
      'Heart-healthy Golden Terra 100% pure soya oil with high smoke point, clean golden finish, and zero cholesterol.',
    imageUrl:
      'https://cdn.shopify.com/s/files/1/0773/4037/7385/files/spxvl2344_da55a452-5bee-46d2-be02-0f279f404c13.jpg?v=1756131099',
    isBundle: false,
    variants: [
      { label: '750 ml', weightKg: 0.75, priceNgn: 5025, stock: 45 },
      { label: '5 Litres Keg', weightKg: 5, priceNgn: 22085, stock: 30 },
    ],
    minPriceNgn: 5025,
    minDailyNgn: 500,
    minWeeklyNgn: 5000,
    featured: false,
    active: true,
  },
  {
    id: 'sm-oil-golden-penny-soya',
    name: 'Golden Penny Pure Soya Oil',
    slug: 'golden-penny-pure-soya-oil',
    category: 'groundnut_oil',
    description:
      'Light, versatile Golden Penny Soya Cooking Oil rich in Omega-3 & 6 for everyday frying, roasting, and salads.',
    imageUrl:
      'https://cdn.shopify.com/s/files/1/0773/4037/7385/files/spar0798.jpg?v=1689114180',
    isBundle: false,
    variants: [
      { label: '1 Litre', weightKg: 1, priceNgn: 4280, stock: 55 },
      { label: '2.75 Litres', weightKg: 2.75, priceNgn: 13550, stock: 34 },
      { label: '4.5 Litres (Sunola)', weightKg: 4.5, priceNgn: 23020, stock: 22 },
    ],
    minPriceNgn: 4280,
    minDailyNgn: 500,
    minWeeklyNgn: 5000,
    featured: false,
    active: true,
  },

  // YAM & SWALLOW
  {
    id: 'sm-yam-tubers',
    name: 'Fresh Nigerian White Yam Tubers',
    slug: 'fresh-nigerian-white-yam-tubers',
    category: 'yam',
    description:
      'Farm-fresh, starchy Nigerian yam tubers ideal for pounded yam, boiled yam with egg sauce, and crispy yam fries.',
    imageUrl:
      'https://cdn.shopify.com/s/files/1/0773/4037/7385/files/MILE274.jpg?v=1755530650',
    isBundle: false,
    variants: [
      { label: '1 Medium Tuber', weightKg: 3, priceNgn: 4800, stock: 60 },
      { label: '5 Large Tubers', weightKg: 15, priceNgn: 25500, stock: 30 },
      { label: '10 Large Tubers', weightKg: 30, priceNgn: 49500, stock: 16 },
    ],
    minPriceNgn: 4800,
    minDailyNgn: 500,
    minWeeklyNgn: 5000,
    featured: true,
    active: true,
  },
  {
    id: 'sm-yam-ayoola-poundo',
    name: 'Ayoola Foods Poundo Yam Flour',
    slug: 'ayoola-foods-poundo-yam-flour',
    category: 'yam',
    description:
      'Instant smooth Poundo Yam flour made from pure Nigerian yams — ready in 5 minutes with zero lumps.',
    imageUrl:
      'https://cdn.shopify.com/s/files/1/0773/4037/7385/files/aspar094.jpg?v=1689904093',
    isBundle: false,
    variants: [
      { label: '900 g Pack', weightKg: 0.9, priceNgn: 4210, stock: 48 },
      { label: '1.8 kg Pack', weightKg: 1.8, priceNgn: 8315, stock: 35 },
      { label: 'Elubo Isu (Paint Bucket)', weightKg: 4, priceNgn: 13000, stock: 20 },
    ],
    minPriceNgn: 4210,
    minDailyNgn: 500,
    minWeeklyNgn: 5000,
    featured: false,
    active: true,
  },

  // ONIONS
  {
    id: 'sm-onions-red',
    name: 'Fresh Red Onions (1kg & Bowls)',
    slug: 'fresh-red-onions',
    category: 'onions',
    description:
      'Firm, aromatic Nigerian red onions sorted fresh for everyday cooking or bulk kitchen storage.',
    imageUrl:
      'https://cdn.shopify.com/s/files/1/0773/4037/7385/files/spmt1414_a34d4792-be7f-469a-895e-8bfddce3294f.jpg?v=1756131796',
    isBundle: false,
    variants: [
      { label: '1 kg Pack', weightKg: 1, priceNgn: 3900, stock: 70 },
      { label: 'Small Bowl', weightKg: 10, priceNgn: 29500, stock: 22 },
      { label: 'Big Bowl', weightKg: 20, priceNgn: 58500, stock: 12 },
    ],
    minPriceNgn: 3900,
    minDailyNgn: 500,
    minWeeklyNgn: 5000,
    featured: false,
    active: true,
  },

  // TOMATOES & PASTE
  {
    id: 'sm-tomatoes-fresh',
    name: 'Fresh Firm Tomatoes (1kg & Quarter Crate)',
    slug: 'fresh-firm-tomatoes',
    category: 'tomatoes',
    description:
      'Ripe, firm Nigerian plum tomatoes sorted carefully for rich Jollof base, stews, and salads.',
    imageUrl:
      'https://cdn.shopify.com/s/files/1/0773/4037/7385/files/sprnw1142.jpg?v=1689134015',
    isBundle: false,
    variants: [
      { label: '1 kg (Firm)', weightKg: 1, priceNgn: 2900, stock: 65 },
      { label: 'Quarter Crate (Firm)', weightKg: 10, priceNgn: 16500, stock: 24 },
    ],
    minPriceNgn: 2900,
    minDailyNgn: 500,
    minWeeklyNgn: 5000,
    featured: false,
    active: true,
  },
  {
    id: 'sm-tomatoes-derica-gino',
    name: 'De Rica & Gino Tomato Paste Packs',
    slug: 'de-rica-gino-tomato-paste',
    category: 'tomatoes',
    description:
      'Double-concentrated De Rica and Gino tomato paste for deep red Jollof rice and Nigerian stews.',
    imageUrl:
      'https://cdn.shopify.com/s/files/1/0773/4037/7385/files/spcgot1298_de_rica_tomato_paste_850_g.jpg?v=1689130772',
    isBundle: false,
    variants: [
      { label: 'De Rica 70g x10 Sachets', weightKg: 0.7, priceNgn: 2050, stock: 80 },
      { label: 'De Rica 850g Tin', weightKg: 0.85, priceNgn: 1720, stock: 60 },
      { label: 'Gino Party Jollof Mix x10', weightKg: 0.7, priceNgn: 2200, stock: 55 },
    ],
    minPriceNgn: 1720,
    minDailyNgn: 500,
    minWeeklyNgn: 5000,
    featured: false,
    active: true,
  },

  // NOODLES & PASTA
  {
    id: 'sm-noodles-indomie-carton',
    name: 'Indomie Instant Noodles Carton (Chicken & Onion)',
    slug: 'indomie-instant-noodles-carton',
    category: 'pasta_noodles',
    description:
      'Full sealed cartons of Nigeria’s favorite Indomie Chicken, Onion Chicken, and Hungry Man noodles.',
    imageUrl:
      'https://cdn.shopify.com/s/files/1/0773/4037/7385/files/OkeA311.jpg?v=1756131892',
    isBundle: false,
    variants: [
      { label: 'Chicken 70g x40 Carton', weightKg: 2.8, priceNgn: 12200, stock: 50 },
      { label: 'Onion Chicken 70g x40', weightKg: 2.8, priceNgn: 13000, stock: 42 },
      { label: 'Chicken 120g x40 Super Pack', weightKg: 4.8, priceNgn: 18800, stock: 30 },
    ],
    minPriceNgn: 12200,
    minDailyNgn: 500,
    minWeeklyNgn: 5000,
    featured: true,
    active: true,
  },
  {
    id: 'sm-pasta-golden-penny',
    name: 'Golden Penny Spaghetti & Macaroni',
    slug: 'golden-penny-spaghetti-macaroni',
    category: 'pasta_noodles',
    description:
      'Firm, non-soggy Golden Penny durum pasta — available in single packs or 20-pack carton.',
    imageUrl:
      'https://cdn.shopify.com/s/files/1/0773/4037/7385/files/spcgps892_93a348ef-6256-4d99-bda3-ebbd6bd1b7b0.jpg?v=1756131894',
    isBundle: false,
    variants: [
      { label: '500g x5 Packs', weightKg: 2.5, priceNgn: 6475, stock: 60 },
      { label: '500g x20 Carton', weightKg: 10, priceNgn: 25500, stock: 24 },
    ],
    minPriceNgn: 6475,
    minDailyNgn: 500,
    minWeeklyNgn: 5000,
    featured: false,
    active: true,
  },

  // SEMOLINA & FLOUR
  {
    id: 'sm-swallow-honeywell-semo',
    name: 'Honeywell Semolina & Golden Penny Semovita',
    slug: 'honeywell-semolina-golden-penny-semovita',
    category: 'swallow_flour',
    description:
      'Fine, easy-to-stir Semolina and Semovita swallow flour in 1.8kg, 5kg, and 9.5kg family sacks.',
    imageUrl:
      'https://cdn.shopify.com/s/files/1/0773/4037/7385/files/OkeA302.jpg?v=1689119923',
    isBundle: false,
    variants: [
      { label: 'Honeywell 1.8 kg', weightKg: 1.8, priceNgn: 3790, stock: 50 },
      { label: 'Honeywell 5 kg', weightKg: 5, priceNgn: 9350, stock: 38 },
      { label: 'Honeywell 9.5 kg', weightKg: 9.5, priceNgn: 18530, stock: 20 },
    ],
    minPriceNgn: 3790,
    minDailyNgn: 500,
    minWeeklyNgn: 5000,
    featured: false,
    active: true,
  },

  // MEAT, POULTRY & FISH
  {
    id: 'sm-meat-fresh-beef-chicken',
    name: 'Fresh Cut Beef, Chicken & Smoked Panla Fish',
    slug: 'fresh-beef-chicken-smoked-fish',
    category: 'meat_fish',
    description:
      'Clean, market-fresh Nigerian proteins — cut-up beef, assorted meat with shaki, whole chicken, and smoked Panla fish.',
    imageUrl:
      'https://cdn.shopify.com/s/files/1/0773/4037/7385/files/dbk2376.jpg?v=1689020685',
    isBundle: false,
    variants: [
      { label: 'Smoked Panla x10', weightKg: 1, priceNgn: 2800, stock: 40 },
      { label: 'Cut-Up Beef 1 kg', weightKg: 1, priceNgn: 7900, stock: 35 },
      { label: 'Chi Fresh Whole Chicken 1 kg', weightKg: 1, priceNgn: 12550, stock: 28 },
    ],
    minPriceNgn: 2800,
    minDailyNgn: 500,
    minWeeklyNgn: 5000,
    featured: false,
    active: true,
  },

  // SEASONING & SPICES
  {
    id: 'sm-seasoning-knorr-maggi',
    name: 'Knorr Chicken & Maggi Star Seasoning Cubes',
    slug: 'knorr-chicken-maggi-star-cubes',
    category: 'spices_seasoning',
    description:
      'Essential Nigerian kitchen bouillon packs — Maggi Star 100 cubes, Maggi Crayfish 60 cubes, and Knorr Chicken 50 cubes.',
    imageUrl:
      'https://cdn.shopify.com/s/files/1/0773/4037/7385/files/CITD1745.jpg?v=1689105317',
    isBundle: false,
    variants: [
      { label: 'Maggi Star 400g x100', weightKg: 0.4, priceNgn: 1965, stock: 90 },
      { label: 'Knorr Chicken x50', weightKg: 0.4, priceNgn: 2430, stock: 75 },
      { label: 'Maggi Crayfish x60', weightKg: 0.6, priceNgn: 4550, stock: 50 },
    ],
    minPriceNgn: 1965,
    minDailyNgn: 500,
    minWeeklyNgn: 5000,
    featured: false,
    active: true,
  },
];
