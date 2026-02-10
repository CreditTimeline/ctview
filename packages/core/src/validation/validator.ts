import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

let validate: ReturnType<InstanceType<typeof Ajv2020>['compile']> | null = null;

function findSpecDir(): string {
  let dir = process.cwd();
  for (let i = 0; i < 5; i++) {
    const candidate = resolve(dir, 'spec', 'schemas', 'credittimeline-file.v1.schema.json');
    if (existsSync(candidate)) return resolve(dir, 'spec');
    dir = resolve(dir, '..');
  }
  throw new Error('Could not find spec/ directory with schema files.');
}

function getValidator(specDir?: string) {
  if (validate) return validate;

  const base = specDir ?? findSpecDir();
  const schemasDir = resolve(base, 'schemas');

  function loadSchema(filename: string) {
    return JSON.parse(readFileSync(resolve(schemasDir, filename), 'utf-8'));
  }

  const enumsSchema = loadSchema('credittimeline-v1-enums.json');
  const mainSchema = loadSchema('credittimeline-file.v1.schema.json');

  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);

  ajv.addSchema(enumsSchema);
  validate = ajv.compile(mainSchema);
  return validate;
}

export interface ValidationResult {
  valid: boolean;
  errors: Array<{ instancePath: string; message?: string }> | null;
}

export function validateCreditFile(data: unknown, specDir?: string): ValidationResult {
  const validator = getValidator(specDir);
  const valid = validator(data);
  return { valid: !!valid, errors: validator.errors ?? null };
}
