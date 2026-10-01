# companion-module-josephadams-ptzpilot

A [Bitfocus Companion](https://bitfocus.io/companion) module for [PTZ Pilot](https://github.com/josephdadams/ptz-pilot): switch cameras, reassign controllers, recall and store presets, and move cameras, with live status and movement as feedbacks and variables.

See [HELP.md](./companion/HELP.md) and [LICENSE](./LICENSE).

It talks to PTZ Pilot's WebSocket API; see [docs/api.md](https://github.com/josephdadams/ptz-pilot/blob/main/docs/api.md) in the PTZ Pilot repository.

## Development

```bash
yarn           # install
yarn dev       # compile on change
yarn test      # unit tests, and the link against a local WebSocket server
yarn lint
yarn package   # build the module package for Companion
```

Node 22.20 or later is required, matching Companion's module runtime.
