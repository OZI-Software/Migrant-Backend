// Path: ./src/plugins/ai-text-generation/server/src/routes/index.js

"use strict";

module.exports = [
  {
    method: "POST",
    path: "/generate-text",
    handler: "plugin::ai-text-generation.textGenerationController.generate",
    config: {
      auth: false,
    },
  },
];