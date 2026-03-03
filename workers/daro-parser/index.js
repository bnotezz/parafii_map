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
  async scheduled(event, env, context) {
    context.waitUntil(handleSchedule(env));
  }
};