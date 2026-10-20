import { describe, expect, test } from 'bun:test';

import { AGENT_SLASH_COMMANDS, matchAgentSlashCommands } from '../src/mock/agent-slash-commands';

const names = (input: string) =>
  matchAgentSlashCommands(input).map(({ command }) => command.command);

describe('Elliot slash command menu', () => {
  test('a bare slash offers every command', () => {
    expect(names('/')).toEqual(AGENT_SLASH_COMMANDS.map(({ command }) => command));
  });

  test('narrows to commands whose name starts with what was typed', () => {
    expect(names('/to')).toEqual(['/tools']);
    expect(names('/SUM')).toEqual(['/summarize']);
  });

  test('reports how much of the name matched, for the highlight', () => {
    const [match] = matchAgentSlashCommands('/dra');
    expect(match.command.command).toBe('/draft');
    expect(match.matchedLength).toBe(3);
  });

  test('finds a command by its description after the name matches', () => {
    // "reply" names no command, but /draft prepares one.
    const matches = matchAgentSlashCommands('/reply');
    expect(matches.map(({ command }) => command.command)).toEqual(['/draft']);
    expect(matches[0].matchedLength).toBe(0);
  });

  test('a short query does not match words inside descriptions', () => {
    // "to" appears in the /draft and /schedule descriptions.
    expect(names('/to')).toEqual(['/tools']);
    expect(names('/a')).toEqual([]);
  });

  test('stays closed once a command is chosen', () => {
    expect(names('/tools ')).toEqual([]);
    expect(names('/tools what can you do')).toEqual([]);
  });

  test('stays closed for a slash that is not at the start', () => {
    expect(names('')).toEqual([]);
    expect(names('archive and/or move')).toEqual([]);
    expect(names(' /tools')).toEqual([]);
  });

  test('stays closed when nothing matches', () => {
    expect(names('/zzz')).toEqual([]);
  });

  test('every quick-command chip is also in the menu', () => {
    const quick = AGENT_SLASH_COMMANDS.filter(({ quick }) => quick).map(({ command }) => command);
    expect(quick).toEqual(['/tools', '/summarize', '/draft']);
  });
});
