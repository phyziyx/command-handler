import test, { type TestContext } from "node:test";
import { SlashCommandRegistry } from "./index.ts";

test("SlashCommandRegistry", (t) => {
  const slashCommandRegistry = new SlashCommandRegistry();

  t.test("get prefix", (ctx: TestContext) => {
    const result = slashCommandRegistry.getPrefix();

    ctx.assert.deepStrictEqual(
      result,
      "/",
      "Prefix should be '/' for SlashCommandRegistry",
    );
  });

  t.test("add a command", (ctx: TestContext) => {
    slashCommandRegistry.addCommand({
      name: "help",
      aliases: ["h"],
      description: "Displays help information",
      handler: () => {
        console.log("Executing help command");
      },
    });

    const result = slashCommandRegistry.getCommandsCount();

    ctx.assert.deepStrictEqual(
      result,
      1,
      "Command count should be 1 after adding a command",
    );
    ctx.assert.ok(
      slashCommandRegistry.hasCommand("help"),
      "Command 'help' should exist in the registry",
    );
  });
});
