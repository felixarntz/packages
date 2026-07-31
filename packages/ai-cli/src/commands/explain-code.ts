import {
  getOpt,
  type HandlerArgs,
  injectFileOptionsForCommander,
  logger,
  normalizeAbsolutePath,
  type Option,
  type OptionsInput,
  outputStream,
  parseFileOptions,
  promptMissingOptions,
  stripOptionFieldsForCommander,
} from "@felixarntz/cli-utils";
import { createCodeAgent, createEnvironment } from "ai-code-agents";
import { logCost, logTokenUsage } from "../util/ai-usage";

export const name = "explain-code";
export const description = "Explains code in response to a prompt.";

const actualOptions: Option[] = [
  {
    argname: "-d, --directory <directory>",
    description: "Directory with the code to explain",
    parse: (value: string) => normalizeAbsolutePath(value),
    required: true,
  },
  {
    argname: "-p, --prompt <prompt>",
    description: "Prompt to send to the model",
    required: true,
  },
  {
    argname: "-m, --model <model>",
    description: "Model to use",
    required: true,
  },
];

export const options = injectFileOptionsForCommander(actualOptions, [
  "prompt",
]).map((option) => stripOptionFieldsForCommander(option));

interface CommandConfig {
  directory: string;
  model: string;
  prompt: string;
}

const parseOptions = (opt: OptionsInput): CommandConfig => {
  const config: CommandConfig = {
    directory: String(opt.directory),
    prompt: String(opt.prompt),
    model: String(opt.model),
  };
  return config;
};

export const handler = async (...handlerArgs: HandlerArgs): Promise<void> => {
  const { directory, prompt, model } = parseOptions(
    await promptMissingOptions(
      actualOptions,
      await parseFileOptions(getOpt(handlerArgs), ["prompt"])
    )
  );

  logger.info(`Prompting model ${model} to explain code in ${directory}...`);

  const agent = createCodeAgent({
    model,
    environment: createEnvironment("unsafe-local", {
      directoryPath: directory,
    }),
    environmentToolsDefinition: "readonly",
    maxSteps: 20,
    instructions: getInstructions(),
    logStep: (log: string) => {
      logger.debug(`\n${log}`);
    },
  });

  const streamResult = await agent.stream({
    prompt,
  });
  const { textStream } = streamResult;
  await outputStream(textStream);

  logTokenUsage(await streamResult.totalUsage);
  logCost(await streamResult.providerMetadata);
};

const getInstructions = (): string => `
You are a principal software engineer and educator. Your job is to explain relevant code and respond to the user's query. I will tip you $1,000,000 if you do a great job.

You have a number of tools available to review the codebase (e.g., search for code, read files, list the files in a directory). You must use these tools before responding to the user's query.

<critical_requirements>
- You **MUST** read all relevant files for the user's query before responding.
- It is **STRICTLY FORBIDDEN** to make assumptions about how a piece of code works.
- If relevant code relies on a dependency that you cannot access the code for, you need to acknowledge that and be transparent.
- It is better to tell the user that you lack critical information to formulate an educated response than to respond with false statements.
</critical_requirements>

<best_practices>
- Format your response in Markdown.
- Don't assume familiarity with the codebase.
- Cover both functional aspects (e.g., what does this do?) and technical aspects (e.g., which technical components does this use?).
- Include flow charts or UML diagrams when helpful. Use Mermaid syntax for all such visuals you include.
- Start at a high level, then gradually go into more detail.
- If your response will be relatively long (more than 3 paragraphs), include a "TL;DR" section at the very beginning.
- If the user asks about how to use a specific part of the code, include relevant code examples. Use realistic examples, no "Lorem Ipsum".
- Do not ask any follow up questions. If you lack critical information, simply state the problem, so that the user is aware.
</best_practices>
`;
