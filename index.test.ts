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
  RawCommandRegistry,
  ArgumentParser,
  NumberParser,
  type ParseResult,
  RestParser,
  TokenReader,
  TypedCommandRegistry,
} from "./index.ts";
import {
  BooleanParser,
  DefaultSyntaxGenerator,
  OptionalParser,
  StringParser,
} from "./src/typed.ts";
import {
  CommandDoesNotExistError,
  InvalidCommandArgumentSchema,
} from "./src/errors.ts";

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

    ctx.assert.ok(
      slashRawCommandRegistry.parseCommandLine("/h"),
      "Command '/h' alias should execute correctly",
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

const syntaxGenerator = new DefaultSyntaxGenerator();
const typedCommandRegistry = new TypedCommandRegistry("!", syntaxGenerator);

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

test("SyntaxGenerator", (t) => {
  t.test("test syntax generator output", (ctx: TestContext) => {
    ctx.assert.strictEqual(
      syntaxGenerator.generate({
        name: "greet",
        args: {
          player: new PlayerParser(),
          message: new RestParser(),
        },
        description: "Greets a player with a message",
        handler: (_args) => {},
      }),
      "<part of player name or ID> <text...>",
      "SyntaxGenerator should generate the correct syntax for the specified command",
    );
  });

  t.test("test syntax generator output", (ctx: TestContext) => {
    ctx.assert.strictEqual(
      syntaxGenerator.generate({
        name: "warn",
        description: "Warn the player",
        args: {
          player: new PlayerParser(),
          reason: new OptionalParser(new RestParser()),
        },
        handler: () => {},
      }),
      "<part of player name or ID> <optional (<text...>)>",
      "SyntaxGenerator should generate the correct syntax for the specified command",
    );
  });

  t.test("test syntax generator output", (ctx: TestContext) => {
    ctx.assert.strictEqual(
      syntaxGenerator.generate({
        name: "nothing",
        description: "This command does nothing",
        handler: () => {},
      }),
      "",
      "SyntaxGenerator should generate the correct empty syntax for the specified command",
    );
  });
});

test("BooleanParser", (t) => {
  t.test("test number parser", (ctx: TestContext) => {
    const booleanParser = new BooleanParser();

    ctx.assert.deepStrictEqual(
      booleanParser.parse(new TokenReader([""])),
      { success: false, error: "Expected boolean." },
      "BooleanParser should correctly fail when no argument is provided",
    );

    ctx.assert.deepStrictEqual(
      booleanParser.parse(new TokenReader(["   "])),
      { success: false, error: "Expected boolean." },
      "BooleanParser should correctly fail when whitespace is provided",
    );

    ctx.assert.deepStrictEqual(
      booleanParser.parse(new TokenReader(["true"])),
      { success: true, value: true },
      "BooleanParser should correctly parse a valid true value within the specified range",
    );

    ctx.assert.deepStrictEqual(
      booleanParser.parse(new TokenReader(["false"])),
      { success: true, value: false },
      "BooleanParser should correctly parse a valid false value within the specified range",
    );

    ctx.assert.deepStrictEqual(
      booleanParser.parse(new TokenReader(["0"])),
      { success: true, value: false },
      "BooleanParser should correctly parse zero as false",
    );

    ctx.assert.deepStrictEqual(
      booleanParser.parse(new TokenReader(["1"])),
      { success: true, value: true },
      "BooleanParser should correctly parse one as true",
    );

    ctx.assert.deepStrictEqual(
      booleanParser.parse(new TokenReader(["5.5"])),
      { success: false, error: `'5.5' is not a valid boolean.` },
      "BooleanParser should fail to parse any value outside the specified range",
    );
  });

  t.test("test number parser with custom values", (ctx: TestContext) => {
    const booleanParser = new BooleanParser(["ja"], ["nein"]);

    ctx.assert.deepStrictEqual(
      booleanParser.parse(new TokenReader(["ja"])),
      { success: true, value: true },
      "BooleanParser should correctly parse a custom true value within the specified range",
    );

    ctx.assert.deepStrictEqual(
      booleanParser.parse(new TokenReader(["nein"])),
      { success: true, value: false },
      "BooleanParser should correctly parse a custom false value within the specified range",
    );
  });
});

test("NumberParser", (t) => {
  t.test("test number parser", (ctx: TestContext) => {
    const numberParser = new NumberParser();

    ctx.assert.deepStrictEqual(
      numberParser.parse(new TokenReader([""])),
      { success: false, error: "Expected number." },
      "NumberParser should correctly fail when no argument is provided",
    );
    ctx.assert.deepStrictEqual(
      numberParser.parse(new TokenReader(["   "])),
      { success: false, error: "Expected number." },
      "NumberParser should correctly fail when whitespace is provided",
    );
    ctx.assert.deepStrictEqual(
      numberParser.parse(new TokenReader(["5"])),
      { success: true, value: 5 },
      "NumberParser should correctly parse a valid number within the specified range",
    );
    ctx.assert.deepStrictEqual(
      numberParser.parse(new TokenReader(["-11"])),
      { success: true, value: -11 },
      "NumberParser should correctly parse a negative number",
    );
    ctx.assert.deepStrictEqual(
      numberParser.parse(new TokenReader(["0"])),
      { success: true, value: 0 },
      "NumberParser should correctly parse zero",
    );
    ctx.assert.deepStrictEqual(
      numberParser.parse(new TokenReader(["-0"])),
      { success: true, value: -0 },
      "NumberParser should correctly parse negative zero",
    );
    ctx.assert.deepStrictEqual(
      numberParser.parse(new TokenReader(["5.5"])),
      { success: true, value: 5.5 },
      "NumberParser should correctly parse a decimal value",
    );
    ctx.assert.deepStrictEqual(
      numberParser.parse(new TokenReader(["abc"])),
      { success: false, error: "'abc' is not a number." },
      "NumberParser should fail when a string is provided",
    );
    ctx.assert.deepStrictEqual(
      numberParser.parse(new TokenReader(["abc 123"])),
      { success: false, error: "'abc 123' is not a number." },
      "NumberParser should fail when a alphanumeric string is provided",
    );
    ctx.assert.deepStrictEqual(
      numberParser.parse(new TokenReader(["999999999999999"])),
      { success: true, value: 999999999999999 },
      "NumberParser should parse a very large value ",
    );
  });

  t.test("test number parser within range", (ctx: TestContext) => {
    const numberParser = new NumberParser(1, 10).parse(new TokenReader(["5"]));

    ctx.assert.deepStrictEqual(
      numberParser,
      { success: true, value: 5 },
      "NumberParser should correctly parse a valid number within the specified range",
    );
  });

  t.test("test number parser outside of range", (ctx: TestContext) => {
    const numberParser = new NumberParser(1, 10).parse(
      new TokenReader(["-11"]),
    );

    ctx.assert.deepStrictEqual(
      numberParser,
      { success: false, error: "Number must be at least 1." },
      "NumberParser should correctly parse a valid number within the specified range",
    );
  });
});

test("StringParser", (t) => {
  t.test("test string parser", (ctx: TestContext) => {
    const stringParser = new StringParser().parse(
      new TokenReader(["string", "parser", "test"]),
    );

    ctx.assert.deepStrictEqual(
      stringParser,
      { success: true, value: "string" },
      "NumberParser should correctly parse the first token as a string",
    );
  });
});

test("RestParser", (t) => {
  const restParser = new RestParser();

  t.test("test multiple word tokens", (ctx: TestContext) => {
    ctx.assert.deepStrictEqual(
      restParser.parse(
        new TokenReader(["Hello", "World", "This", "Is", "A", "Test"]),
      ),
      {
        success: true,
        value: "Hello World This Is A Test",
      },
      "RestParser should correctly parse all remaining tokens into a single string",
    );
  });

  t.test("test an empty array of tokens", (ctx: TestContext) => {
    ctx.assert.deepStrictEqual(
      restParser.parse(new TokenReader([])),
      {
        success: true,
        value: "",
      },
      "RestParser should correctly parse an empty array of tokens",
    );
  });

  t.test("test an array of empty token", (ctx: TestContext) => {
    ctx.assert.deepStrictEqual(
      restParser.parse(new TokenReader([""])),
      {
        success: true,
        value: "",
      },
      "RestParser should correctly parse an empty token",
    );
  });

  t.test("test whitespace token", (ctx: TestContext) => {
    ctx.assert.deepStrictEqual(
      restParser.parse(new TokenReader([" "])),
      {
        success: true,
        value: " ",
      },
      "RestParser should correctly parse single whitespace token",
    );
  });

  t.test("test multi-whitespace token", (ctx: TestContext) => {
    ctx.assert.deepStrictEqual(
      restParser.parse(new TokenReader(["   "])),
      {
        success: true,
        value: "   ",
      },
      "RestParser should correctly parse multi-whitespace token",
    );
  });

  t.test("test single token", (ctx: TestContext) => {
    ctx.assert.deepStrictEqual(
      restParser.parse(new TokenReader(["World"])),
      {
        success: true,
        value: "World",
      },
      "RestParser should correctly parse a single token",
    );
  });
});

test("OptionalParser", (t) => {
  t.test("test optional parser with a provided value", (ctx: TestContext) => {
    const optionalParser = new OptionalParser(new StringParser());

    ctx.assert.deepStrictEqual(
      optionalParser.parse(new TokenReader(["Hello"])),
      { success: true, value: "Hello" },
      "OptionalParser should correctly parse a provided value",
    );
  });

  t.test(
    "test optional parser with no provided value for number parser",
    (ctx: TestContext) => {
      const optionalParser = new OptionalParser(new NumberParser());

      ctx.assert.deepStrictEqual(
        optionalParser.parse(new TokenReader([])),
        { success: true, value: undefined },
        "OptionalParser should correctly return undefined when no value is provided for number parser",
      );
    },
  );

  t.test(
    "test optional parser with no provided value for player parser",
    (ctx: TestContext) => {
      const optionalParser = new OptionalParser(new PlayerParser());

      ctx.assert.deepStrictEqual(
        optionalParser.parse(new TokenReader([])),
        { success: true, value: undefined },
        "OptionalParser should correctly return undefined when no value is provided for player parser",
      );
    },
  );

  t.test("test optional parser with no provided value", (ctx: TestContext) => {
    const optionalParser = new OptionalParser(new StringParser());

    ctx.assert.deepStrictEqual(
      optionalParser.parse(new TokenReader([])),
      { success: true, value: undefined },
      "OptionalParser should correctly return undefined when no value is provided",
    );
  });

  t.test(
    "test optional parser with rest parser provided no value",
    (ctx: TestContext) => {
      const optionalParser = new OptionalParser(new RestParser());

      ctx.assert.deepStrictEqual(
        optionalParser.parse(new TokenReader([])),
        { success: true, value: undefined },
        "OptionalParser should correctly return empty undefined when no value is provided",
      );
    },
  );

  t.test(
    "test optional parser with rest parser provided some value",
    (ctx: TestContext) => {
      const optionalParser = new OptionalParser(new RestParser());

      ctx.assert.deepStrictEqual(
        optionalParser.parse(new TokenReader(["hello", "world"])),
        { success: true, value: "hello world" },
        "OptionalParser should correctly return the value when one is provided",
      );
    },
  );
});

test("PlayerParser", (t) => {
  const playerParser = new PlayerParser();

  t.test("test player parser with partial name match", (ctx: TestContext) => {
    ctx.assert.deepStrictEqual(
      playerParser.parse(new TokenReader(["AliceT"])),
      { success: true, value: MockPlayer.getById(6) },
      "PlayerParser should correctly find a player by name",
    );
  });

  t.test("test player parser with exact match", (ctx: TestContext) => {
    ctx.assert.deepStrictEqual(
      playerParser.parse(new TokenReader(["AliceTheGreat"])),
      { success: true, value: MockPlayer.getById(6) },
      "PlayerParser should correctly find a player by name",
    );
  });

  t.test("test player parser with ID", (ctx: TestContext) => {
    ctx.assert.deepStrictEqual(
      playerParser.parse(new TokenReader(["3"])),
      { success: true, value: MockPlayer.getById(3) },
      "PlayerParser should correctly find a player by ID",
    );
  });
});

test("TypedCommandRegistry", (t) => {
  t.test(
    "add a command with no arguments and ensure it is called",
    (ctx: TestContext) => {
      let called = false;

      ctx.assert.doesNotThrow(() => {
        typedCommandRegistry.addCommand({
          name: "noargs",
          description: "A command with no arguments",
          handler: () => {
            called = true;
          },
        });
      });

      ctx.assert.deepEqual(
        typedCommandRegistry.parseCommandLine("!noargs 123"),
        true,
        "The 'noargs' command should be parsed successfully",
      );
    },
  );

  t.test(
    "add a command with incorrect argument order and ensure it fails",
    (ctx: TestContext) => {
      let player: null | MockPlayer = null;
      let message: null | string = null;

      ctx.assert.throws(
        () => {
          typedCommandRegistry.addCommand({
            name: "invalidargorder",
            args: {
              message: new RestParser(),
              player: new PlayerParser(),
            },
            description: "A command with invalid argument order",
            handler: (args) => {
              player = args.player;
              message = args.message;
            },
          });
        },
        InvalidCommandArgumentSchema,
        "Adding a command with invalid argument order should throw InvalidCommandArgumentSchema error",
      );

      ctx.assert.throws(
        () =>
          typedCommandRegistry.parseCommandLine(
            "!invalidargorder AliceT Hello there!",
          ),
        CommandDoesNotExistError,
        "The 'invalidargorder' command should be not parsed as it does not exist",
      );
    },
  );

  t.test(
    "add a command with incorrect argument order and ensure it fails",
    (ctx: TestContext) => {
      let player: null | MockPlayer = null;
      let message: undefined | null | string = null;

      ctx.assert.throws(
        () => {
          typedCommandRegistry.addCommand({
            name: "invalidargorder",
            args: {
              message: new OptionalParser(new RestParser()),
              player: new PlayerParser(),
            },
            description: "A command with invalid argument order",
            handler: (args) => {
              player = args.player;
              message = args.message;
            },
          });
        },
        InvalidCommandArgumentSchema,
        "Adding a command with invalid argument order should throw InvalidCommandArgumentSchema error",
      );
    },
  );

  t.test(
    "add a command with a player and rest parser and ensure correct arguments are received",
    (ctx: TestContext) => {
      let called = false;

      let player: null | MockPlayer = null;
      let message: null | string = null;

      ctx.assert.doesNotThrow(() => {
        typedCommandRegistry.addCommand({
          name: "greet",
          args: {
            player: new PlayerParser(),
            message: new RestParser(),
          },
          description: "Greets a player with a message",
          handler: (args) => {
            player = args.player;
            message = args.message;

            called = true;

            // console.log(
            //   `Greeting ${player.name} (ID: ${player.index}) with message: "${message}"`,
            // );
          },
        });
      });

      ctx.assert.deepEqual(
        typedCommandRegistry.parseCommandLine("!greet AliceT Hello there!"),
        true,
        "The 'greet' command should be parsed successfully",
      );

      ctx.assert.deepEqual(
        called,
        true,
        "The handler for the 'greet' command should have been called",
      );

      ctx.assert.deepEqual(
        player,
        MockPlayer.getById(6),
        "The player argument should be AliceTheGreat (ID: 6)",
      );

      ctx.assert.deepEqual(
        message,
        "Hello there!",
        "The message argument should be 'Hello there!'",
      );
    },
  );
});
