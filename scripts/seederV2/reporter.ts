type SummaryRow = {
    label: string;
    value: number | string;
};

const startedAt = new Map<string, number>();

const line = (char = '-', length = 72) => char.repeat(length);
const yellow = (value: string) => `\x1b[33m${value}\x1b[0m`;

export const seedLog = {
    title: (title: string) => {
        console.log('');
        console.log(line('='));
        console.log(title.toUpperCase());
        console.log(line('='));
    },

    section: (title: string) => {
        console.log('');
        console.log(line());
        console.log(title);
        console.log(line());
    },

    start: (key: string, label: string) => {
        startedAt.set(key, Date.now());
        console.log(`> ${label}`);
    },

    done: (key: string, label = 'done') => {
        const start = startedAt.get(key);
        const elapsed = start ? ` (${Date.now() - start}ms)` : '';
        startedAt.delete(key);
        console.log(`  ${label}${elapsed}`);
    },

    info: (message: string) => {
        console.log(`  - ${message}`);
    },

    warn: (message: string) => {
        console.warn(`  ! ${message}`);
    },

    table: (title: string, rows: SummaryRow[]) => {
        const width = Math.max(...rows.map((row) => row.label.length), 8);
        console.log('');
        console.log(`  ${title}`);
        for (const row of rows) {
            console.log(`  ${row.label.padEnd(width)} : ${row.value}`);
        }
    },

    notice: (lines: string[]) => {
        const width = Math.max(...lines.map((message) => message.length));
        const border = `+${'-'.repeat(width + 2)}+`;
        console.log('');
        console.log(yellow(border));
        for (const message of lines) {
            console.log(yellow(`| ${message.padEnd(width)} |`));
        }
        console.log(yellow(border));
    },
};
