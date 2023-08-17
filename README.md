# Overview

`commandbox_remote` is a small wrapper that runs [CommandBox](https://www.ortussolutions.com/products/commandbox)
and allows it to communicate over the network. This is useful if you want to use CommandBox in a
non-interactive style without incurring the startup penalty for each command.

## Warning: Remote Access!

*This essentially starts a network-accessible shell, so it should be used with extreme caution!*

The server only listens on `localhost` (IPv4), so that helps to limit access, but a malicious program
running on your computer can run `commandbox` commands as you, without having to authenticate itself.
*USE AT YOUR OWN RISK!*

## Usage

`box_config_offlineMode=true npx commandbox_remote`

or

`box_config_offlineMode=true npm exec commandbox_remote`

or

`box_config_offlineMode=true yarn exec commandbox_remote`

You can optionally specify a port to use by setting the env var `COMMANDBOX_REMOTE_PORT`,
e.g. `COMMANDBOX_REMOTE_PORT=4567 npx commandbox_remote`. The default port is 8623.

### Communicating with CommandBox

Any program that can commmunicate in plain-text over TCP should be able to talk to `commandbox_remote`.

Here's a full NodeJS example of sending a `cfformat` command to `commandbox_remote` over TCP.

```node
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
