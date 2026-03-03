import { downloadAndParseCases, updateGithubFile, formatCasesAsJSON } from "./lib.js";
export * from "./lib.js";

// orchestrate the worker's scheduled execution
export async function handleSchedule(env) {
  try {
    const cases = await downloadAndParseCases(env);
    if (cases.length === 0) {
      console.error("Parsing error: No cases were parsed.");
      return;
    }

    const newContent = formatCasesAsJSON(cases);
    await updateGithubFile(env, newContent, cases.length);
  } catch (err) {
    console.error("Error during parsing or updating:", err);
  }
}

export default {
  async fetch(request, env, context) {
    const url = new URL(request.url);

    if (env.SKIP_SCHEDULE) {
      return new Response("OK", { status: 200 });
    }

    if (url.pathname !== `/trigger/${env.WORKER_TRIGGER_SECRET}`) {
      return new Response("Not Found", { status: 404 });
    }

    // Don't use waitUntil — await the work directly so the response
    // is only sent after completion, giving us the full request time budget
    await handleSchedule(env);
    return new Response("OK", { status: 200 });
  },

  async scheduled(event, env, context) {
    context.waitUntil(handleSchedule(env));
  }
};