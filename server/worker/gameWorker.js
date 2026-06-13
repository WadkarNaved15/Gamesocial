// worker.js

import "./publishGameWorker.js";
import "./draftCleanupWorker.js";

import {
  registerRepeatJobs,
} from "./registerRepeatJobs.js";

await registerRepeatJobs();

console.log(
  "Workers started"
);