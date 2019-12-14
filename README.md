Moves all exported functions from one module into separate modules.

- Replaces named exports with import statements.
- Populates the new modules with all necessary import statements.
- Exports the imports at the end to allow for iterative migration.

*Very alpha... see Known Bugs.*

## Usage

```sh
npx functions-to-modules module outputDir moduleDir
```

- `module` - The input module file whose functions will be converted to modules.
- `outputDir` - The directory in which the new source module will be written.
- `modulesDir` - The name of the directory where the new modules will be written.

## Example

```js
// util.js used as input module
import fs from 'fs'

// hi
export const hi = () => 'hi'

// say hi
export const sayHi = () => {
  fs.writeFileSync(hi())
}
```

```sh
npx functions-to-modules ./util.js out util
```

**./out/util.js**:

```js
import fs from 'fs'

import { hi } from './util/hi.js'
import { sayHi } from './util/sayHi.js'

export {
  hi,
  sayHi,
}
```

**./out/util/sayHi.js**:

```js
import fs from 'fs'

// util
import { hi } from './hi.js'

// say hi
export const sayHi = () => {
  fs.writeFileSync(hi())
}
```

**./out/util/hi.js**:

```js
import fs from 'fs'

// hi
export const hi = () => 'hi'
````

## Known Bugs

- Does not split up an import with multiple variables.
- Does not move new import statements to the top of the new source file.
- Does not adjust relative paths of existing imports in the new module.
- Adds imports for modules mentioned in comments.
- Only works on named exports.
- Assumes all non-empty lines immediately above an export are comments.
- No tests.

## Licence

ISC
