#!/usr/bin/env node

/* Network-enabled wrapper for box (CommandBox) that faciliates communication
  with box via TCP. */

const childProcess = require("child_process");
const debug = require("debug")("commandbox_remote");
const net = require("net");
const queue = require("queue");

// Buffer for incoming commands since `box` can only process one at a time.
const jobQueue = queue({ concurrency: 1, timeout: 30000, autostart: true });

// Keep track of connected clients so we can return results to the right one.
// The current client will always be in position 0.
const clients = [];

const port = process.env.COMMANDBOX_REMOTE_PORT || 8623;

const box = childProcess.spawn("box");

box.on("error", e => {
  console.error(
    `Failed to start \`box\`. Make sure that Commandbox is installed (https://commandbox.ortusbooks.com/setup/installation) and on your path. (${e}`
  );
  process.exit(1);
});

let boxInitialized = false;
box.stdout.on("data", watchForBoxInitialization);
debug(`Spawned box with PID ${box.pid}`);

box.on("exit", function () {
  process.exit();
});

let startTime = null;

const server = net.createServer(c => {
  debug("Client connected");
  clients.push(c);
  debug(`clients[] queue length is ${clients.length}`);

  c.on("end", () => {
    debug("client disconnected");
    clients.shift();
    debug(`clients[] queue length is ${clients.length}`);
  });
  c.on("data", addCommandToQueue);
});

// Prevent non-zero exit code when this script is ctrl-c'ed
process.on("SIGINT", function () {
  process.exit();
});

function addCommandToQueue(cmd) {
  jobQueue.push(jobDoneCallback => {
    sendCommandToBox(cmd);
    jobDoneCallback();
  });
}

function returnOutput(output) {
  debug(`Received ${output.length} bytes of data from box, starting with: ${output.slice(0, 20).toString()}`);
  // We only handle one command per connection, so close the connection once the prompt is shown.
  if (output.toString().match(/CommandBox> $/)) {
    console.info(`Processed command in ${new Date() - startTime}ms`);
    clients[0].end();
    startTime = null;
  } else {
    debug("Sending output to clients[0]");
    clients[0].write(output.toString());
  }
}

function sendCommandToBox(cmd) {
  debug(`Received command: ${cmd.toString()}`);
  startTime = new Date();
  box.stdin.write(cmd.toString());
}

function watchForBoxInitialization(output) {
  if (!boxInitialized && output.toString().match(/CommandBox[>:]/)) {
    boxInitialized = true;
    console.info(`box is initialized and ready for input`);
    box.stdout.on("data", returnOutput);

    // Don't start server until box is running.
    server.listen(port, "localhost", () => {
      console.log(`Listening on port ${port}`);
    });
  }
}

