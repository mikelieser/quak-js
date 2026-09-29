// Writes the parameter tables of the play kinds into README.md from openapi.json, between markers like
// <!-- params:text --> … <!-- /params:text -->. Runs at the end of `bun generate`; CI checks the README is current.
//
//   bun docs

import { format, resolveConfig } from "prettier";

type Schema = {
  type?: string;
  format?: string;
  enum?: unknown[];
  anyOf?: Schema[];
  items?: Schema;
  additionalProperties?: Schema | boolean;
  minimum?: number;
  maximum?: number;
  description?: string;
  properties?: Record<string, Schema>;
  required?: string[];
};

// Always in this order: text, talk, sound, clip, file, url
const KINDS = ["text", "talk", "sound", "clip", "file", "url"] as const;
const UPLOAD = "`Blob` \\| `Uint8Array` \\| `ArrayBuffer`";
const MAX_ENUM = 6;

const root = new URL("..", import.meta.url);
const readmeUrl = new URL("README.md", root);
const openapi = (await Bun.file(new URL("openapi.json", root)).json()) as {
  paths: Record<string, { post?: { requestBody?: { content?: Record<string, { schema: Schema }> } } }>;
};

function bodyOf(kind: string): Schema {
  const content = openapi.paths[`/v1/play/${kind}`]?.post?.requestBody?.content ?? {};
  const schema = (content["application/json"] ?? content["multipart/form-data"])?.schema;
  if (!schema?.properties) {
    throw new Error(`openapi.json: no request body for POST /v1/play/${kind}`);
  }
  return schema;
}

// The TypeScript type a caller passes, without the string forms the API also accepts from query and multipart
function typeOf(schema: Schema): string {
  if (schema.anyOf) {
    const hasBoolean = schema.anyOf.some((option) => option.type === "boolean");
    const options = schema.anyOf.filter((option) => {
      const stringForm = option.type === "string" && (option.description || (hasBoolean && option.enum));
      return !stringForm;
    });
    return [...new Set(options.map(typeOf))].join(" \\| ");
  }
  if (schema.format === "binary") {
    return UPLOAD;
  }
  if (schema.enum && schema.enum.length <= MAX_ENUM) {
    return schema.enum.map((value) => `\`${JSON.stringify(value)}\``).join(" \\| ");
  }
  const range =
    schema.minimum !== undefined && schema.maximum !== undefined ? ` ${schema.minimum}-${schema.maximum}` : "";
  switch (schema.type) {
    case "integer":
    case "number":
      return `\`number\`${range}`;
    case "array":
      return schema.items?.type === "object" ? "`object[]`" : `\`${schema.items?.type ?? "unknown"}[]\``;
    case "object":
      return typeof schema.additionalProperties === "object"
        ? `\`Record<string, ${typeOf(schema.additionalProperties).replaceAll("`", "").split(" ")[0]}>\``
        : "`object`";
    default:
      return `\`${schema.type ?? "unknown"}\``;
  }
}

function cell(text: string | undefined): string {
  return (text ?? "").replace(/\s+/g, " ").replaceAll("|", "\\|").replaceAll("<", "&lt;").trim();
}

// Long lists of values do not fit the type column, they go at the end of the description
function describe(schema: Schema): string {
  const values = schema.enum ?? schema.anyOf?.find((option) => option.enum && option.enum.length > MAX_ENUM)?.enum;
  const description = schema.description ?? "";
  if (!values || values.length <= MAX_ENUM) {
    return description;
  }
  return `${description}${description ? ". " : ""}One of ${values.map((value) => `\`${String(value)}\``).join(", ")}`;
}

function table(rows: { name: string; type: string; required: boolean; description: string }[]): string {
  const lines = ["| Name | Type | Required | Description |", "| --- | --- | --- | --- |"];
  for (const row of rows) {
    lines.push(`| \`${row.name}\` | ${row.type} | ${row.required ? "yes" : ""} | ${cell(row.description)} |`);
  }
  return lines.join("\n");
}

const bodies = Object.fromEntries(KINDS.map((kind) => [kind, bodyOf(kind)])) as Record<string, Schema>;

// Common: fields every kind has with the same meaning. The rest is listed per kind.
const first = bodies.text!.properties!;
const common = Object.keys(first).filter((name) =>
  KINDS.every((kind) => {
    const field = bodies[kind]!.properties![name];
    return field && field.description === first[name]!.description && typeOf(field) === typeOf(first[name]!);
  }),
);

const blocks: Record<string, string> = {
  common: table(
    common.map((name) => ({ name, type: typeOf(first[name]!), required: false, description: describe(first[name]!) })),
  ),
};

for (const kind of KINDS) {
  const body = bodies[kind]!;
  const rows = Object.entries(body.properties!)
    .filter(([name]) => !common.includes(name))
    .map(([name, field]) => ({
      name,
      type: typeOf(field),
      required: body.required?.includes(name) ?? false,
      description: describe(field),
    }));
  if (Object.values(body.properties!).some((field) => field.format === "binary")) {
    const at = rows.findIndex((row) => row.type === UPLOAD) + 1;
    rows.splice(at, 0, {
      name: "filename",
      type: "`string`",
      required: false,
      description:
        'name of the upload, helps the server tell the format of raw bytes; default: the File\'s name or "audio"',
    });
  }
  blocks[kind] =
    table(rows) +
    `\n\nPlus the [common parameters](#common-parameters): ${common.map((name) => `\`${name}\``).join(", ")}.`;
}

let readme = await Bun.file(readmeUrl).text();
for (const [name, content] of Object.entries(blocks)) {
  const pattern = new RegExp(`(<!-- params:${name} -->)[\\s\\S]*?(<!-- /params:${name} -->)`);
  if (!pattern.test(readme)) {
    throw new Error(`README.md: markers <!-- params:${name} --> … <!-- /params:${name} --> are missing`);
  }
  readme = readme.replace(pattern, (_, open: string, close: string) => `${open}\n\n${content}\n\n${close}`);
}

const options = (await resolveConfig(readmeUrl.pathname)) ?? {};
const formatted = await format(readme, { ...options, parser: "markdown" });
if (formatted !== (await Bun.file(readmeUrl).text())) {
  await Bun.write(readmeUrl, formatted);
  console.log("README.md: parameter tables updated");
}
