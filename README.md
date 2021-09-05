# rf-config

NodeJS config loader. Reads a config.js, package.json, LICENSE, .env and CHANGELOG.md.


## Getting Started

> npm install rf-config

To load this config.js file in `./config/config.js`:
```js
module.exports = {

   // we can have any content here
   config: 'local',
   abc: 'def',

   // "paths" is predefined to store all projects paths
   paths: {
      myReadme: 'README.md', // /README.md in root folder
      gitignore: '.gitignore',
      webserver: 'dest',
      server: 'server',
   }
};
```

Use this single line:

```js
var config = require('rf-config').init(__dirname); // root path '__dirname'

console.log(config);
// this returns a configuration like:

{

   config: 'local',   // variables
   abc: 'def',

   paths: {          // the paths in absolute form for easy backend use
      myReadme: '/home/user/project/README.md',
      gitignore: '/home/user/project/.gitignore',
      webserver: '/home/user/project/dest',
      server: '/home/user/project/server',
   },

   pathsRelative: {  // the paths also relative
      myReadme: 'README.md',
      gitignore: '.gitignore',
      webserver: 'dest',
      server: 'server',
   },

   app: {            // other infos we got for the app
      name: 'rf-config',
      version: '0.1.6',
      packageJson: {
         name: 'rf-config',
         version: '0.1.6',
         description: 'Simple NodeJS config loading lib',
         author: 'Rapidfacture GmbH',
         license: 'MIT',
         main: 'index.js'
      }
   }
}
```

Once Loaded, access the configuration later in other files with:
```js
var config = require('rf-config');
```
NOTE: The `init` function is only present the first time, as the config should be loaded only once - when the project starts.


## Development

Install the dev tools with

> npm install

Then you can runs some test cases and eslint with:

> npm test


## Legal Issues
* Licenese: MIT
* Author: Felix Furtmayr, Julian von Mendel
