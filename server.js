/**
 * Server Clustering Implementation
 *
 * This file implements Node.js clustering to utilize multiple CPU cores,
 * improving application performance and resource utilization.
 * The master process spawns worker processes equal to the number of CPU cores,
 * and each worker runs an instance of the application.
 */

// Import required Node.js modules
const cluster = require("cluster"); // For creating multiple server instances
const os = require("os"); // For getting system CPU information
const { app, server } = require("./app");

// Get the port from environment or use default
const PORT = process.env.PORT || 3000;

// Check if current process is the master process
if (cluster.isMaster) {
  // Get the number of available CPU cores
  const numCpus = os.cpus().length;

  // Log the master process information
  console.log(`Master ${process.pid} is running on ${numCpus} CPUs`);

  // Fork worker processes for each CPU core
  for (let i = 0; i < numCpus; i++) {
    cluster.fork();
  }

  // Handle worker crashes
  cluster.on("exit", (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died. Restarting...`);
    cluster.fork();
  });
} else {
  // Worker process code - start the server
  server.listen(PORT, () => {
    console.log(`Worker ${process.pid} listening on port ${PORT}`);
  });
}
