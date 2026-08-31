# Third-party data licenses

## Online ingredient suggestions

Cosmetic ingredient suggestions are retrieved on demand from the
[CosIng Checker public API](https://cosingchecker.com/api/), a read-only
interface to EU cosmetic ingredient information. Gaia's Studio stores only
records explicitly selected by the user and retains the source identifier.
CosIng information is provided for reference and is not legal or safety advice.

Food and botanical suggestions are retrieved on demand from
[Open Food Facts](https://world.openfoodfacts.org/). The Open Food Facts
database is available under the
[Open Database License (ODbL) 1.0](https://opendatacommons.org/licenses/odbl/1-0/).
Selected records retain Open Food Facts attribution and source identifiers.

## Offline CosIng ingredient backlog

Part of `src/data/offlineIngredientCatalog.json` is a **soap-relevant subset**
of the European Commission [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/)
(Cosmetic Ingredient Database): oils, butters, essential oils, colorants, soap
bases, clays, waxes, and selected botanicals. This subset is used only for
offline autocomplete and icon lookup. It is **not** imported into the user's
ingredient library or inventory until they explicitly add an item.

The inventory dump was imported from
[`inhouse-work/cosing`](https://github.com/inhouse-work/cosing/blob/master/data/ingredients.csv)
(`data/ingredients.csv`), a republication of the official CosIng ingredients
table. CosIng data is reused under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

© European Union, CosIng (Cosmetic Ingredient Database).
Source: https://ec.europa.eu/growth/tools-databases/cosing/

CosIng is informational and has no legal value. It is not a list of ingredients
authorised for use, and is not legal or safety advice.

The `inhouse-work/cosing` Ruby gem that packages the dump is MIT licensed;
this project vendors only a filtered subset of the CosIng table, not the gem.

## Avery sheet geometry

Part of `src/data/averyTemplates.json` is derived from
[`@burnmark-io/sheet-templates`](https://github.com/burnmark-io/sheet-templates),
which converts the gLabels product-template database into normalized JSON.

### `@burnmark-io/sheet-templates`

MIT License

Copyright (c) 2026 Mannes Brak

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

### gLabels template database

Copyright (C) 2001-2026 Jaye Evins

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
of the Software, and to permit persons to whom the Software is furnished to do
so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
