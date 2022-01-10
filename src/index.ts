import { getPackageInfos, git } from "workspace-tools";
import fs from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import os from "os";
import execa from "execa";
import { parseArgs } from "./parseArgs";
import degit from "degit";
import { globby } from "globby";
import pLimit from "p-limit";

async function run(args: any) {
  const repo = args._[0];
  const outdir =
    args._.length > 1
      ? args._[1]
      : path.join(process.cwd(), `${path.basename(repo)}-deboned`);

  // degit the repo
  await degit(repo, {
    cache: true,
    force: true,
    verbose: true,
  }).clone(outdir);

  // debone
  const filesInRepo = await globby("**", {
    ignore: ["package.json", "**/package.json"],
    cwd: outdir,
  });

  const limit = pLimit(15);
  await Promise.all(filesInRepo.map((f) => limit(() => fs.unlink(f))));

  // const packageInfos = getPackageInfos(tmpDir);

  // for (const [pkg, info] of Object.entries(packageInfos)) {
  //   const packageJson = JSON.parse(
  //     await fs.readFile(info.packageJsonPath, "utf-8")
  //   );

  //   if (packageJson.scripts) {
  //     for (const [script, action] of Object.entries(packageJson.scripts)) {
  //       packageJson.scripts[script] = `node "${path.join(
  //         tmpDir,
  //         ".debone/build.js"
  //       )}"`;
  //     }

  //     await fs.writeFile(
  //       info.packageJsonPath,
  //       JSON.stringify(packageJson, null, 2)
  //     );
  //   }
  // }

  // // const lageInstallResults = await execa("yarn", ["add", "-W", "-D", "lage"], {
  // //   cwd: tmpDir,
  // //   stdio: "inherit",
  // // });

  // const buildResult = await execa("npx", ["-y", "lage", "lage", "build"], {
  //   cwd: tmpDir,
  //   stdio: "inherit",
  // });
}

const args = parseArgs(process.argv.slice(2));

if (args._.length < 1) {
  console.error("usage: debone [options] URL [outdir]");
  process.exit(0);
}

run(args);
