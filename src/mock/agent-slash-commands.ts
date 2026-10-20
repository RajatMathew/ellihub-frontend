/**
 * The commands Elliot answers to. elli-core's system prompt
 * (`src/modules/assistant/routes.ts`, "Quick commands") is what gives each one
 * its meaning — the client only offers them. A command added here without a
 * line there reaches the model as plain text.
 */
export type AgentSlashCommand = {
  command: `/${string}`;
  /** Short label for the empty-state chip. */
  label: string;
  /** One line for the slash menu. */
  description: string;
  /** What the command works on, shown on the right of the menu row. */
  scope: string;
  /** Offered as a chip on an empty conversation. */
  quick: boolean;
};

export const AGENT_SLASH_COMMANDS: readonly AgentSlashCommand[] = [
  {
    command: '/tools',
    label: 'See available tools',
    description: 'List every action Elliot can prepare: mail, schedule, RFQ and records',
    scope: 'Elliot',
    quick: true,
  },
  {
    command: '/summarize',
    label: 'Summarize this thread',
    description: 'Key outcome, deadline or ask from the open thread, in three bullets',
    scope: 'Thread',
    quick: true,
  },
  {
    command: '/draft',
    label: 'Draft a reply',
    description: 'Prepare a reply to the open thread for you to review',
    scope: 'Thread',
    quick: true,
  },
  {
    command: '/schedule',
    label: 'Add to a schedule',
    description: "Add an item to a project's schedule from this mail",
    scope: 'Schedule',
    quick: false,
  },
];

const MIN_TEXT_QUERY = 3;

const wordsOf = (command: AgentSlashCommand) =>
  `${command.label} ${command.description}`.toLowerCase().split(/[^a-z]+/);

export type AgentSlashCommandMatch = {
  command: AgentSlashCommand;
  /** Characters after the slash that the query matched, from the start. 0 when it matched elsewhere. */
  matchedLength: number;
};

/**
 * The menu opens only while the whole input is a single `/word` — the way a
 * command is typed. A slash later in a sentence ("and/or", a path) is text,
 * and a space after the word means the command has been chosen.
 *
 * Commands whose name starts with the query come first. After them, a command
 * whose label or description has a word starting with the query — `/reply`
 * finds /draft — but only from three letters, or `/to` would also offer every
 * command that says "to".
 */
export function matchAgentSlashCommands(
  input: string,
  commands: readonly AgentSlashCommand[] = AGENT_SLASH_COMMANDS
): AgentSlashCommandMatch[] {
  const match = input.match(/^\/(\S*)$/);
  if (!match) return [];
  const query = match[1].toLowerCase();

  const byName: AgentSlashCommandMatch[] = [];
  const byText: AgentSlashCommandMatch[] = [];
  for (const command of commands) {
    const name = command.command.slice(1).toLowerCase();
    if (name.startsWith(query)) {
      byName.push({ command, matchedLength: query.length });
    } else if (
      query.length >= MIN_TEXT_QUERY &&
      wordsOf(command).some((word) => word.startsWith(query))
    ) {
      byText.push({ command, matchedLength: 0 });
    }
  }
  return [...byName, ...byText];
}
