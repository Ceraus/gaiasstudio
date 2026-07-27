// ---------------------------------------------------------------------------
// Guided tour definitions.
//
// Each tour is a sequence of steps. A step can:
//   • navigate to a screen first (`screen`),
//   • spotlight an element marked with a matching `data-tour` attribute
//     (`target`) — when the element isn't on screen (e.g. empty state), the
//     step gracefully falls back to a centered card with the same text,
//   • or show a centered card only (no `target`).
//
// All copy lives in i18n under `tour.*` (EN + ES); the keys here are relative
// to that namespace. Tours are replayable any time from the Help hub.
// ---------------------------------------------------------------------------

import type { Screen } from '@/store/useAppStore';

export interface TourStep {
  /** Navigate here before showing the step (omit = stay where we are). */
  screen?: Screen;
  /** data-tour attribute value to spotlight (omit = centered card). */
  target?: string;
  /** i18n key suffix under `tour.` for the step title. */
  titleKey: string;
  titleDefault: string;
  /** i18n key suffix under `tour.` for the step body. */
  bodyKey: string;
  bodyDefault: string;
}

export interface TourDefinition {
  id: string;
  nameKey: string;
  nameDefault: string;
  descriptionKey: string;
  descriptionDefault: string;
  steps: TourStep[];
}

export const TOURS: TourDefinition[] = [
  {
    id: 'getting-started',
    nameKey: 'gettingStartedName',
    nameDefault: 'Getting started',
    descriptionKey: 'gettingStartedDesc',
    descriptionDefault: 'A quick lap around the whole app — five minutes, no reading required afterwards.',
    steps: [
      {
        screen: 'welcome',
        titleKey: 'gs1Title', titleDefault: 'Welcome to your label studio',
        bodyKey: 'gs1Body',
        bodyDefault: 'Everything lives in this one app: design print-ready labels, keep recipes and ingredient prices, track client orders, and watch your profit. Nothing is uploaded — it all stays on this computer.',
      },
      {
        target: 'nav-tabs',
        titleKey: 'gs2Title', titleDefault: 'Your library, one click away',
        bodyKey: 'gs2Body',
        bodyDefault: 'These tabs are the app\u2019s rooms: Workspace (saved designs), Recipes, Ingredients, Inventory (prices & stock), Orders (client sales) and Finances (spending & profit).',
      },
      {
        target: 'new-label',
        titleKey: 'gs3Title', titleDefault: 'Start a label any time',
        bodyKey: 'gs3Body',
        bodyDefault: 'This button begins the guided label flow: pick a real Avery shape, activate your ingredients, choose a recipe, pick a background, refine the design, then print. The app does all the math.',
      },
      {
        screen: 'template',
        target: 'workflow-steps',
        titleKey: 'gs4Title', titleDefault: 'The steps, always visible',
        bodyKey: 'gs4Body',
        bodyDefault: 'Wherever you are in the flow, this bar shows the step you\u2019re on — including Step 1.5 to manage ingredients. Click any step to jump — nothing is ever locked away.',
      },
      {
        screen: 'inventory',
        target: 'inventory-tabs',
        titleKey: 'gs5Title', titleDefault: 'Prices in, costs out',
        bodyKey: 'gs5Body',
        bodyDefault: 'Tap any ingredient and answer two questions — what did you pay, what size was it. The app turns that into cost per gram or drop, and every recipe then knows its exact material cost.',
      },
      {
        screen: 'orders',
        target: 'new-order',
        titleKey: 'gs6Title', titleDefault: 'Sales without spreadsheets',
        bodyKey: 'gs6Body',
        bodyDefault: 'When a client buys, log it here. Marking the order Completed deducts the exact ingredients from stock and saves a PDF receipt for the client — automatically.',
      },
      {
        screen: 'finances',
        titleKey: 'gs7Title', titleDefault: 'Money in, money out',
        bodyKey: 'gs7Body',
        bodyDefault: 'Log purchase receipts here (they can update Inventory prices as you type). With Orders on one side and receipts on the other, the profit panel shows what you actually earned.',
      },
      {
        titleKey: 'gs8Title', titleDefault: 'Help is always here',
        bodyKey: 'gs8Body',
        bodyDefault: 'That\u2019s the lap! Replay this or any deeper tour from the ? button in the header, any time. Tips around the app can be snoozed with \u2715 or turned off with \u201cGot it\u201d.',
      },
    ],
  },
  {
    id: 'design-label',
    nameKey: 'designName',
    nameDefault: 'Design a label',
    descriptionKey: 'designDesc',
    descriptionDefault: 'From blank canvas to a print-ready PDF: templates, backgrounds, the editor, and export.',
    steps: [
      {
        screen: 'template',
        target: 'template-grid',
        titleKey: 'dl1Title', titleDefault: 'Pick a real label shape',
        bodyKey: 'dl1Body',
        bodyDefault: 'These are real Avery products with print-verified measurements. Pick by shape and size — no pixels, no coordinates, no math.',
      },
      {
        screen: 'recipes',
        target: 'recipe-list',
        titleKey: 'dl2Title', titleDefault: 'Choose the recipe',
        bodyKey: 'dl2Body',
        bodyDefault: 'The label pulls its product name, ingredient list and warnings from the recipe you pick here, so back labels write themselves.',
      },
      {
        screen: 'background',
        titleKey: 'dl3Title', titleDefault: 'Choose a background',
        bodyKey: 'dl3Body',
        bodyDefault: 'Use your own photos, free stock search, or the AI tab. AI images sometimes invent borders at the edges — the editor\u2019s dimmed ring shows exactly what gets trimmed so nothing important is lost.',
      },
      {
        screen: 'editor',
        target: 'editor-canvas',
        titleKey: 'dl4Title', titleDefault: 'The canvas',
        bodyKey: 'dl4Body',
        bodyDefault: 'Every design starts with the same four layers: white base, background, a soft legibility overlay, and your text & logo on top. The pink line is the cut; keep important things inside the dashed safe zone.',
      },
      {
        target: 'editor-rail',
        titleKey: 'dl5Title', titleDefault: 'Add things here',
        bodyKey: 'dl5Body',
        bodyDefault: 'Text, shapes, your photos and logo, QR codes and auto-layouts all live in this rail. Everything you add snaps to center with magenta guide lines.',
      },
      {
        target: 'editor-window',
        titleKey: 'dl6Title', titleDefault: 'Properties, layers, history',
        bodyKey: 'dl6Body',
        bodyDefault: 'This floating window is draggable — move it wherever you like. The Layers tab reorders by drag-and-drop, and Ctrl-click selects several layers to group them.',
      },
      {
        screen: 'export',
        target: 'export-pdf',
        titleKey: 'dl7Title', titleDefault: 'Print for real',
        bodyKey: 'dl7Body',
        bodyDefault: 'Export places your label onto the exact Avery grid as a true PDF — never the browser print dialog. Print it at 100% scale and the stickers line up with the die-cuts.',
      },
    ],
  },
  {
    id: 'inventory-pricing',
    nameKey: 'inventoryName',
    nameDefault: 'Inventory & pricing',
    descriptionKey: 'inventoryDesc',
    descriptionDefault: 'Zero-math ingredient costs, bulk pricing, supplier links, and stock tracking.',
    steps: [
      {
        screen: 'inventory',
        target: 'inventory-tabs',
        titleKey: 'inv1Title', titleDefault: 'Two questions per ingredient',
        bodyKey: 'inv1Body',
        bodyDefault: 'Tap any card and enter what you paid and the container size. Cost per gram (or per drop for oils) calculates itself — that\u2019s the whole job.',
      },
      {
        target: 'quick-set',
        titleKey: 'inv2Title', titleDefault: 'Price a whole category at once',
        bodyKey: 'inv2Body',
        bodyDefault: 'Quick Set gives every ingredient in a category one baseline price — perfect for a 36-color mica set. Fine-tune individual ingredients later.',
      },
      {
        titleKey: 'inv3Title', titleDefault: 'Paste a supplier link',
        bodyKey: 'inv3Body',
        bodyDefault: 'Inside the price window you can paste the shop page you bought from — the app reads the price and size for you (the built-in offline AI helps on messy pages) and remembers the link for reordering.',
      },
      {
        titleKey: 'inv4Title', titleDefault: 'Track stock if you want',
        bodyKey: 'inv4Body',
        bodyDefault: 'Enter how much of an ingredient you have on hand and completed Orders subtract usage automatically. Leave it empty to skip tracking — it\u2019s always optional.',
      },
      {
        target: 'shopping-list',
        titleKey: 'inv5Title', titleDefault: 'The shopping list writes itself',
        bodyKey: 'inv5Body',
        bodyDefault: 'Anything out or running low appears here, with a Buy button that opens the saved supplier page and a Restocked button that refills the count.',
      },
    ],
  },
  {
    id: 'orders-receipts',
    nameKey: 'ordersName',
    nameDefault: 'Orders & receipts',
    descriptionKey: 'ordersDesc',
    descriptionDefault: 'Client sales, automatic stock deduction, PDF receipts, and printing the right labels.',
    steps: [
      {
        screen: 'orders',
        target: 'new-order',
        titleKey: 'or1Title', titleDefault: 'A sale becomes an order',
        bodyKey: 'or1Body',
        bodyDefault: 'Type the client\u2019s name (returning clients auto-suggest), pick the soaps and quantities — prices pre-fill from each recipe\u2019s retail price.',
      },
      {
        titleKey: 'or2Title', titleDefault: 'Complete = deduct + receipt',
        bodyKey: 'or2Body',
        bodyDefault: 'Marking an order Completed shows exactly which grams and drops will leave your stock, then saves a professional PDF receipt for the client. Reopen undoes the deduction precisely.',
      },
      {
        titleKey: 'or3Title', titleDefault: 'Print exactly what was ordered',
        bodyKey: 'or3Body',
        bodyDefault: '\u201cPrint labels\u201d queues the saved designs for the ordered soaps onto one ink-saving sheet, with quantities already filled in.',
      },
      {
        titleKey: 'or4Title', titleDefault: 'Regulars are two clicks',
        bodyKey: 'or4Body',
        bodyDefault: '\u201cRepeat\u201d starts a fresh order with the same client and items. The client filter above the list shows anyone\u2019s full history and lifetime total.',
      },
    ],
  },
  {
    id: 'finances',
    nameKey: 'financesName',
    nameDefault: 'Money & profit',
    descriptionKey: 'financesDesc',
    descriptionDefault: 'Expense receipts, price syncing, and the profit picture.',
    steps: [
      {
        screen: 'finances',
        target: 'new-receipt',
        titleKey: 'fi1Title', titleDefault: 'Log what you spend',
        bodyKey: 'fi1Body',
        bodyDefault: 'Every supplier receipt goes here — vendor, date, line items, tax. There\u2019s a CSV export when the accountant asks.',
      },
      {
        titleKey: 'fi2Title', titleDefault: 'Receipts can update prices',
        bodyKey: 'fi2Body',
        bodyDefault: 'Link a receipt line to an ingredient or material and tick \u201csync\u201d — the new price flows straight into Inventory, so costs never go stale.',
      },
      {
        target: 'profit-dashboard',
        titleKey: 'fi3Title', titleDefault: 'The number that matters',
        bodyKey: 'fi3Body',
        bodyDefault: 'Sales from completed Orders minus everything you spent = real profit, by month. Green bars are sales, red are spending.',
      },
    ],
  },
  {
    id: 'printing',
    nameKey: 'printingName',
    nameDefault: 'Printing like a pro',
    descriptionKey: 'printingDesc',
    descriptionDefault: 'Lot codes, batch sheets that waste nothing, and fixing misaligned printers.',
    steps: [
      {
        screen: 'export',
        target: 'lot-code',
        titleKey: 'pr1Title', titleDefault: 'Lot codes for traceability',
        bodyKey: 'pr1Body',
        bodyDefault: 'A tiny batch code (pre-filled from today\u2019s date) prints inside the bottom edge of every label — so you always know which batch and cure date a bar came from. Clear the box to skip it.',
      },
      {
        screen: 'drafts',
        target: 'workspace-batch',
        titleKey: 'pr2Title', titleDefault: 'Mix designs on one sheet',
        bodyKey: 'pr2Body',
        bodyDefault: 'Select several saved designs and print them together on a single Avery sheet — a part-used sheet of sticker paper never goes to waste.',
      },
      {
        screen: 'export',
        target: 'calibration',
        titleKey: 'pr3Title', titleDefault: 'When labels print \u201coff\u201d',
        bodyKey: 'pr3Body',
        bodyDefault: 'If stickers come out shifted, print the calibration page and measure the 1-inch square. If it isn\u2019t exactly 1 inch, the printer is scaling — set it to 100% / Actual size.',
      },
      {
        titleKey: 'pr4Title', titleDefault: 'Always print at 100%',
        bodyKey: 'pr4Body',
        bodyDefault: 'The golden rule: in the print dialog choose \u201cActual size\u201d, never \u201cFit to page\u201d. The PDFs are dimension-exact — any scaling breaks the alignment.',
      },
    ],
  },
];

export function getTour(id: string): TourDefinition | undefined {
  return TOURS.find((t) => t.id === id);
}
