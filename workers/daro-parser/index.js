import { downloadAndParseCases, updateGithubFile, formatCasesAsJSON } from "./lib.js";
export * from "./lib.js";

// orchestrate the worker's scheduled execution
export async function handleSchedule(env) {
  try {
    const cases = await downloadAndParseCases();
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

// HTTP trigger allows manual invocation (e.g. call URL after deploy)
export async function fetch(request, env, context) {
  // if tests or manual callers want to avoid doing work, set SKIP_SCHEDULE
  if (env && env.SKIP_SCHEDULE) {
    return new Response("OK", { status: 200 });
  }
  // run the same schedule logic; we don't care about response body
  context.waitUntil(handleSchedule(env));
  return new Response("OK", { status: 200 });
}

export default {
  // invoked by cron trigger
  async scheduled(event, env, context) {
    context.waitUntil(handleSchedule(env));
  }
};