import { getPackageInfos, git } from "workspace-tools";
import yargsParser from "yargs-parser";
import fs from "fs/promises";
import path from "path";
import os from "os";
import execa from "execa";

async function run() {
  const tmpDir = "/tmp/fluentui-YTQKVl";

  /*
await fs.mkdtemp(path.join(os.tmpdir(), "fluentui-"));
  const gitResult = execa(
    "git",
    ["clone", "--depth=1", "https://github.com/microsoft/fluentui.git", tmpDir],
    { stdio: "inherit" }
  );

  // inject fake scripts
  await fs.mkdir(path.join(tmpDir, ".debone"));

  await fs.copyFile(
    path.join(__dirname, "../fake", "build.js"),
    path.join(tmpDir, ".debone", "build.js")
  );
*/
  console.log(tmpDir);

  const packageInfos = getPackageInfos(tmpDir);

  for (const [pkg, info] of Object.entries(packageInfos)) {
    const packageJson = JSON.parse(
      await fs.readFile(info.packageJsonPath, "utf-8")
    );

    if (packageJson.scripts) {
      for (const [script, action] of Object.entries(packageJson.scripts)) {
        packageJson.scripts[script] = `node "${path.join(
          tmpDir,
          ".debone/build.js"
        )}"`;
      }

      await fs.writeFile(
        info.packageJsonPath,
        JSON.stringify(packageJson, null, 2)
      );
    }
  }

  // const lageInstallResults = await execa("yarn", ["add", "-W", "-D", "lage"], {
  //   cwd: tmpDir,
  //   stdio: "inherit",
  // });


  const buildResult = await execa("npx", ["-y", "lage", "lage", "build"], {
    cwd: tmpDir,
    stdio: "inherit",
  });
}

run();
