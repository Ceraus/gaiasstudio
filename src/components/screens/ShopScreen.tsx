import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useAppStore } from '@/store/useAppStore';
import type { EtsyListing, EtsySyncLog, Recipe } from '@/types';
import {
  etsyListingsRepo, etsySyncLogsRepo,
  buildListingFromRecipe, pushListingToEtsy, pullEtsyOrders, fullEtsySync,
  getConnectionStatus, type EtsyConnectionStatus,
} from '@/lib/etsyApi';
import { ingredientsRepo, recipesRepo } from '@/db/repositories';
import { 
  Store, ShoppingBag, RefreshCw, Upload, Download, Plus, 
  Search, CheckCircle2, AlertTriangle, Clock, 
  Package, Loader2, X, Settings as SettingsIcon, Link as LinkIcon,
  Filter, Sparkles, ClipboardCopy
} from 'lucide-react';
import { draftEtsyListing, draftSocialCaption } from '@/lib/localAi';
import { useLocalAiOnline } from '@/hooks/useLocalAiOnline';

export default function ShopScreen() {
  const { t } = useTranslation();
  const goto = useAppStore((s) => s.goto);
  const settings = useAppStore((s) => s.settings);

  const [connectionStatus, setConnectionStatus] = useState<EtsyConnectionStatus>('disconnected');
  const [listings, setListings] = useState<EtsyListing[]>([]);
  const [logs, setLogs] = useState<EtsySyncLog[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [pushingListingId, setPushingListingId] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterState, setFilterState] = useState<string>('all');
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Local toast state (like WorkOrdersScreen pattern)
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = (msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  };

  const loadData = async () => {
    try {
      const status = getConnectionStatus(settings.etsyShop);
      setConnectionStatus(status);
      
      const [loadedListings, loadedLogs, loadedRecipes] = await Promise.all([
        etsyListingsRepo.all(),
        etsySyncLogsRepo.recent(20),
        recipesRepo.all()
      ]);
      
      setListings(loadedListings || []);
      setLogs((loadedLogs || []).sort((a, b) => b.timestamp - a.timestamp));
      setRecipes(loadedRecipes || []);
    } catch (error) {
      console.error('Error loading shop data', error);
      showToast(t('shop.loadError', 'Failed to load shop data'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const filteredListings = useMemo(() => {
    return listings.filter(l => {
      const matchesSearch = l.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = filterState === 'all' || l.state === filterState;
      return matchesSearch && matchesFilter;
    });
  }, [listings, searchQuery, filterState]);

  const stats = useMemo(() => {
    const total = listings.length;
    const active = listings.filter(l => l.state === 'active').length;
    const draft = listings.filter(l => l.state === 'draft').length;
    const inactive = listings.filter(l => l.state === 'inactive').length;
    const lastSync = logs.length > 0 ? logs[0].timestamp : null;
    return { total, active, draft, inactive, lastSync };
  }, [listings, logs]);

  const handleFullSync = async () => {
    if (connectionStatus === 'disconnected') {
      showToast(t('shop.connectEtsyPrompt', 'Connect Etsy in Settings first'));
      return;
    }
    setSyncing(true);
    try {
      const result = await fullEtsySync(settings.etsyShop);
      showToast(result.message || t('shop.syncSuccess', 'Synced with Etsy'));
      await loadData();
    } catch (err) {
      showToast(String(err));
    } finally {
      setSyncing(false);
    }
  };

  const handlePullOrders = async () => {
    if (connectionStatus === 'disconnected') {
      showToast(t('shop.connectEtsyPrompt', 'Connect Etsy in Settings first'));
      return;
    }
    setPulling(true);
    try {
      const result = await pullEtsyOrders(settings.etsyShop);
      showToast(result.message || t('shop.pullSuccess', 'Pulled orders'));
      await loadData();
    } catch (err) {
      showToast(String(err));
    } finally {
      setPulling(false);
    }
  };

  const handlePushListing = async (listing: EtsyListing) => {
    if (connectionStatus === 'disconnected') {
      showToast(t('shop.connectEtsyPrompt', 'Connect Etsy in Settings first'));
      return;
    }
    setPushingListingId(listing.id);
    try {
      const result = await pushListingToEtsy(listing, settings.etsyShop);
      showToast(result.message || t('shop.pushSuccess', 'Listing pushed'));
      await loadData();
    } catch (err) {
      showToast(String(err));
    } finally {
      setPushingListingId(null);
    }
  };

  const handleCreateListing = async (data: Omit<EtsyListing, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      await etsyListingsRepo.create(data);
      showToast(t('shop.listingCreated', 'Listing created'));
      await loadData();
      setIsCreateModalOpen(false);
    } catch (err) {
      showToast(String(err));
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-gaia-500" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Store className="h-6 w-6 text-gaia-600" />
            {t('shop.title', 'Etsy Shop')}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {t('shop.subtitle', 'Manage your Etsy listings, sync orders, and track your shop integration.')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handlePullOrders}
            disabled={pulling || connectionStatus === 'disconnected'}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 font-medium"
          >
            {pulling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4 text-slate-500" />}
            {t('shop.pullOrders', 'Pull Orders')}
          </button>
          <button
            onClick={handleFullSync}
            disabled={syncing || connectionStatus === 'disconnected'}
            className="flex items-center gap-2 px-4 py-2 bg-gaia-600 text-white rounded-lg hover:bg-gaia-700 transition-colors disabled:opacity-50 shadow-sm font-medium"
          >
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {t('shop.syncAll', 'Full Sync')}
          </button>
        </div>
      </div>

      {/* Main Scrollable Area */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        
        {/* Connection Status Banner */}
        {connectionStatus === 'disconnected' && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-4">
            <AlertTriangle className="h-6 w-6 text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-red-800">{t('shop.notConnected', 'Etsy Disconnected')}</h3>
              <p className="text-sm text-red-600 mt-1">
                {t('shop.notConnectedDesc', 'Your Etsy account is not connected. Connect it in Settings to push listings and pull orders.')}
              </p>
            </div>
            <button 
              onClick={() => goto('settings')}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-700 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium shrink-0 shadow-sm"
            >
              <SettingsIcon className="h-4 w-4" />
              {t('shop.goToSettings', 'Settings')}
            </button>
          </div>
        )}
        {connectionStatus === 'configured' && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-4">
            <LinkIcon className="h-6 w-6 text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-amber-800">{t('shop.configured', 'Etsy Configured')}</h3>
              <p className="text-sm text-amber-700 mt-1">
                {t('shop.configuredDesc', 'API keys are present, but authentication is not complete. Please re-authenticate.')}
              </p>
            </div>
            <button 
              onClick={() => goto('settings')}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-amber-200 text-amber-800 rounded-lg hover:bg-amber-100 transition-colors text-sm font-medium shrink-0 shadow-sm"
            >
              <SettingsIcon className="h-4 w-4" />
              {t('shop.reauthenticate', 'Re-authenticate')}
            </button>
          </div>
        )}
        {connectionStatus === 'connected' && (
          <div className="bg-gaia-50 border border-gaia-200 rounded-xl p-4 flex items-start gap-4">
            <CheckCircle2 className="h-6 w-6 text-gaia-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-gaia-800">{t('shop.connected', 'Etsy Connected')}</h3>
              <p className="text-sm text-gaia-600 mt-1">
                {t('shop.connectedDesc', 'Your Etsy shop is successfully connected and ready to sync.')}
              </p>
            </div>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500 mb-2">
              <ShoppingBag className="h-4 w-4" />
              <h3 className="ui-label font-medium uppercase tracking-wider">{t('shop.totalListings', 'Total Listings')}</h3>
            </div>
            <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-gaia-600 mb-2">
              <CheckCircle2 className="h-4 w-4" />
              <h3 className="ui-label font-medium uppercase tracking-wider">{t('shop.activeListings', 'Active')}</h3>
            </div>
            <p className="text-2xl font-bold text-slate-800">{stats.active}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-amber-500 mb-2">
              <Package className="h-4 w-4" />
              <h3 className="ui-label font-medium uppercase tracking-wider">{t('shop.draftListings', 'Drafts')}</h3>
            </div>
            <p className="text-2xl font-bold text-slate-800">{stats.draft}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500 mb-2">
              <Clock className="h-4 w-4" />
              <h3 className="ui-label font-medium uppercase tracking-wider">{t('shop.lastSync', 'Last Sync')}</h3>
            </div>
            <p className="text-sm font-medium text-slate-800 mt-1">
              {stats.lastSync ? new Date(stats.lastSync).toLocaleString() : t('shop.never', 'Never')}
            </p>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 items-start">
          
          {/* Main Listings Area */}
          <div className="flex-1 w-full space-y-4">
            
            {/* Toolbar */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-4 flex-1">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder={t('shop.searchListings', 'Search listings...')}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gaia-500 text-sm"
                  />
                </div>
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <select
                    value={filterState}
                    onChange={e => setFilterState(e.target.value)}
                    className="pl-9 pr-8 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gaia-500 text-sm appearance-none"
                  >
                    <option value="all">{t('shop.filterAll', 'All States')}</option>
                    <option value="active">{t('shop.filterActive', 'Active')}</option>
                    <option value="draft">{t('shop.filterDraft', 'Draft')}</option>
                    <option value="inactive">{t('shop.filterInactive', 'Inactive')}</option>
                  </select>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors shadow-sm font-medium text-sm whitespace-nowrap"
              >
                <Plus className="h-4 w-4" />
                {t('shop.createListing', 'Create Listing')}
              </button>
            </div>

            {/* Grid */}
            {filteredListings.length === 0 ? (
              <div className="bg-white border border-slate-200 border-dashed rounded-xl p-12 text-center">
                <Store className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-800 mb-2">{t('shop.noListings', 'No Listings Found')}</h3>
                <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto">
                  {searchQuery || filterState !== 'all' 
                    ? t('shop.noListingsMatch', 'Try adjusting your search or filter settings.')
                    : t('shop.noListingsPrompt', 'Create your first Etsy listing from a recipe to get started selling.')}
                </p>
                {!(searchQuery || filterState !== 'all') && (
                  <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gaia-600 text-white rounded-lg hover:bg-gaia-700 transition-colors shadow-sm font-medium"
                  >
                    <Plus className="h-5 w-5" />
                    {t('shop.createListing', 'Create Listing')}
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredListings.map(listing => (
                  <div key={listing.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col">
                    <div className="aspect-video bg-slate-100 border-b border-slate-100 flex items-center justify-center relative">
                      {listing.imageUrl ? (
                        <img src={listing.imageUrl} alt={listing.title} className="w-full h-full object-cover" />
                      ) : (
                        <ShoppingBag className="h-10 w-10 text-slate-300" />
                      )}
                      
                      <div className="absolute top-2 right-2">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full shadow-sm ${
                          listing.state === 'active' ? 'bg-green-100 text-green-700 border border-green-200' :
                          listing.state === 'draft' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                          'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}>
                          {listing.state === 'active'
                            ? t('shop.stateActive', 'Active')
                            : listing.state === 'draft'
                              ? t('shop.stateDraft', 'Draft')
                              : t('shop.stateInactive', 'Inactive')}
                        </span>
                      </div>
                    </div>
                    <div className="p-4 flex-1 flex flex-col">
                      <h4 className="font-semibold text-slate-800 line-clamp-2 mb-1" title={listing.title}>
                        {listing.title}
                      </h4>
                      <div className="flex items-center justify-between mt-auto pt-4">
                        <div>
                          <p className="text-lg font-bold text-slate-800">${listing.price.toFixed(2)}</p>
                          <p className="text-xs text-slate-500">{t('shop.qty', 'Qty')}: {listing.quantity}</p>
                        </div>
                        <button
                          onClick={() => handlePushListing(listing)}
                          disabled={pushingListingId === listing.id || connectionStatus === 'disconnected'}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
                        >
                          {pushingListingId === listing.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                          {t('shop.pushToEtsy', 'Push')}
                        </button>
                      </div>
                      
                      {listing.lastSyncedAt && (
                        <div className="mt-3 text-xs text-slate-400 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {t('shop.synced', 'Synced')} {new Date(listing.lastSyncedAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sync History Sidebar */}
          <div className="w-full lg:w-80 shrink-0 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col">
            <div className="p-4 border-b border-slate-200 bg-slate-50/50 rounded-t-xl flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-slate-500" />
              <h3 className="font-semibold text-slate-800">{t('shop.syncHistory', 'Sync History')}</h3>
            </div>
            <div className="p-4 overflow-y-auto max-h-[600px] flex-1">
              {logs.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">{t('shop.noSyncHistory', 'No recent sync activity.')}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {logs.slice(0, 15).map(log => {
                    const ok = log.errors.length === 0;
                    const operation = t(
                      log.direction === 'push' ? 'shop.syncPush' : 'shop.syncPull',
                      log.direction === 'push' ? 'Push' : 'Pull',
                    ) + ' · ' + t(
                      log.entity === 'orders' ? 'shop.syncEntityOrders' : 'shop.syncEntityListings',
                      log.entity === 'orders' ? 'orders' : 'listings',
                    );
                    const message =
                      log.entity === 'orders'
                        ? t('shop.syncOrdersImported', '{{count}} order(s) imported', {
                            count: log.ordersImported,
                          })
                        : t('shop.syncListingsSummary', '{{created}} created, {{updated}} updated', {
                            created: log.listingsCreated,
                            updated: log.listingsUpdated,
                          });
                    const details = log.errors.length ? log.errors.join('; ') : undefined;
                    return (
                    <div key={log.id} className="relative pl-4 border-l-2 border-slate-100 pb-4 last:pb-0">
                      <div className={`absolute -left-1.5 top-1 h-3 w-3 rounded-full border-2 border-white ${
                        ok ? 'bg-green-500' : 'bg-red-500'
                      }`} />
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="ui-label font-semibold uppercase tracking-wider text-slate-500">
                          {operation}
                        </span>
                        <span className="text-xs text-slate-400 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 leading-snug">
                        {message}
                      </p>
                      {details && (
                        <p className="text-xs text-slate-500 mt-1 truncate">
                          {details}
                        </p>
                      )}
                    </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Create Listing Modal */}
      {isCreateModalOpen && (
        <CreateListingModal
          recipes={recipes}
          onClose={() => setIsCreateModalOpen(false)}
          onSave={handleCreateListing}
          t={t}
        />
      )}

      {toast && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-gaia-700 px-5 py-2.5 text-sm font-medium text-white shadow-lg"
        >
          {toast}
        </div>
      )}
    </div>
  );
}

function CreateListingModal({ 
  recipes, 
  onClose, 
  onSave, 
  t 
}: { 
  recipes: Recipe[], 
  onClose: () => void, 
  onSave: (l: Omit<EtsyListing, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>,
  t: TFunction,
}) {
  const settings = useAppStore((s) => s.settings);
  const [selectedRecipeId, setSelectedRecipeId] = useState('');
  const [loading, setLoading] = useState(false);
  const [draftingAi, setDraftingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [socialCaption, setSocialCaption] = useState<string | null>(null);
  const [ingredientNames, setIngredientNames] = useState<string[]>([]);
  const { online: aiConnected } = useLocalAiOnline(settings);

  const selectedRecipe = useMemo(() => recipes.find(r => r.id === selectedRecipeId), [recipes, selectedRecipeId]);

  useEffect(() => {
    if (!selectedRecipe) {
      setIngredientNames([]);
      setTitle('');
      setDescription('');
      setTagsText('');
      return;
    }
    void ingredientsRepo.all().then((ings) => {
      const names = Object.keys(selectedRecipe.ingredientAmounts ?? {})
        .map((id) => ings.find((i) => i.id === id)?.name)
        .filter((n): n is string => !!n);
      setIngredientNames(names);
      const built = buildListingFromRecipe(selectedRecipe, names, settings.businessName);
      setTitle(built.title);
      setDescription(built.description);
      setTagsText(built.tags.join(', '));
    });
  }, [selectedRecipe, settings.businessName]);

  const handleAiDraft = async () => {
    if (!selectedRecipe) return;
    setDraftingAi(true);
    setAiError(null);
    try {
      const result = await draftEtsyListing(
        selectedRecipe,
        ingredientNames,
        settings,
        settings.businessName,
      );
      if (result.ok && result.data) {
        setTitle(result.data.title);
        setDescription(result.data.description);
        setTagsText(result.data.tags.join(', '));
      } else {
        setAiError(result.error ?? t('shop.aiDraftFailed', 'AI draft failed.'));
      }
    } finally {
      setDraftingAi(false);
    }
  };

  const handleSocialCaption = async () => {
    if (!selectedRecipe) return;
    setDraftingAi(true);
    try {
      const result = await draftSocialCaption(selectedRecipe, settings, 'instagram');
      if (result.ok && result.caption) setSocialCaption(result.caption);
    } finally {
      setDraftingAi(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecipe) return;
    setLoading(true);
    
    try {
      const tags = tagsText.split(',').map((t) => t.trim()).filter(Boolean).slice(0, 13);
      await onSave({
        recipeId: selectedRecipe.id,
        title: title.trim() || selectedRecipe.name,
        description: description.trim(),
        tags,
        price: selectedRecipe.retailPrice ?? 0,
        quantity: 10,
        state: 'draft',
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col overflow-hidden max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-800">{t('shop.createNewListing', 'Create New Listing')}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {recipes.length === 0 ? (
            <div className="text-center py-6">
              <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-800 mb-1">{t('shop.noRecipesForListing', 'No Recipes Found')}</p>
              <p className="text-sm text-slate-500">{t('shop.noRecipesDesc', 'You need to create at least one recipe before you can make a listing.')}</p>
            </div>
          ) : (
            <form id="create-listing-form" onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t('shop.selectRecipe', 'Select Recipe')}
                </label>
                <select
                  required
                  value={selectedRecipeId}
                  onChange={(e) => setSelectedRecipeId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gaia-500 text-sm"
                >
                  <option value="" disabled>{t('shop.chooseRecipe', 'Choose A Recipe...')}</option>
                  {recipes.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>

              {selectedRecipe && (
                <div className="space-y-4">
                  {settings.localAiEnabled && aiConnected && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-800 ring-1 ring-violet-200 hover:bg-violet-100 disabled:opacity-50"
                        onClick={() => void handleAiDraft()}
                        disabled={draftingAi}
                      >
                        {draftingAi ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                        {t('shop.aiDraftListing', 'Draft With AI')}
                      </button>
                      <button
                        type="button"
                        className="flex items-center gap-1 rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100 disabled:opacity-50"
                        onClick={() => void handleSocialCaption()}
                        disabled={draftingAi}
                      >
                        {t('shop.aiSocialCaption', 'Social caption')}
                      </button>
                    </div>
                  )}
                  {aiError && <p className="text-xs text-amber-600">{aiError}</p>}
                  {socialCaption && (
                    <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-700 ring-1 ring-slate-200">
                      <p className="mb-1 font-semibold text-slate-500">{t('shop.socialCaptionPreview', 'Social caption')}</p>
                      <p className="whitespace-pre-wrap">{socialCaption}</p>
                      <button
                        type="button"
                        className="mt-2 flex items-center gap-1 text-gaia-600 hover:underline"
                        onClick={() => void navigator.clipboard.writeText(socialCaption)}
                      >
                        <ClipboardCopy className="h-3 w-3" /> {t('common.copy', 'Copy')}
                      </button>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t('shop.titleLabel', 'Title')}</label>
                    <input className="input text-sm" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={140} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t('shop.descriptionLabel', 'Description')}</label>
                    <textarea className="input min-h-32 text-sm" value={description} onChange={(e) => setDescription(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t('shop.tagsLabel', 'Tags (comma-separated, max 13)')}</label>
                    <input className="input text-sm" value={tagsText} onChange={(e) => setTagsText(e.target.value)} />
                  </div>
                  <div className="text-xs text-slate-500 bg-blue-50 text-blue-700 p-2 rounded border border-blue-100">
                    {t('shop.reviewBeforeSave', 'Review and edit the listing before saving — nothing is pushed to Etsy until you sync.')}
                  </div>
                </div>
              )}
            </form>
          )}
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            {t('common.cancel', 'Cancel')}
          </button>
          <button
            type="submit"
            form="create-listing-form"
            disabled={!selectedRecipeId || loading}
            className="px-4 py-2 text-sm font-medium text-white bg-gaia-600 rounded-lg hover:bg-gaia-700 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {t('shop.createListingBtn', 'Create Local Listing')}
          </button>
        </div>
      </div>
    </div>
  );
}
