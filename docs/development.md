# Development

## Setup and maintenance

The test suite converts the whole shared spec corpus, which arrives as a
submodule:

```sh
git clone --recurse-submodules https://github.com/markup-carve/pandoc-carve
# or, in an existing clone:
git submodule update --init
npm ci && npm test
```

Without the submodule the corpus tests FAIL rather than skip - a skipped corpus
reads like a converted one, which is how a stack overflow reachable from a
two-word document stayed live on the published package.
