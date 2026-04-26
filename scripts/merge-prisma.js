const fs = require("fs");
const path = require("path");

const prismaDir = path.join(__dirname, "..", "prisma");
const modelsDir = path.join(prismaDir, "models");
const baseFile = path.join(prismaDir, "base.prisma");
const outputFile = path.join(prismaDir, "schema.prisma");

function getAllPrismaFiles(dir) {
  let results = [];

  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      results = results.concat(getAllPrismaFiles(fullPath));
    } else if (item.endsWith(".prisma")) {
      results.push(fullPath);
    }
  }

  return results.sort();
}

function merge() {
  const base = fs.readFileSync(baseFile, "utf8");

  const modelFiles = getAllPrismaFiles(modelsDir);

  const contents = modelFiles.map(file => {
    const data = fs.readFileSync(file, "utf8");
    return `\n// FILE: ${path.relative(prismaDir, file)}\n${data}`;
  });

  const finalSchema = [base, ...contents].join("\n");

  fs.writeFileSync(outputFile, finalSchema);

  console.log("schema.prisma generated successfully.");
}

merge();