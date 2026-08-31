import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function sortDeep(obj) {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const sorted = {};
  for (const key of Object.keys(obj).sort((a, b) => a.localeCompare(b, 'en'))) {
    sorted[key] = sortDeep(obj[key]);
  }
  return sorted;
}

function setNested(obj, keyPath, value) {
  const parts = keyPath.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!cur[parts[i]] || typeof cur[parts[i]] !== 'object') cur[parts[i]] = {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}

const EN_OVERRIDES = {
  'template.templateCount': '{{count}} templates',
  'settings.pwaHint':
    "When hosted on gaiasessences.com, install Gaia's Studio on your phone or tablet for quick access.",
  'settings.pwaInstall': "Install Gaia's Studio",
  'settings.pwaManual':
    'Tip: In Chrome or Edge, open the browser menu → Install app (or Add to Home Screen on iPhone).',
  'settings.socialHint':
    "Your Instagram and TikTok usernames — used when we build the public Gaia's Essences site.",
  'products.noProductsHint':
    'Set a retail price on a recipe or click "Add Product" to build your catalog.',
};

const ES = {
  'common.product': 'Producto',
  'common.saving': 'Guardando…',
  'export.applyLabelLanguage': 'Aplicar idioma a la etiqueta',
  'export.labelLanguage': 'Idioma de la etiqueta',
  'export.langEn': 'Inglés (texto de etiqueta)',
  'export.langEs': 'Español (texto de etiqueta)',
  'inventory.appliedFound': '¡Precios actualizados desde la página del proveedor!',
  'inventory.autoFillTitleAi':
    'Lee la página, con Gemini AI como respaldo (tu clave en Ajustes)',
  'inventory.foundByAi': 'La IA encontró en la página:',
  'inventory.inNRecipes': 'en {{count}} receta(s)',
  'inventory.inUseOnly': 'Solo en uso',
  'inventory.inUseOnlyOff': 'Mostrando todos los ingredientes de tu despensa',
  'inventory.inUseOnlyOn':
    'Mostrando solo ingredientes usados en tus recetas guardadas ({{hidden}} ocultos)',
  'inventory.nMissing': '{{count}} sin precio',
  'inventory.noIngredients': 'Tu despensa está vacía.',
  'inventory.noIngredientsHint': 'Ve a Ingredientes para agregar algunos.',
  'inventory.noMatches': 'Nada coincide con los filtros actuales.',
  'inventory.perDropLong': 'por gota',
  'inventory.perGramLong': 'por gramo',
  'inventory.quickSet': 'Ajuste rápido',
  'inventory.quickSetExplain':
    'Asigna la misma base a cada ingrediente de este estante que aún no tenga precio. Puedes afinar cualquier ingrediente después.',
  'inventory.quickSetHeading': 'Ajuste rápido — {{group}}',
  'inventory.quickSetPreview': 'Cada ingrediente sin precio abajo recibe ${{price}} {{unit}}.',
  'inventory.showAll': 'Mostrar todos los ingredientes',
  'inventory.shown': 'mostrados',
  'layers.dragHint': 'Arrastra para reordenar',
  'layers.dragLocked': 'Desbloquea para reordenar',
  'products.addProduct': 'Agregar producto',
  'products.addProductHint': 'Elige una receta para crear un producto.',
  'products.avgMargin': 'Margen de beneficio prom.',
  'products.cogs': 'Costo',
  'products.createProduct': 'Crear producto',
  'products.designLabel': 'Etiqueta',
  'products.filterActive': 'Activos',
  'products.filterAll': 'Todos',
  'products.filterEtsy': 'En Etsy',
  'products.listedOnEtsy': 'Publicado en Etsy',
  'products.etsyListed': 'Publicado',
  'products.etsyDraft': 'Borrador',
  'products.etsyNotListed': 'Sin publicar',
  'products.noLabel': 'Sin diseño de etiqueta',
  'products.noPrice': 'Sin precio',
  'products.noProducts': 'Aún no hay productos',
  'products.noProductsHint':
    'Pon un precio de venta en una receta o haz clic en "Agregar producto" para crear tu catálogo.',
  'products.noRecipes': 'No hay recetas. Crea una receta primero.',
  'products.noResults': 'Ningún producto coincide con tu búsqueda',
  'products.pickRecipe': '— Selecciona una receta —',
  'products.pushEtsy': 'Etsy',
  'products.searchPlaceholder': 'Buscar productos…',
  'products.selectRecipe': 'Receta',
  'products.subtitle':
    'Tu catálogo completo — recetas, etiquetas, precios y estado en Etsy en un solo lugar.',
  'products.title': 'Catálogo de productos',
  'products.totalProducts': 'Total de productos',
  'products.viewRecipe': 'Receta',
  'products.margin': 'Margen:',
  'promptBuilder.chooseRecipe': '— Elige una receta —',
  'promptBuilder.noRecipesHint': 'Aún no hay recetas — crea una en Recetas',
  'promptBuilder.styleSection': 'Estilo de fondo',
  'recipes.active': 'activos',
  'recipes.autoRemix': 'Remix automático',
  'recipes.autoRemixHint':
    'Receta aleatoria de base de glicerina con nombre y beneficio sugeridos por IA',
  'recipes.grossProfit': 'Beneficio bruto',
  'recipes.retailHint': 'Ingresa un precio de venta para ver beneficio y margen.',
  'recipes.retailPrice': 'Precio de venta por barra',
  'recipes.revenueTracker': 'Ingresos y beneficio',
  'reports.allTime': 'Todo el tiempo',
  'reports.cogs': 'Costo',
  'reports.expenseBreakdown': 'Gastos por categoría',
  'reports.expenses': 'Gastos',
  'reports.exportExpenses': 'Exportar gastos',
  'reports.exportInventory': 'Exportar inventario',
  'reports.exportSales': 'Exportar ventas',
  'reports.margin': 'Margen %',
  'reports.monthlyRevenue': 'Ingresos vs gastos mensuales',
  'reports.netProfit': 'Beneficio neto',
  'reports.noDataChart': 'No hay suficientes datos para el gráfico',
  'reports.noExpenses': 'Aún no hay gastos registrados',
  'reports.noProducts': 'No hay productos para analizar',
  'reports.noSales': 'Aún no hay datos de ventas',
  'reports.profitMargins': 'Márgenes de beneficio',
  'reports.retail': 'Venta',
  'reports.revenue': 'Ingresos',
  'reports.subtitle': 'Sigue el rendimiento de tu negocio',
  'reports.thisMonth': 'Este mes',
  'reports.thisYear': 'Este año',
  'reports.title': 'Informes y analítica',
  'reports.topProducts': 'Productos más vendidos',
  'reports.unitsSold': 'Unidades vendidas',
  'settings.etsy': 'Tienda Etsy',
  'settings.etsyApiKey': 'Clave API (keystring)',
  'settings.etsyConfigured': 'Listo para conectar',
  'settings.etsyConnect': 'Conectar con Etsy',
  'settings.etsyConnectFailed': 'No se pudo iniciar la conexión con Etsy.',
  'settings.etsyConnected': 'Conectado',
  'settings.etsyConnectedBtn': 'Conectado',
  'settings.etsyDisconnect': 'Desconectar',
  'settings.etsyDisconnected': 'Sin configurar',
  'settings.etsyExpired': 'Sesión expirada',
  'settings.etsyHint':
    'Conecta tu tienda Etsy para publicar jabones e importar pedidos como Órdenes de trabajo.',
  'settings.etsyNeedKey': 'Agrega primero tu keystring de Etsy.',
  'settings.etsyNeedShopId': 'Agrega primero tu ID de tienda Etsy.',
  'settings.etsyOAuthFailed': 'Falló la conexión con Etsy — inténtalo de nuevo en Ajustes.',
  'settings.etsyOAuthSuccess': '¡Etsy conectado correctamente!',
  'settings.etsyRedirectHint': 'URI de redirección OAuth (regístrala en tu app de Etsy):',
  'settings.etsyRegister': 'Registrarse como desarrollador de Etsy →',
  'settings.etsyShopId': 'ID de tienda',
  'settings.etsyShopName': 'Nombre de tienda (mostrar)',
  'settings.pwa': 'Instalar app',
  'settings.pwaInstalled': 'App instalada',
  'settings.social': 'Redes sociales',
  'shop.activeListings': 'Activos',
  'shop.autoFillNote':
    'Título, descripción, precio y etiquetas se completarán automáticamente desde la receta.',
  'shop.chooseRecipe': 'Elige una receta…',
  'shop.configured': 'Etsy configurado',
  'shop.configuredDesc':
    'Las claves API están presentes, pero la autenticación no está completa. Vuelve a autenticarte.',
  'shop.connectEtsyPrompt': 'Conecta Etsy en Ajustes primero',
  'shop.connected': 'Etsy conectado',
  'shop.connectedDesc': 'Tu tienda Etsy está conectada y lista para sincronizar.',
  'shop.createListing': 'Crear anuncio',
  'shop.createListingBtn': 'Crear anuncio local',
  'shop.createNewListing': 'Crear anuncio nuevo',
  'shop.draftListings': 'Borradores',
  'shop.filterActive': 'Activos',
  'shop.filterAll': 'Todos los estados',
  'shop.filterDraft': 'Borrador',
  'shop.filterInactive': 'Inactivos',
  'shop.goToSettings': 'Ajustes',
  'shop.lastSync': 'Última sync',
  'shop.listingCreated': 'Anuncio creado',
  'shop.loadError': 'Error al cargar datos de la tienda',
  'shop.never': 'Nunca',
  'shop.noListings': 'No se encontraron anuncios',
  'shop.noListingsMatch': 'Prueba ajustar la búsqueda o el filtro.',
  'shop.noListingsPrompt': 'Crea tu primer anuncio de Etsy desde una receta para empezar a vender.',
  'shop.noRecipesDesc': 'Necesitas al menos una receta antes de crear un anuncio.',
  'shop.noRecipesForListing': 'No se encontraron recetas',
  'shop.noSyncHistory': 'Sin actividad de sincronización reciente.',
  'shop.notConnected': 'Etsy desconectado',
  'shop.notConnectedDesc':
    'Tu cuenta Etsy no está conectada. Conéctala en Ajustes para publicar anuncios e importar pedidos.',
  'shop.preview': 'Vista previa',
  'shop.priceLabel': 'Precio objetivo',
  'shop.pullOrders': 'Importar pedidos',
  'shop.pullSuccess': 'Pedidos importados',
  'shop.pushSuccess': 'Anuncio publicado',
  'shop.pushToEtsy': 'Publicar',
  'shop.qty': 'Cant.',
  'shop.reauthenticate': 'Reautenticar',
  'shop.searchListings': 'Buscar anuncios…',
  'shop.selectRecipe': 'Seleccionar receta',
  'shop.subtitle': 'Gestiona tus anuncios de Etsy, sincroniza pedidos y controla la integración.',
  'shop.syncAll': 'Sync completa',
  'shop.syncHistory': 'Historial de sync',
  'shop.syncSuccess': 'Sincronizado con Etsy',
  'shop.synced': 'Sync',
  'shop.title': 'Tienda Etsy',
  'shop.titleLabel': 'Título',
  'shop.totalListings': 'Total de anuncios',
  'template.templateCount': '{{count}} plantillas',
  'workflow.backToBackground': 'Atrás: Fondo',
};

const EXTRA_EN = {
  'shop.stateActive': 'Active',
  'shop.stateDraft': 'Draft',
  'shop.stateInactive': 'Inactive',
  'shop.syncPush': 'Push',
  'shop.syncPull': 'Pull',
  'shop.syncEntityListings': 'listings',
  'shop.syncEntityOrders': 'orders',
  'shop.syncOrdersImported': '{{count}} order(s) imported',
  'shop.syncListingsSummary': '{{created}} created, {{updated}} updated',
  'reports.exportSalesHeaders': 'Order Number,Date,Client,Total',
  'reports.exportExpensesHeaders': 'Date,Supplier,Category,Total',
  'reports.exportInventoryHeaders': 'Ingredient,Stock On Hand,Unit Cost,Total Value',
  'editor.layoutAppliedFromRecipe': 'Label layout applied from recipe',
  'drafts.ariaActiveDraft': 'Active draft in progress',
  'assets.autoImportSuccess': 'Image "{{filename}}" imported from AI!',
  'promptBuilder.recipeLabel': 'Recipe:',
  'promptBuilder.pickCustomColor': 'Pick custom colour',
  'promptBuilder.activeBadge': 'Active',
  'promptBuilder.webviewBack': '← Back',
  'promptBuilder.webviewReload': 'Reload',
  'promptBuilder.selectIngredientFallback': '[select at least one ingredient]',
  'settings.businessNamePlaceholder': "e.g. Gaia's Essences",
  'settings.businessAddressPlaceholder': 'e.g. 1836 Westchester Ave, Unit #282, Bronx, NY 10472',
  'settings.contactPlaceholder':
    "e.g. customercare@gaiasessences.com · https://www.gaiasessences.com/",
  'settings.cloudSyncUrlPlaceholder': 'https://gaiasessences.com/studio/sync/sync.php',
  'settings.ollamaUrlPlaceholder': 'http://192.168.1.50:11434',
  'settings.ollamaModelPlaceholder': 'llama3.2',
  'settings.etsyApiKeyPlaceholder': 'your-etsy-keystring',
  'settings.etsyShopIdPlaceholder': '12345678',
  'settings.etsyShopNamePlaceholder': 'GaiasEssences',
  'settings.socialHandlePlaceholder': 'gaiasessences',
  'settings.instagram': 'Instagram',
  'settings.tiktok': 'TikTok',
  'inventory.supplierUrlPlaceholder': 'https://…',
  'inventory.ariaDeleteSetPurchase': 'Delete set purchase',
  'inventory.andMore': '+{{count}} more',
  'inventory.perDrop': '/drop',
  'inventory.perGram': '/g',
};

Object.assign(ES, {
  'shop.stateActive': 'Activo',
  'shop.stateDraft': 'Borrador',
  'shop.stateInactive': 'Inactivo',
  'shop.syncPush': 'Enviar',
  'shop.syncPull': 'Importar',
  'shop.syncEntityListings': 'anuncios',
  'shop.syncEntityOrders': 'pedidos',
  'shop.syncOrdersImported': '{{count}} pedido(s) importado(s)',
  'shop.syncListingsSummary': '{{created}} creados, {{updated}} actualizados',
  'reports.exportSalesHeaders': 'N.º pedido,Fecha,Cliente,Total',
  'reports.exportExpensesHeaders': 'Fecha,Proveedor,Categoría,Total',
  'reports.exportInventoryHeaders': 'Ingrediente,Stock,Costo unitario,Valor total',
  'editor.layoutAppliedFromRecipe': 'Diseño de etiqueta aplicado desde la receta',
  'drafts.ariaActiveDraft': 'Borrador activo en progreso',
  'assets.autoImportSuccess': '¡Imagen "{{filename}}" importada desde la IA!',
  'promptBuilder.recipeLabel': 'Receta:',
  'promptBuilder.pickCustomColor': 'Elegir color personalizado',
  'promptBuilder.activeBadge': 'Activo',
  'promptBuilder.webviewBack': '← Atrás',
  'promptBuilder.webviewReload': 'Recargar',
  'promptBuilder.selectIngredientFallback': '[elige al menos un ingrediente]',
  'settings.pwaHint': EN_OVERRIDES['settings.pwaHint'],
  'settings.pwaInstall': EN_OVERRIDES['settings.pwaInstall'],
  'settings.pwaManual': EN_OVERRIDES['settings.pwaManual'],
  'settings.socialHint': EN_OVERRIDES['settings.socialHint'],
  'settings.businessNamePlaceholder': 'ej. Gaia\'s Essences',
  'settings.businessAddressPlaceholder': 'ej. 1836 Westchester Ave, Unit #282, Bronx, NY 10472',
  'settings.contactPlaceholder':
    'ej. customercare@gaiasessences.com · https://www.gaiasessences.com/',
  'settings.cloudSyncUrlPlaceholder': 'https://gaiasessences.com/studio/sync/sync.php',
  'settings.ollamaUrlPlaceholder': 'http://192.168.1.50:11434',
  'settings.ollamaModelPlaceholder': 'llama3.2',
  'settings.etsyApiKeyPlaceholder': 'tu-keystring-de-etsy',
  'settings.etsyShopIdPlaceholder': '12345678',
  'settings.etsyShopNamePlaceholder': 'GaiasEssences',
  'settings.socialHandlePlaceholder': 'gaiasessences',
  'settings.instagram': 'Instagram',
  'settings.tiktok': 'TikTok',
  'inventory.supplierUrlPlaceholder': 'https://…',
  'inventory.ariaDeleteSetPurchase': 'Eliminar compra de set',
  'inventory.andMore': '+{{count}} más',
  'inventory.perDrop': '/gota',
  'inventory.perGram': '/g',
});

const missing = JSON.parse(fs.readFileSync(path.join(root, 'scripts/i18n-code-missing.json'), 'utf8'));
const enPath = path.join(root, 'src/i18n/en.json');
const esPath = path.join(root, 'src/i18n/es.json');
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const es = JSON.parse(fs.readFileSync(esPath, 'utf8'));

for (const { key, defaultEn } of missing) {
  const enVal = EN_OVERRIDES[key] ?? defaultEn;
  if (enVal == null || enVal === '') continue;
  setNested(en, key, enVal);
  setNested(es, key, ES[key] ?? enVal);
}

for (const [key, val] of Object.entries(EXTRA_EN)) {
  setNested(en, key, val);
  if (ES[key]) setNested(es, key, ES[key]);
}

fs.writeFileSync(enPath, `${JSON.stringify(sortDeep(en), null, 2)}\n`, 'utf8');
fs.writeFileSync(esPath, `${JSON.stringify(sortDeep(es), null, 2)}\n`, 'utf8');
JSON.parse(fs.readFileSync(enPath, 'utf8'));
JSON.parse(fs.readFileSync(esPath, 'utf8'));
console.log('Merged and validated i18n files');
