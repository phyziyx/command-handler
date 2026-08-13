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
  InvalidCommandArgumentError,
  RawCommandRegistry,
  ArgumentParser,
  NumberParser,
  type ParseResult,
  parseSchema,
  RestParser,
  TokenReader,
  TypedCommandRegistry,
} from "./index.ts";

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
        // console.log(
        //   `Printing message: '${args?.join(" ")}' (${args?.length} args)`,
        // );
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

/**
 * A mock player class for testing purposes.
 * It simulates a player class with a name and an index.
 */
class MockPlayer {
  private static players: Map<number, MockPlayer> = new Map();

  public readonly name: string;
  public readonly index: number;

  constructor(_name: string, _index: number) {
    this.name = _name;
    this.index = _index;

    MockPlayer.players.set(_index, this);
  }

  public static getById(index: number): MockPlayer | null {
    return this.players.get(index) || null;
  }

  public static findByPartOfName(part: string): MockPlayer | null {
    for (const player of this.players.values()) {
      if (player.name.includes(part)) {
        return player;
      }
    }

    return null;
  }

  public static findAllByPartOfName(part: string): MockPlayer[] {
    const foundPlayers: MockPlayer[] = [];

    for (const player of this.players.values()) {
      if (player.name.includes(part)) {
        foundPlayers.push(player);
      }
    }

    return foundPlayers;
  }
}

class PlayerParser extends ArgumentParser<MockPlayer> {
  readonly usage = "<part of player name or ID>";

  private readonly whole: boolean;

  constructor(_whole: boolean = false) {
    super();

    this.whole = _whole;
  }

  parse(reader: TokenReader): ParseResult<MockPlayer> {
    const search = reader.read() || "";

    if (!search.length) {
      return {
        success: false,
        error: "Expected part of a player name or ID.",
      };
    }

    if (this.whole) {
      while (!reader.eof()) {
        reader.read();
      }
    }

    const index = Number(search);

    let player: MockPlayer | null = null;

    if (Number.isInteger(index)) {
      player = MockPlayer.getById(index);
    } else {
      const players = MockPlayer.findAllByPartOfName(search);

      if (players.length === 1) {
        player = players[0];
      } else if (players.length > 1) {
        return {
          success: false,
          error: `Multiple players found matching '${search}': ${players.length} players.`,
        };
      }
    }

    if (!player) {
      return {
        success: false,
        error: `Player '${search}' not found.`,
      };
    }

    return {
      success: true,
      value: player,
    };
  }
}

new MockPlayer("Alice", 1);
new MockPlayer("Bob", 2);
new MockPlayer("Charlie", 3);
new MockPlayer("David", 4);
new MockPlayer("Eve", 5);

new MockPlayer("AliceTheGreat", 6);
new MockPlayer("BobTheBuilder", 7);
new MockPlayer("CharlieTheChampion", 8);
new MockPlayer("DavidTheDestroyer", 9);
new MockPlayer("EveTheEnchantress", 10);

test("TypedCommandRegistry", (t) => {
  t.test("test rest parser", (ctx: TestContext) => {
    const restParser = new RestParser().parse(
      new TokenReader(["Hello", "World", "This", "Is", "A", "Test"]),
    );

    ctx.assert.deepStrictEqual(
      restParser,
      {
        success: true,
        value: "Hello World This Is A Test",
      },
      "RestParser should correctly parse all remaining tokens into a single string",
    );
  });

  t.test("test number parser", (ctx: TestContext) => {
    const numberParser = new NumberParser(1, 10).parse(new TokenReader(["5"]));

    ctx.assert.deepStrictEqual(
      numberParser,
      { success: true, value: 5 },
      "NumberParser should correctly parse a valid number within the specified range",
    );
  });

  t.test("test player parser", (ctx: TestContext) => {
    const playerParser = new PlayerParser().parse(
      new TokenReader(["AliceTheGreat"]),
    );

    ctx.assert.deepStrictEqual(
      playerParser,
      { success: true, value: MockPlayer.getById(6) },
      "PlayerParser should correctly find a player by name",
    );
  });

  t.test("test player parser with ID", (ctx: TestContext) => {
    const playerParser = new PlayerParser().parse(new TokenReader(["3"]));

    ctx.assert.deepStrictEqual(
      playerParser,
      { success: true, value: MockPlayer.getById(3) },
      "PlayerParser should correctly find a player by ID",
    );
  });

  t.test("test player parser with rest parser", (ctx: TestContext) => {
    const args = {
      player: new PlayerParser(),
      message: new RestParser(),
    };

    ctx.assert.throws(
      () => parseSchema(args, ["Bob", "Hello", "World"]),
      InvalidCommandArgumentError,
      "Should throw an error due to multiple players found matching 'Bob'",
    );
  });

  t.test("add a command with a player and rest parser", (ctx: TestContext) => {
    ctx.assert.doesNotThrow(() => {
      typedCommandRegistry.addCommand({
        name: "greet",
        args: {
          player: new PlayerParser(),
          message: new RestParser(),
        },
        description: "Greets a player with a message",
        handler: (args) => {
          const player = args.player;
          const message = args.message;

          console.log(
            `Greeting ${player.name} (ID: ${player.index}) with message: "${message}"`,
          );
        },
      });
    });
  });
});
