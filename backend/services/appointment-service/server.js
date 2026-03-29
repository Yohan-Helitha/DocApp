import env from "./src/config/environment.js";
import app from "./src/app.js";
import logger from "./src/config/logger.js";

const port = env.PORT || 4003;

const server = app.listen(port, () => {
  logger.info({ port }, "Appointment service listening");
});

process.on("SIGINT", () => {
  logger.info("SIGINT received, shutting down");
  server.close(() => process.exit(0));
});
