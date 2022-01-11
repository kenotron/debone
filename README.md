# Debone

This tool takes an internal repo and scrubs it. It is useful to validate tools like monorepo task runners, package managers, etc.

## What does it do?

This tool "debones" the packages inside a monorepo by:

1. stripping out source code
2. renaming package names
3. renaming package paths

Deboned monorepo features:

1. package dependency structures
2. known "fake" build scripts

## Installation / Running

Recommended way to use this is via `npx`:

```
npx debone URL [outdir]
```

Example:

```
npx debone https://github.com/vsavkin/large-monorepo/
```

## Roadmap

* detect whether a package is a library or an application
* generate code based on the relative size of a library or application
