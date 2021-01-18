# fileform

[![npm](https://img.shields.io/npm/v/fileform.svg)](https://www.npmjs.com/package/fileform)
[![Code style: Prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://github.com/prettier/prettier)
[![Donate](https://img.shields.io/badge/Donate-PayPal-green.svg)](https://paypal.me/alecdotbiz)

In-place scaffolding with file templates

## Usage

Install it globally.

```sh
pnpm i -g fileform
```

Run it within a directory that contains a `fileform.config.js` file.

```sh
fileform
```

Combine it with `degit` for optimal scaffolding.

```sh
npx degit user/repo && npx fileform
```

&nbsp;

### fileform.config.js

Create a configuration file.

```sh
touch fileform.config.js
```

Define the form values to be filled out.

```js
exports.form = {
  type: [String, ['vanilla', 'react']],
  name: String,
  description: String,
  private: Boolean,
  license: [String, 'MIT'],
  keywords: Array,
}
```

Define side effects once the form is filled out.

```js
exports.onForm = function({ type }) {
  if (type == 'react') {
    const pkg = this.readJsonSync('package.json')
    pkg.dependencies['react'] = '^16.0.0'
    this.writeJsonSync('package.json', pkg)
  }
}
```

Provide functions and variables to your file templates.

```js
exports.context = {
  foo: 'bar',
  reverse: (_body, _ctx, arg1) => arg1.reverse(),
}
```

- The `body` argument is for block calls (eg: `{{#reverse}}content{{/reverse}}`).
- The `ctx` argument lets you access other variables/functions.
- Your context can be a `Proxy` if you want.

&nbsp;

### `form` variables

Possible value types:
- `String`
- `Boolean`
- `Array`

Default values can be defined with a tuple like `[type, default]`.

When a value type is `String` and its default value is an array,
a list of choices is presented to the user.

When a value type is `Array`, its default value represents a static
list of choices. If no default value is given, the user must write
in their own values.

### `onForm` context

In the `onForm` handler, `this` contains a few helpers.

- All [`fs-extra`](https://github.com/jprichardson/node-fs-extra) exports
- `log` from [`lodge`](https://github.com/aleclarson/lodge)
- `exec` from [`@cush/exec`](https://github.com/aleclarson/exec)
- `prompt` from [`enquirer`](https://github.com/enquirer/enquirer)

&nbsp;

The end. Please open issues for any bugs or feature requests!
