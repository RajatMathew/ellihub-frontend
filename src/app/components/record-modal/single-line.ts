/**
 * A record's title is one line even though it is typed into a wrapping box: a pasted line
 * break becomes a single space rather than splitting the title.
 */
export const toSingleLine = (value: string): string => value.replace(/[\r\n]+/g, ' ');
