// ---------------------------------------------------------------------------
// Modular, combinable benefit phrases.
// Each entry is generic enough to apply to many individual ingredients yet
// specific enough to communicate real value on a label.
//
// HOW TO USE
// ──────────
// Pick a single phrase for a simple ingredient description, or combine
// two phrases from different categories for a richer multi-benefit label.
// Every phrase is written in plain English suitable for non-technical shoppers.
// ---------------------------------------------------------------------------

export interface BenefitEntry {
  id: string;
  category: string;
  label: string;
}

export const MODULAR_BENEFITS: BenefitEntry[] = [

  // ── MOISTURIZING ────────────────────────────────────────────────────────
  { id: 'moist-01', category: 'Moisturizing', label: 'Deeply moisturizes and softens skin' },
  { id: 'moist-02', category: 'Moisturizing', label: 'Locks in moisture for all-day hydration' },
  { id: 'moist-03', category: 'Moisturizing', label: 'Restores the skin\'s natural moisture barrier' },
  { id: 'moist-04', category: 'Moisturizing', label: 'Lightweight hydration without greasiness' },
  { id: 'moist-05', category: 'Moisturizing', label: 'Rich emollient that nourishes dry patches' },
  { id: 'moist-06', category: 'Moisturizing', label: 'Draws moisture from the air into the skin' },
  { id: 'moist-07', category: 'Moisturizing', label: 'Intensely hydrating for very dry skin' },
  { id: 'moist-08', category: 'Moisturizing', label: 'Seals in moisture without feeling heavy' },
  { id: 'moist-09', category: 'Moisturizing', label: 'Quenches thirsty skin with lasting hydration' },
  { id: 'moist-10', category: 'Moisturizing', label: 'Melts into skin for immediate comfort and softness' },

  // ── CLEANSING ────────────────────────────────────────────────────────────
  { id: 'clean-01', category: 'Cleansing', label: 'Gently cleanses without stripping natural oils' },
  { id: 'clean-02', category: 'Cleansing', label: 'Creates a rich, creamy lather' },
  { id: 'clean-03', category: 'Cleansing', label: 'Removes impurities while maintaining pH balance' },
  { id: 'clean-04', category: 'Cleansing', label: 'Mild cleansing action suitable for sensitive skin' },
  { id: 'clean-05', category: 'Cleansing', label: 'Deep-cleanses pores and removes excess sebum' },
  { id: 'clean-06', category: 'Cleansing', label: 'Produces a silky, conditioning lather' },
  { id: 'clean-07', category: 'Cleansing', label: 'Rinses clean and leaves no residue' },
  { id: 'clean-08', category: 'Cleansing', label: 'Effective yet gentle for daily use' },
  { id: 'clean-09', category: 'Cleansing', label: 'Lifts dirt and makeup without disrupting the skin barrier' },
  { id: 'clean-10', category: 'Cleansing', label: 'Dense, fluffy lather for a luxurious wash' },

  // ── SOOTHING & CALMING ───────────────────────────────────────────────────
  { id: 'sooth-01', category: 'Soothing', label: 'Soothes redness and irritation on contact' },
  { id: 'sooth-02', category: 'Soothing', label: 'Calms sensitive and reactive skin types' },
  { id: 'sooth-03', category: 'Soothing', label: 'Anti-inflammatory properties reduce skin discomfort' },
  { id: 'sooth-04', category: 'Soothing', label: 'Relieves itching and minor skin irritations' },
  { id: 'sooth-05', category: 'Soothing', label: 'Gentle enough for baby-soft skin' },
  { id: 'sooth-06', category: 'Soothing', label: 'Instantly calms wind-burned and sun-kissed skin' },
  { id: 'sooth-07', category: 'Soothing', label: 'Reduces inflammation and skin sensitivity' },
  { id: 'sooth-08', category: 'Soothing', label: 'Ideal for eczema, rosacea, and reactive skin' },
  { id: 'sooth-09', category: 'Soothing', label: 'Cools and comforts irritated, overworked skin' },
  { id: 'sooth-10', category: 'Soothing', label: 'Naturally calming — no harsh chemicals needed' },

  // ── ANTI-AGING ───────────────────────────────────────────────────────────
  { id: 'age-01', category: 'Anti-aging', label: 'Rich in antioxidants that fight free radicals' },
  { id: 'age-02', category: 'Anti-aging', label: 'Boosts collagen synthesis for firmer skin' },
  { id: 'age-03', category: 'Anti-aging', label: 'Minimizes the appearance of fine lines' },
  { id: 'age-04', category: 'Anti-aging', label: 'Improves skin elasticity and resilience' },
  { id: 'age-05', category: 'Anti-aging', label: 'Promotes cell renewal for a youthful glow' },
  { id: 'age-06', category: 'Anti-aging', label: 'Plumps and firms for a smoother, lifted look' },
  { id: 'age-07', category: 'Anti-aging', label: 'Fights oxidative stress that ages skin' },
  { id: 'age-08', category: 'Anti-aging', label: 'Softens crow\'s feet and expression lines' },
  { id: 'age-09', category: 'Anti-aging', label: 'Restores suppleness to mature, dry skin' },
  { id: 'age-10', category: 'Anti-aging', label: 'Potent cell-regenerating action for renewed skin' },

  // ── BRIGHTENING ──────────────────────────────────────────────────────────
  { id: 'bright-01', category: 'Brightening', label: 'Evens skin tone and reduces hyperpigmentation' },
  { id: 'bright-02', category: 'Brightening', label: 'Boosts radiance for a luminous complexion' },
  { id: 'bright-03', category: 'Brightening', label: 'Fades dark spots and discoloration with regular use' },
  { id: 'bright-04', category: 'Brightening', label: 'Vitamin-rich formula for a healthy, lit-from-within glow' },
  { id: 'bright-05', category: 'Brightening', label: 'Reveals fresh, brighter skin underneath' },
  { id: 'bright-06', category: 'Brightening', label: 'Visibly reduces dullness and uneven tone' },
  { id: 'bright-07', category: 'Brightening', label: 'Natural AHA action for a polished, glowing finish' },
  { id: 'bright-08', category: 'Brightening', label: 'Sun-spot and age-spot fading over time' },

  // ── EXFOLIATING ──────────────────────────────────────────────────────────
  { id: 'exfo-01', category: 'Exfoliating', label: 'Gently exfoliates to reveal smoother skin' },
  { id: 'exfo-02', category: 'Exfoliating', label: 'Removes dead skin cells and unclogs pores' },
  { id: 'exfo-03', category: 'Exfoliating', label: 'Softens rough patches on hands, feet, and body' },
  { id: 'exfo-04', category: 'Exfoliating', label: 'Physical exfoliant that polishes without micro-tears' },
  { id: 'exfo-05', category: 'Exfoliating', label: 'Sloughs off dry, flaky skin effortlessly' },
  { id: 'exfo-06', category: 'Exfoliating', label: 'Chemical exfoliation dissolves dead skin gently' },
  { id: 'exfo-07', category: 'Exfoliating', label: 'Buffs skin smooth for better ingredient absorption' },
  { id: 'exfo-08', category: 'Exfoliating', label: 'Immediate improvement in skin texture after one use' },
  { id: 'exfo-09', category: 'Exfoliating', label: 'Refines enlarged pores for a smoother surface' },

  // ── HEALING & REPAIR ─────────────────────────────────────────────────────
  { id: 'heal-01', category: 'Healing', label: 'Supports skin repair and wound healing' },
  { id: 'heal-02', category: 'Healing', label: 'Reduces the appearance of scars and blemishes' },
  { id: 'heal-03', category: 'Healing', label: 'Promotes healthy cell regeneration' },
  { id: 'heal-04', category: 'Healing', label: 'Antimicrobial properties protect against bacteria' },
  { id: 'heal-05', category: 'Healing', label: 'Supports the skin\'s natural healing process' },
  { id: 'heal-06', category: 'Healing', label: 'Accelerates recovery from dry, cracked skin' },
  { id: 'heal-07', category: 'Healing', label: 'Reduces the look of stretch marks over time' },
  { id: 'heal-08', category: 'Healing', label: 'Naturally antibacterial without harsh preservatives' },
  { id: 'heal-09', category: 'Healing', label: 'Fortifies and strengthens a compromised skin barrier' },

  // ── BALANCING ────────────────────────────────────────────────────────────
  { id: 'bal-01', category: 'Balancing', label: 'Balances oily and combination skin types' },
  { id: 'bal-02', category: 'Balancing', label: 'Regulates sebum production without drying' },
  { id: 'bal-03', category: 'Balancing', label: 'Keeps skin in its optimal pH range' },
  { id: 'bal-04', category: 'Balancing', label: 'Mattifies without stripping natural oils' },
  { id: 'bal-05', category: 'Balancing', label: 'Normalizes oily T-zones while moisturizing dry areas' },
  { id: 'bal-06', category: 'Balancing', label: 'Restores harmony to stressed, unbalanced skin' },

  // ── NOURISHING ───────────────────────────────────────────────────────────
  { id: 'nour-01', category: 'Nourishing', label: 'Packed with vitamins, minerals, and fatty acids' },
  { id: 'nour-02', category: 'Nourishing', label: 'Delivers essential nutrients deep into the skin' },
  { id: 'nour-03', category: 'Nourishing', label: 'Rich in omega fatty acids that feed the skin barrier' },
  { id: 'nour-04', category: 'Nourishing', label: 'Protein-rich formula that strengthens skin structure' },
  { id: 'nour-05', category: 'Nourishing', label: 'Vitamin E and C complex for superior skin nutrition' },
  { id: 'nour-06', category: 'Nourishing', label: 'Feeds skin the minerals it needs to thrive' },
  { id: 'nour-07', category: 'Nourishing', label: 'Dense nutrition for winter-damaged and dry skin' },
  { id: 'nour-08', category: 'Nourishing', label: 'Bioavailable nutrients absorbed directly by skin cells' },

  // ── DETOXIFYING ──────────────────────────────────────────────────────────
  { id: 'detox-01', category: 'Detoxifying', label: 'Draws out impurities and toxins from pores' },
  { id: 'detox-02', category: 'Detoxifying', label: 'Absorbs excess oils and purifies the skin surface' },
  { id: 'detox-03', category: 'Detoxifying', label: 'Mineralizes skin with trace elements from the earth' },
  { id: 'detox-04', category: 'Detoxifying', label: 'Activated deep cleanse for congested skin' },
  { id: 'detox-05', category: 'Detoxifying', label: 'Purges pore-clogging debris from beneath the surface' },
  { id: 'detox-06', category: 'Detoxifying', label: 'Pollution-fighting cleanse for urban skin' },
  { id: 'detox-07', category: 'Detoxifying', label: 'Resets congested skin to a clean, fresh state' },
  { id: 'detox-08', category: 'Detoxifying', label: 'Mineral-rich purification ritual for weekly use' },

  // ── ACNE & BLEMISH CONTROL ───────────────────────────────────────────────
  { id: 'acne-01', category: 'Acne & Blemish', label: 'Targets blemishes without drying the surrounding skin' },
  { id: 'acne-02', category: 'Acne & Blemish', label: 'Antibacterial action helps prevent future breakouts' },
  { id: 'acne-03', category: 'Acne & Blemish', label: 'Unclogs pores and reduces blackheads' },
  { id: 'acne-04', category: 'Acne & Blemish', label: 'Reduces excess oil that leads to acne' },
  { id: 'acne-05', category: 'Acne & Blemish', label: 'Calms inflamed spots and reduces redness' },
  { id: 'acne-06', category: 'Acne & Blemish', label: 'Non-comedogenic — will not clog pores' },
  { id: 'acne-07', category: 'Acne & Blemish', label: 'Fights acne-causing bacteria naturally' },
  { id: 'acne-08', category: 'Acne & Blemish', label: 'Shrinks the look of active blemishes overnight' },
  { id: 'acne-09', category: 'Acne & Blemish', label: 'Clears breakouts while keeping skin hydrated' },

  // ── MINERAL-RICH ─────────────────────────────────────────────────────────
  { id: 'min-01', category: 'Mineral-Rich', label: 'Infused with skin-loving minerals from the earth' },
  { id: 'min-02', category: 'Mineral-Rich', label: 'Dead Sea minerals replenish depleted skin' },
  { id: 'min-03', category: 'Mineral-Rich', label: 'Rich in magnesium, calcium, and potassium' },
  { id: 'min-04', category: 'Mineral-Rich', label: 'Volcanic minerals deep-cleanse and tone' },
  { id: 'min-05', category: 'Mineral-Rich', label: 'Trace minerals improve skin texture over time' },
  { id: 'min-06', category: 'Mineral-Rich', label: 'Marine and earth minerals balance stressed skin' },
  { id: 'min-07', category: 'Mineral-Rich', label: 'Mineral silicates smooth and firm the complexion' },

  // ── DEODORIZING ──────────────────────────────────────────────────────────
  { id: 'deod-01', category: 'Deodorizing', label: 'Naturally neutralizes odor-causing bacteria' },
  { id: 'deod-02', category: 'Deodorizing', label: 'Long-lasting freshness without aluminium' },
  { id: 'deod-03', category: 'Deodorizing', label: 'Absorbs odor naturally throughout the day' },
  { id: 'deod-04', category: 'Deodorizing', label: 'Charcoal-powered odor elimination' },
  { id: 'deod-05', category: 'Deodorizing', label: 'Baking soda neutralizes rather than masks odors' },
  { id: 'deod-06', category: 'Deodorizing', label: 'Keeps skin fresh for longer between washes' },

  // ── CONDITIONING ─────────────────────────────────────────────────────────
  { id: 'cond-01', category: 'Conditioning', label: 'Leaves skin feeling silky and conditioned' },
  { id: 'cond-02', category: 'Conditioning', label: 'Conditions while you cleanse' },
  { id: 'cond-03', category: 'Conditioning', label: 'Milk proteins deeply condition and soften' },
  { id: 'cond-04', category: 'Conditioning', label: 'Silk amino acids leave a luxurious, smooth finish' },
  { id: 'cond-05', category: 'Conditioning', label: 'Honey humectants give lasting softness' },
  { id: 'cond-06', category: 'Conditioning', label: 'Conditions even the most sensitive, delicate skin' },
  { id: 'cond-07', category: 'Conditioning', label: 'Leaves a light, non-greasy conditioning film' },
  { id: 'cond-08', category: 'Conditioning', label: 'Dramatically improves skin\'s texture with regular use' },

  // ── WARMING & STIMULATING ────────────────────────────────────────────────
  { id: 'warm-01', category: 'Warming & Stimulating', label: 'Warming sensation stimulates circulation' },
  { id: 'warm-02', category: 'Warming & Stimulating', label: 'Invigorating spice blend awakens the senses' },
  { id: 'warm-03', category: 'Warming & Stimulating', label: 'Naturally heats on contact to relieve muscle tension' },
  { id: 'warm-04', category: 'Warming & Stimulating', label: 'Boosts blood flow for healthier-looking skin' },
  { id: 'warm-05', category: 'Warming & Stimulating', label: 'Stimulates lymphatic drainage to reduce puffiness' },
  { id: 'warm-06', category: 'Warming & Stimulating', label: 'Energizing morning wash to start the day' },

  // ── COOLING & REFRESHING ─────────────────────────────────────────────────
  { id: 'cool-01', category: 'Cooling & Refreshing', label: 'Instantly cools and refreshes overheated skin' },
  { id: 'cool-02', category: 'Cooling & Refreshing', label: 'Icy-fresh sensation that wakes up tired skin' },
  { id: 'cool-03', category: 'Cooling & Refreshing', label: 'Soothes sunburn and heat-stressed skin' },
  { id: 'cool-04', category: 'Cooling & Refreshing', label: 'Reduces the appearance of puffiness and swelling' },
  { id: 'cool-05', category: 'Cooling & Refreshing', label: 'Refreshing after workouts and outdoor activities' },
  { id: 'cool-06', category: 'Cooling & Refreshing', label: 'Cooling tingle that lasts beyond the rinse' },

  // ── PROTECTIVE ───────────────────────────────────────────────────────────
  { id: 'prot-01', category: 'Protective', label: 'Forms a protective barrier against environmental stressors' },
  { id: 'prot-02', category: 'Protective', label: 'Shields skin from wind, cold, and dry air' },
  { id: 'prot-03', category: 'Protective', label: 'Antioxidant defense against UV-induced oxidative stress' },
  { id: 'prot-04', category: 'Protective', label: 'Locks in natural moisture while blocking pollutants' },
  { id: 'prot-05', category: 'Protective', label: 'Strengthens the skin barrier against daily damage' },
  { id: 'prot-06', category: 'Protective', label: 'First line of defense for sensitive skin types' },
  { id: 'prot-07', category: 'Protective', label: 'Creates a breathable shield that lasts all day' },

  // ── SCALP & HAIR ─────────────────────────────────────────────────────────
  { id: 'hair-01', category: 'Hair & Scalp', label: 'Strengthens hair from root to tip' },
  { id: 'hair-02', category: 'Hair & Scalp', label: 'Conditions and adds brilliant shine to dull hair' },
  { id: 'hair-03', category: 'Hair & Scalp', label: 'Promotes healthy scalp circulation and growth' },
  { id: 'hair-04', category: 'Hair & Scalp', label: 'Reduces dandruff and scalp dryness' },
  { id: 'hair-05', category: 'Hair & Scalp', label: 'Tames frizz and adds manageability' },
  { id: 'hair-06', category: 'Hair & Scalp', label: 'Gently cleanses the scalp without stripping hair' },
  { id: 'hair-07', category: 'Hair & Scalp', label: 'Stimulates follicles to encourage thicker growth' },

  // ── AROMATHERAPY — CALMING ───────────────────────────────────────────────
  { id: 'arom-calm-01', category: 'Aromatherapy — Calming', label: 'Calming lavender aroma melts away stress' },
  { id: 'arom-calm-02', category: 'Aromatherapy — Calming', label: 'Floral fragrance that soothes the mind and spirit' },
  { id: 'arom-calm-03', category: 'Aromatherapy — Calming', label: 'Gentle herbal scent for a peaceful wind-down' },
  { id: 'arom-calm-04', category: 'Aromatherapy — Calming', label: 'Sleep-promoting aromatherapy for bedtime rituals' },
  { id: 'arom-calm-05', category: 'Aromatherapy — Calming', label: 'Eases anxiety with proven botanical scents' },

  // ── AROMATHERAPY — UPLIFTING ─────────────────────────────────────────────
  { id: 'arom-up-01', category: 'Aromatherapy — Uplifting', label: 'Uplifting citrus scent that energizes the senses' },
  { id: 'arom-up-02', category: 'Aromatherapy — Uplifting', label: 'Invigorating peppermint that refreshes and focuses' },
  { id: 'arom-up-03', category: 'Aromatherapy — Uplifting', label: 'Bright, zesty aroma for a morning mood boost' },
  { id: 'arom-up-04', category: 'Aromatherapy — Uplifting', label: 'Energizing eucalyptus clears the mind' },
  { id: 'arom-up-05', category: 'Aromatherapy — Uplifting', label: 'Fresh botanical blend sparks clarity and focus' },

  // ── AROMATHERAPY — GROUNDING ─────────────────────────────────────────────
  { id: 'arom-grnd-01', category: 'Aromatherapy — Grounding', label: 'Warm, earthy notes that ground and comfort' },
  { id: 'arom-grnd-02', category: 'Aromatherapy — Grounding', label: 'Deep woodsy scent for meditation and mindfulness' },
  { id: 'arom-grnd-03', category: 'Aromatherapy — Grounding', label: 'Smoky, sacred resin for spiritual grounding' },
  { id: 'arom-grnd-04', category: 'Aromatherapy — Grounding', label: 'Vetiver and patchouli: earthy depth and calm' },
  { id: 'arom-grnd-05', category: 'Aromatherapy — Grounding', label: 'Forest-bathing in a bar — cedarwood and pine' },

  // ── AROMATHERAPY — ROMANTIC ──────────────────────────────────────────────
  { id: 'arom-rom-01', category: 'Aromatherapy — Romantic', label: 'Sultry rose and jasmine for a romantic ritual' },
  { id: 'arom-rom-02', category: 'Aromatherapy — Romantic', label: 'Sensual floral blend that lingers on the skin' },
  { id: 'arom-rom-03', category: 'Aromatherapy — Romantic', label: 'Warm sandalwood and vanilla for intimate moments' },
  { id: 'arom-rom-04', category: 'Aromatherapy — Romantic', label: 'Ylang ylang and neroli: the scent of pure luxury' },
  { id: 'arom-rom-05', category: 'Aromatherapy — Romantic', label: 'Exotic floral notes that captivate and inspire' },

  // ── SENSITIVE SKIN SPECIFIC ──────────────────────────────────────────────
  { id: 'sens-01', category: 'Sensitive Skin', label: 'Specially formulated for the most sensitive skin' },
  { id: 'sens-02', category: 'Sensitive Skin', label: 'Free from synthetic fragrances, dyes, and sulfates' },
  { id: 'sens-03', category: 'Sensitive Skin', label: 'Dermatologist-approved, irritant-free formula' },
  { id: 'sens-04', category: 'Sensitive Skin', label: 'Calms reactive skin without triggering flare-ups' },
  { id: 'sens-05', category: 'Sensitive Skin', label: 'Hypoallergenic — tested for tolerance on delicate skin' },
  { id: 'sens-06', category: 'Sensitive Skin', label: 'Safe for eczema, psoriasis, and rosacea sufferers' },
  { id: 'sens-07', category: 'Sensitive Skin', label: 'No parabens, no SLS — nothing harsh, ever' },

  // ── SUN-DAMAGED & POST-EXPOSURE SKIN ────────────────────────────────────
  { id: 'sun-01', category: 'Sun-Damaged Skin', label: 'Repairs and reverses sun-induced skin damage' },
  { id: 'sun-02', category: 'Sun-Damaged Skin', label: 'Fades sunspots and uneven tan lines' },
  { id: 'sun-03', category: 'Sun-Damaged Skin', label: 'Vitamin C complex reverses photo-aging' },
  { id: 'sun-04', category: 'Sun-Damaged Skin', label: 'Immediately soothes and cools after sun exposure' },
  { id: 'sun-05', category: 'Sun-Damaged Skin', label: 'Rebuilds the moisture lost during sun exposure' },

  // ── NATURAL & CLEAN BEAUTY ───────────────────────────────────────────────
  { id: 'nat-01', category: 'Natural & Clean', label: '100% plant-based ingredients, nothing synthetic' },
  { id: 'nat-02', category: 'Natural & Clean', label: 'Clean beauty — what you can\'t pronounce isn\'t in here' },
  { id: 'nat-03', category: 'Natural & Clean', label: 'Sustainably sourced, ethically made' },
  { id: 'nat-04', category: 'Natural & Clean', label: 'Earth-friendly formula in a zero-waste bar' },
  { id: 'nat-05', category: 'Natural & Clean', label: 'Cruelty-free and vegan-friendly' },
  { id: 'nat-06', category: 'Natural & Clean', label: 'Made with certified organic ingredients' },
  { id: 'nat-07', category: 'Natural & Clean', label: 'No microplastics — kind to your skin and the ocean' },

  // ── PROBLEM SKIN (DRY/CRACKED/ROUGH) ────────────────────────────────────
  { id: 'prob-01', category: 'Problem Skin', label: 'Intensely repairs cracked heels and dry elbows' },
  { id: 'prob-02', category: 'Problem Skin', label: 'Relieves the itch and flakiness of dry skin conditions' },
  { id: 'prob-03', category: 'Problem Skin', label: 'Softens thick, rough, or calloused skin' },
  { id: 'prob-04', category: 'Problem Skin', label: 'Fast-acting relief for severely dehydrated skin' },
  { id: 'prob-05', category: 'Problem Skin', label: 'Targets dry patches that other products can\'t fix' },

  // ── BABY & FAMILY ────────────────────────────────────────────────────────
  { id: 'baby-01', category: 'Baby & Family', label: 'Safe for all ages, from newborn skin to grandparents' },
  { id: 'baby-02', category: 'Baby & Family', label: 'Tear-free and gentle for the whole family' },
  { id: 'baby-03', category: 'Baby & Family', label: 'Pediatrician-friendly formula, no nasties' },
  { id: 'baby-04', category: 'Baby & Family', label: 'Mild enough for daily use on children\'s skin' },
  { id: 'baby-05', category: 'Baby & Family', label: 'Unscented option safe for sensitive baby skin' },

  // ── MEN'S SKIN ───────────────────────────────────────────────────────────
  { id: 'men-01', category: 'Men\'s Skin', label: 'Cooling post-shave relief that stops razor burn' },
  { id: 'men-02', category: 'Men\'s Skin', label: 'Deep-cleans skin under beards and facial hair' },
  { id: 'men-03', category: 'Men\'s Skin', label: 'Invigorating masculine scent profile' },
  { id: 'men-04', category: 'Men\'s Skin', label: 'Heavy-duty cleanse for active, hardworking hands' },
  { id: 'men-05', category: 'Men\'s Skin', label: 'Controls shine on oily, active-lifestyle skin' },

  // ── BODY CARE SPECIFIC ───────────────────────────────────────────────────
  { id: 'body-01', category: 'Body Care', label: 'Head-to-toe cleansing and conditioning in one bar' },
  { id: 'body-02', category: 'Body Care', label: 'Satin-smooth finish lasts beyond the shower' },
  { id: 'body-03', category: 'Body Care', label: 'Full-body treatment that replaces your lotion' },
  { id: 'body-04', category: 'Body Care', label: 'Targets dry legs, arms, and torso in one wash' },
  { id: 'body-05', category: 'Body Care', label: 'Salt bar that hardens and tones the skin' },

  // ── COMBINATION / MULTI-BENEFIT ──────────────────────────────────────────
  // These are the most useful for label copy — pick one and it's a complete benefit claim.
  { id: 'combo-01', category: 'Multi-Benefit', label: 'Cleanses, moisturizes, and soothes in a single wash' },
  { id: 'combo-02', category: 'Multi-Benefit', label: 'Exfoliates and deeply nourishes simultaneously' },
  { id: 'combo-03', category: 'Multi-Benefit', label: 'Detoxifies while delivering intense hydration' },
  { id: 'combo-04', category: 'Multi-Benefit', label: 'Anti-aging and brightening in one botanical blend' },
  { id: 'combo-05', category: 'Multi-Benefit', label: 'Soothing and antibacterial — calm and clean skin' },
  { id: 'combo-06', category: 'Multi-Benefit', label: 'Moisturizes dry skin while balancing oily zones' },
  { id: 'combo-07', category: 'Multi-Benefit', label: 'Purifies pores and plumps with hydration' },
  { id: 'combo-08', category: 'Multi-Benefit', label: 'Heals, hydrates, and protects the skin barrier' },
  { id: 'combo-09', category: 'Multi-Benefit', label: 'Brightens dull skin while calming irritation' },
  { id: 'combo-10', category: 'Multi-Benefit', label: 'Nourishes, repairs, and protects all in one step' },
  { id: 'combo-11', category: 'Multi-Benefit', label: 'Rich cleansing bar that conditions as it lathers' },
  { id: 'combo-12', category: 'Multi-Benefit', label: 'Deep-cleanse with a burst of moisture left behind' },
  { id: 'combo-13', category: 'Multi-Benefit', label: 'Vitamin-packed cleanse that feeds skin with every wash' },
  { id: 'combo-14', category: 'Multi-Benefit', label: 'Gentle scrub that cleanses, brightens, and smooths' },
  { id: 'combo-15', category: 'Multi-Benefit', label: 'Mineral-rich bar that detoxifies and replenishes' },
  { id: 'combo-16', category: 'Multi-Benefit', label: 'Aromatherapy cleanse that calms mind and skin' },
  { id: 'combo-17', category: 'Multi-Benefit', label: 'Tightens pores, soothes redness, and evens tone' },
  { id: 'combo-18', category: 'Multi-Benefit', label: 'Creamy lather that moisturizes and fights bacteria' },
  { id: 'combo-19', category: 'Multi-Benefit', label: 'Exfoliates dead skin while locking in moisture' },
  { id: 'combo-20', category: 'Multi-Benefit', label: 'Brightening clay bar that softens as it purifies' },

  // ── PRODUCT TYPE ─────────────────────────────────────────────────────────
  // Generic product identity phrases for the product name / front label.
  { id: 'type-01', category: 'Product Type', label: 'Artisan cold-process bar soap' },
  { id: 'type-02', category: 'Product Type', label: 'Handcrafted botanical soap bar' },
  { id: 'type-03', category: 'Product Type', label: 'Natural shampoo bar — plastic-free' },
  { id: 'type-04', category: 'Product Type', label: 'Luxury whipped body butter' },
  { id: 'type-05', category: 'Product Type', label: 'Salt bar — mineral body scrub soap' },
  { id: 'type-06', category: 'Product Type', label: 'Clay facial cleansing bar' },
  { id: 'type-07', category: 'Product Type', label: 'Essential oil aromatherapy bar' },
  { id: 'type-08', category: 'Product Type', label: 'Goat milk and honey moisturizing soap' },
  { id: 'type-09', category: 'Product Type', label: 'Charcoal detox deep-cleanse bar' },
  { id: 'type-10', category: 'Product Type', label: 'Herbal botanical infused bath bar' },
];

export const BENEFIT_CATEGORIES = [...new Set(MODULAR_BENEFITS.map((b) => b.category))];
