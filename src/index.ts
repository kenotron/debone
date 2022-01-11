import { getPackageInfos, git } from "workspace-tools";
import fs from "fs/promises";
import path from "path";
import { parseArgs } from "./parseArgs.js";
import execa from "execa";
import gitUrlParse from "git-url-parse";
import os from "os";
import { statSync, existsSync, createWriteStream, createReadStream } from "fs";
import tar from "tar-fs";
import humanId from "human-id";

const CacheDirPrefix = path.join(os.homedir(), ".debone", "git");

async function run(args: any) {
  const repo = args._[0];
  const repoUri = gitUrlParse(repo);
  const cacheDir = path.join(
    CacheDirPrefix,
    repoUri.source,
    repoUri.owner,
    repoUri.name
  );

  if (args.clearCache && existsSync(cacheDir)) {
    await fs.rm(cacheDir, { recursive: true });
  }

  const outDir =
    args._.length > 1
      ? args._[1]
      : path.join(process.cwd(), `${path.basename(repoUri.name)}-deboned`);

  // degit the repo
  try {
    if (existsSync(outDir)) {
      await fs.rm(path.join(outDir), { recursive: true });
    }

    if (!existsSync(cacheDir)) {
      await fs.mkdir(cacheDir, { recursive: true });
    }

    if (!existsSync(path.join(cacheDir, "repo.tar"))) {
      const cacheTmp = path.join(cacheDir, "tmp");
      // TODO: For github / gitlab / bitbucket / ADO repos, there are well-known URLs / APIs to download tarballs directly.
      //       It may NOT be better than straight up cloning, however.

      await execa("git", ["clone", "--depth=1", repoUri.toString(), cacheTmp], {
        stdio: "inherit",
      });
      await fs.rm(path.join(cacheTmp, ".git"), { recursive: true });

      tar
        .pack(cacheTmp, {
          ignore(name) {
            const importantFiles = [
              "package.json",
              "package-lock.json",
              "yarn.lock",
              "rush.json",
            ];

            const importantPaths = ["common/config/rush"];

            const stat = statSync(name);
            return (
              stat.isFile() &&
              !(
                importantFiles.some((f) => name.endsWith(f)) ||
                importantPaths.some((p) => name.includes(p))
              )
            );
          },
        })
        .pipe(createWriteStream(path.join(cacheDir, "repo.tar")));

      await fs.rm(cacheTmp, { recursive: true });
    }

    // Even for uncached case, we are using tar to copy just the package.json files
    createReadStream(path.join(cacheDir, "repo.tar")).pipe(tar.extract(outDir));
  } catch (e) {
    console.error(e);
  }

  // debone
  const packageInfos = getPackageInfos(outDir);

  // create package name mapping
  const packageIdMap = new Map<string, string>();
  for (const [pkg, info] of Object.entries(packageInfos)) {
    packageIdMap.set(pkg, humanId());
  }

  for (const [pkg, info] of Object.entries(packageInfos)) {
    const packageJson = JSON.parse(
      await fs.readFile(info.packageJsonPath, "utf-8")
    );

    // Fix the package names
    packageJson.name = packageIdMap.get(pkg);

    for (const depType of [
      "dependencies",
      "devDependencies",
      "peerDependencies",
    ]) {
      if (packageJson[depType]) {
        for (const [dep, range] of packageJson[depType]) {
          if (packageIdMap.has(dep)) {
            delete packageJson[depType][dep];
            packageJson[depType][packageIdMap.get(dep)!] = range;
          }
        }
      }
    }

    // Fix the scripts
    if (packageJson.scripts) {
      for (const [script, action] of Object.entries(packageJson.scripts)) {
        packageJson.scripts[script] = `node "${path.join(
          outDir,
          ".debone/build.js"
        )}"`;
      }
    }

    await fs.writeFile(
      info.packageJsonPath,
      JSON.stringify(packageJson, null, 2)
    );
  }
}

const args = parseArgs(process.argv.slice(2));

if (args._.length < 1) {
  console.error("usage: debone [options] URL [outdir]");
  process.exit(0);
}

run(args);
