import { readdir, readFile, writeFile, mkdir } from 'fs/promises';
import { join, resolve } from 'path';

const DOCS_DIR = resolve(import.meta.dir, '..', 'src', 'docs');
const OUTPUT_DIR = resolve(import.meta.dir, '..', 'dist');
const OUTPUT_FILE = join(OUTPUT_DIR, 'api-doc.json');

async function buildOpenApiDoc() {
    console.log('Building OpenAPI documentation...\n');

    // 1. Read base.json first
    const baseContent = await readFile(join(DOCS_DIR, 'base.json'), 'utf-8');
    const merged = JSON.parse(baseContent);

    merged.paths = merged.paths || {};
    merged.components = merged.components || {};
    merged.components.schemas = merged.components.schemas || {};
    merged.components.securitySchemes = merged.components.securitySchemes || {};

    console.log('  Loaded: base.json');

    // 2. Read all other JSON files (excluding base.json)
    const files = await readdir(DOCS_DIR);
    const moduleFiles = files
        .filter((f) => f.endsWith('.json') && f !== 'base.json')
        .sort();

    for (const file of moduleFiles) {
        const content = await readFile(join(DOCS_DIR, file), 'utf-8');
        const module = JSON.parse(content);

        // Merge paths
        if (module.paths) {
            for (const [path, methods] of Object.entries(module.paths)) {
                if (merged.paths[path]) {
                    Object.assign(merged.paths[path], methods);
                } else {
                    merged.paths[path] = methods;
                }
            }
        }

        // Merge component schemas
        if (module.components?.schemas) {
            Object.assign(merged.components.schemas, module.components.schemas);
        }

        // Merge security schemes
        if (module.components?.securitySchemes) {
            Object.assign(
                merged.components.securitySchemes,
                module.components.securitySchemes
            );
        }

        console.log(`  Merged: ${file}`);
    }

    // 3. Ensure output directory exists
    await mkdir(OUTPUT_DIR, { recursive: true });

    // 4. Write merged document
    await writeFile(OUTPUT_FILE, JSON.stringify(merged, null, 2), 'utf-8');

    const pathCount = Object.keys(merged.paths).length;
    const schemaCount = Object.keys(merged.components.schemas).length;
    console.log(`\nOpenAPI doc built: ${OUTPUT_FILE}`);
    console.log(`  Paths: ${pathCount}, Schemas: ${schemaCount}`);
}

buildOpenApiDoc().catch((err) => {
    console.error('Failed to build OpenAPI doc:', err);
    process.exit(1);
});
