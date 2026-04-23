export function parseDevCliArgs(args: string[]) {
  let shouldRestart = false;
  let targetOverride: string | undefined;
  const forwardedArgs: string[] = [];

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--") {
      continue;
    }

    if (arg === "--restart") {
      shouldRestart = true;
      continue;
    }

    if (arg.startsWith("--target=")) {
      targetOverride = arg.slice("--target=".length);
      continue;
    }

    if (arg === "--target") {
      targetOverride = args[index + 1] ?? "";
      index += 1;
      continue;
    }

    forwardedArgs.push(arg);
  }

  return {
    shouldRestart,
    targetOverride,
    forwardedArgs,
  };
}
