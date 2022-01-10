import yargsParser from "yargs-parser";

export function parseArgs(processArgs: any) {
  return yargsParser(processArgs, {
    boolean: ["clean"],
  });
}
