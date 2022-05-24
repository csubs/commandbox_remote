# Overview

This is a small wrapper that runs [CommandBox](https://www.ortussolutions.com/products/commandbox)
and allows it to communicate over the network. This is useful if you want to use CommandBox in a
non-interactive style without incurring the startup penalty for each command.

## Usage

`npx commandbox_remote`

or

`npm exec commandbox_remote`

or

`yarn exec commandbox_remote`

You can optionally specify a port to use by setting the env var `COMMANDBOX_REMOTE_PORT`,
e.g. `COMMANDBOX_REMOTE_PORT=4567 npx commandbox_remote`. The default port is 8623.

### Communicating with CommandBox

Here's a full NodeJS example of sending a `cfformat` command to `commandbox_remote` over TCP.

```nodejs
let formatted = '';
const client = net.createConnection(8623, 'localhost', () => {
  client.write(`cfformat run "${filePath}"\n`, () => {
    debug('Wrote command');
  });
  client.on('data', data => {
    debug(`Received output: ${data.toString()}`);
    formatted += data.toString();
  });
});
client.on('end', () => {
  debug('Connection closed. Proceeded with formatting.');
  handleFormattedCFML(filePath, formatted);
});
client.on('error', () => {
  console.warn('Could not connect to box_remote. Spawning box process.');
  const cfformat = childProcess.spawnSync('/usr/local/bin/box', ['cfformat', 'run', filePath], { encoding: 'utf8' });
  if (cfformat.error) {
    formatted = cfformat.stderr;
  } else {
    formatted = cfformat.stdout;
  }
  handleFormattedCFML(filePath, formatted);
});
```
