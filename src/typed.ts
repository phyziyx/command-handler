import {
  InvalidCommandArgumentError,
  UnknownCommandArgumentError,
} from "./errors.ts";
import { IRawCommandRegistry, RawCommandRegistry } from "./raw.ts";
import { CommandArg, CommandName, CommandPrefix } from "./types.ts";

/**
 * A mock player class for testing purposes.
 * It simulates a player class with a name and an index.
 */
class MockPlayer {
  private static players: Map<number, MockPlayer> = new Map();

  constructor(
    public readonly name: string,
    public readonly index: number,
  ) {
    MockPlayer.players.set(index, this);
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

export type ParseResult<T> =
  | {
      success: true;
      value: T;
    }
  | {
      success: false;
      error: string;
    };

export interface IArgumentParser<T> {
  parse(reader: TokenReader): ParseResult<T>;
}

class TokenReader {
  private readonly tokens: string[];
  private index = 0;

  constructor(tokens: string[]) {
    this.tokens = tokens;
  }

  public peek(offset = 0): string | undefined {
    return this.tokens[this.index + offset];
  }

  public read(): string | undefined {
    return this.tokens[this.index++];
  }

  public remaining(): string[] {
    return this.tokens.slice(this.index);
  }

  public remainingAsString(): string {
    return this.remaining().join(" ");
  }

  public eof(): boolean {
    return this.index >= this.tokens.length;
  }

  public save(): number {
    return this.index;
  }

  public restore(position: number): void {
    this.index = position;
  }
}

export type Schema = Record<string, IArgumentParser<any>>;

export type InferSchema<T extends Schema> = {
  [K in keyof T]: T[K] extends IArgumentParser<infer U> ? U : never;
};

class NumberParser implements IArgumentParser<number> {
  constructor(
    private readonly min?: number,
    private readonly max?: number,
  ) {}

  parse(reader: TokenReader): ParseResult<number> {
    const token = reader.read();

    if (!token) {
      return {
        success: false,
        error: "Expected number.",
      };
    }

    const value = Number(token);

    if (!Number.isFinite(value)) {
      return {
        success: false,
        error: `'${token}' is not a number.`,
      };
    }

    if (this.min !== undefined && value < this.min) {
      return {
        success: false,
        error: `Number must be at least ${this.min}.`,
      };
    }

    if (this.max !== undefined && value > this.max) {
      return {
        success: false,
        error: `Number must be at most ${this.max}.`,
      };
    }

    return {
      success: true,
      value,
    };
  }
}

class StringParser implements IArgumentParser<string> {
  parse(reader: TokenReader): ParseResult<string> {
    const token = reader.read();

    if (!token) {
      return {
        success: false,
        error: "Expected text.",
      };
    }

    return {
      success: true,
      value: token,
    };
  }
}

class RestParser implements IArgumentParser<string> {
  constructor(
    private readonly minLength?: number,
    private readonly maxLength?: number,
  ) {}

  parse(reader: TokenReader): ParseResult<string> {
    const value = reader.remainingAsString();

    while (!reader.eof()) {
      reader.read();
    }

    let length = value.length;
    if (this.minLength !== undefined && length < this.minLength) {
      return {
        success: false,
        error: `Text must be at least ${this.minLength} characters long.`,
      };
    } else if (this.maxLength !== undefined && length > this.maxLength) {
      return {
        success: false,
        error: `Text must be at most ${this.maxLength} characters long.`,
      };
    }

    return {
      success: true,
      value,
    };
  }
}

class PlayerParser implements IArgumentParser<MockPlayer> {
  parse(reader: TokenReader): ParseResult<MockPlayer> {
    const search = reader.remainingAsString();

    if (!search.length) {
      return {
        success: false,
        error: "Expected part of a player name or ID.",
      };
    }

    while (!reader.eof()) {
      reader.read();
    }

    const index = Number(search);

    let player: MockPlayer | null = null;

    if (Number.isInteger(index)) {
      player = MockPlayer.getById(index);
    }

    if (!player) {
      player = MockPlayer.findByPartOfName(search);
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

class OptionalParser<T> implements IArgumentParser<T | undefined> {
  constructor(private readonly inner: IArgumentParser<T>) {}

  parse(reader: TokenReader): ParseResult<T | undefined> {
    const position = reader.save();

    const result = this.inner.parse(reader);

    if (result.success) {
      return result;
    }

    reader.restore(position);

    return {
      success: true,
      value: undefined,
    };
  }
}

function parseSchema<S extends Schema>(
  schema: S,
  tokens: string[],
): ParseResult<InferSchema<S>> {
  const reader = new TokenReader(tokens);

  const values: any = {};

  for (const key of Object.keys(schema)) {
    const parser = schema[key];

    const result = parser.parse(reader);

    if (!result.success) {
      throw new InvalidCommandArgumentError(key, result.error);
      // return result;
    }

    values[key] = result.value;
  }

  if (!reader.eof()) {
    throw new UnknownCommandArgumentError(reader.read() ?? "<UNKNOWN>");
    // return {
    //   success: false,
    //   error: `Unexpected argument '${reader.read()}'.`,
    // };
  }

  return {
    success: true,
    value: values,
  };
}

export const Args = {
  number(options?: { min?: number; max?: number }) {
    return new NumberParser(options?.min, options?.max);
  },

  string() {
    return new StringParser();
  },

  rest(options?: { minLength?: number; maxLength?: number }) {
    return new RestParser(options?.minLength, options?.maxLength);
  },

  player() {
    return new PlayerParser();
  },

  // vehicle() {
  //   return new VehicleParser();
  // },

  optional<T>(parser: IArgumentParser<T>) {
    return new OptionalParser(parser);
  },
} as const;

export interface ITypedCommand<S extends Schema> {
  name: CommandName;
  aliases?: CommandName[];
  args: S;
  description?: string;
  handler: (args: InferSchema<S>) => void;
}

export interface ITypedCommandRegistry {
  /**
   * Add a command to the registry.
   * @param command
   */
  addCommand<S extends Schema>(command: ITypedCommand<S>): void;
  /**
   * Remove a command from the registry.
   * @param command
   */
  removeCommand(commandName: CommandName): void;
  /**
   * Sanitise a command name.
   * @param commandName
   */
  sanitiseCommandName(commandName: CommandName): CommandName;
  /**
   * Get the command prefix.
   */
  getPrefix(): CommandPrefix;
  /**
   * Get the commands count.
   */
  getCommandsCount(): number;
  /**
   * Can be used to check if a command exists in the registry.
   */
  hasCommand(commandName: CommandName): boolean;
  /**
   * Execute a command by name with optional arguments.
   */
  parseCommandLine(commandLine: string): boolean;
}

export class TypedCommandRegistry implements ITypedCommandRegistry {
  private rawRegistry: IRawCommandRegistry;

  constructor(private readonly prefix: CommandPrefix) {
    this.rawRegistry = new RawCommandRegistry(prefix);
  }

  getPrefix(): CommandPrefix {
    return this.prefix;
  }

  getCommandsCount(): number {
    return this.rawRegistry.getCommandsCount();
  }

  hasCommand(commandName: CommandName): boolean {
    return this.rawRegistry.hasCommand(commandName);
  }

  public sanitiseCommandName(commandName: CommandName): CommandName {
    return this.rawRegistry.sanitiseCommandName(commandName);
  }

  /**
   * Add a command to the registry.
   * @param command
   */
  public addCommand<S extends Schema>(command: ITypedCommand<S>): void {
    this.rawRegistry.addCommand({
      name: command.name,
      aliases: command.aliases,
      description: command.description,
      handler: (args?: CommandArg[]) => {
        const result = parseSchema(command.args, args ?? []);

        if (!result.success) {
          throw new Error(result.error);
        }

        command.handler(result.value);
      },
    });
  }

  /**
   * Remove a command from the registry.
   */
  public removeCommand(commandName: CommandName): void {
    return this.rawRegistry.removeCommand(commandName);
  }

  /**
   * Execute a command by name with optional arguments.
   * @param commandName
   * @param args
   */
  public parseCommandLine(commandLine: string): boolean {
    return this.rawRegistry.parseCommandLine(commandLine);
  }

  // private findSimilarCommmand(commandName: CommandName): CommandName | null {
  //   return this.rawRegistry.findSimilarCommands(commandName);
  // }

  // private findSimilarCommands(commandName: CommandName): CommandName[] {
  //  return this.rawRegistry.findSimilarCommands(commandName);
  // }
}
