import test, { type TestContext } from "node:test";
import {
  CommandRegistry,
  CommandAliasAlreadyExistsError,
  CommandAlreadyExistsError,
} from "./index.ts";

export class SlashCommandRegistry extends CommandRegistry {
  constructor() {
    super("/");
  }
}

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

  t.test("add a 'help' command", (ctx: TestContext) => {
    ctx.assert.doesNotThrow(() => {
      slashCommandRegistry.addCommand({
        name: "help",
        aliases: ["h"],
        description: "Displays help information",
        handler: () => {
          console.log("Executing help command");
        },
      });
    }, "Adding 'help' command should not throw an error");

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

  t.test("add the same 'help' command should throw", (ctx: TestContext) => {
    ctx.assert.throws(
      () => {
        slashCommandRegistry.addCommand({
          name: "help",
          aliases: ["h"],
          description: "Displays help information",
          handler: () => {
            console.log("Executing help command");
          },
        });
      },
      CommandAlreadyExistsError,
      "Adding the same 'help' command should throw CommandAlreadyExistsError",
    );
  });

  t.test(
    "add command 'print' with a duplicated aliases",
    (ctx: TestContext) => {
      ctx.assert.throws(
        () => {
          slashCommandRegistry.addCommand({
            name: "print",
            aliases: ["p", "p"],
            description: "Prints a message",
            handler: () => {
              console.log("Prints a message");
            },
          });
        },
        CommandAliasAlreadyExistsError,
        "Adding command 'print' with duplicated alias 'p' should throw CommandAliasAlreadyExistsError",
      );
    },
  );

  t.test(
    "add command 'list' with alias 'h' should throw",
    (ctx: TestContext) => {
      ctx.assert.throws(
        () => {
          slashCommandRegistry.addCommand({
            name: "list",
            aliases: ["h"],
            description: "Displays a list of things",
            handler: () => {
              console.log("Executing the list of things");
            },
          });
        },
        CommandAliasAlreadyExistsError,
        "Adding command 'list' with alias 'h' should throw CommandAliasAlreadyExistsError",
      );
    },
  );

  t.test("remove command 'help'", (ctx: TestContext) => {
    ctx.assert.doesNotThrow(() => {
      slashCommandRegistry.removeCommand("help");
    }, "Removing 'help' command should not throw an error");

    ctx.assert.ok(
      !slashCommandRegistry.hasCommand("help"),
      "Command 'help' should not exist in the registry after removal",
    );
  });
});
