/*
 * Command Handler Tests
 *
 * Author: phyziyx
 *
 * Date: 09 August 2026 20:44:00
 */

import test, { type TestContext } from "node:test";
import {
  CommandAliasAlreadyExistsError,
  CommandAlreadyExistsError,
} from "./src/errors.ts";
import { RawCommandRegistry } from "./src/raw.ts";
import { Args, TypedCommandRegistry } from "./src/typed.ts";

export class SlashCommandRegistry extends RawCommandRegistry {
  constructor() {
    super("/");
  }
}

test("SlashRawCommandRegistry", (t) => {
  const slashRawCommandRegistry = new SlashCommandRegistry();

  t.test("get prefix", (ctx: TestContext) => {
    const result = slashRawCommandRegistry.getPrefix();

    ctx.assert.deepStrictEqual(
      result,
      "/",
      "Prefix should be '/' for SlashCommandRegistry",
    );
  });

  t.test("add a 'help' command", (ctx: TestContext) => {
    ctx.assert.doesNotThrow(() => {
      slashRawCommandRegistry.addCommand({
        name: "help",
        aliases: ["h"],
        description: "Displays help information",
        handler: () => {
          console.log("Executing help command");
        },
      });
    }, "Adding 'help' command should not throw an error");

    const result = slashRawCommandRegistry.getCommandsCount();

    ctx.assert.deepStrictEqual(
      result,
      1,
      "Command count should be 1 after adding a command",
    );
    ctx.assert.ok(
      slashRawCommandRegistry.hasCommand("help"),
      "Command 'help' should exist in the registry",
    );
  });

  t.test("add the same 'help' command should throw", (ctx: TestContext) => {
    ctx.assert.throws(
      () => {
        slashRawCommandRegistry.addCommand({
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
          slashRawCommandRegistry.addCommand({
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
          slashRawCommandRegistry.addCommand({
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
      slashRawCommandRegistry.removeCommand("help");
    }, "Removing 'help' command should not throw an error");

    ctx.assert.ok(
      !slashRawCommandRegistry.hasCommand("help"),
      "Command 'help' should not exist in the registry after removal",
    );
  });

  t.test("try parsing a command", (ctx: TestContext) => {
    slashRawCommandRegistry.addCommand({
      name: "print",
      description: "Prints a message",
      handler: (args?: string[]) => {
        console.log(
          `Printing message: '${args?.join(" ")}' (${args?.length} args)`,
        );
        return;
      },
    });

    ctx.assert.strictEqual(
      slashRawCommandRegistry.parseCommandLine("faz"),
      false,
      "The string 'faz' is not a command and should return false",
    );

    ctx.assert.doesNotThrow(
      () => slashRawCommandRegistry.parseCommandLine("/print"),
      "Running the 'print' command with no arguments",
    );

    ctx.assert.doesNotThrow(
      () => slashRawCommandRegistry.parseCommandLine("/print Hello World"),
      "Running the 'print' command with arguments should not throw an error",
    );

    ctx.assert.throws(
      () => slashRawCommandRegistry.parseCommandLine("/foo"),
      "Running the 'foo' command which does not exist",
    );

    ctx.assert.throws(
      () => slashRawCommandRegistry.parseCommandLine("/baz"),
      "Running the 'baz' command which does not exist",
    );
  });
});

const typedCommandRegistry = new TypedCommandRegistry("!");

typedCommandRegistry.addCommand({
  name: "announce",
  aliases: ["ann", "broadcast"],
  description: "Broadcasts a message to all players.",
  args: {
    message: Args.rest(),
  },
  handler: ({ message }) => {
    console.log(message);
  },
});

typedCommandRegistry.addCommand({
  name: "pm",
  aliases: ["privatemsg", "dm"],
  description: "Send a private message to a player.",
  args: {
    target: Args.player(),
    message: Args.rest(),
  },
  handler: ({ target, message }) => {
    console.log(`to ${target.name}: ${message}`);
  },
});
