import { type IRawCommandRegistry, RawCommandRegistry } from "./raw.ts";
import type { CommandArg, CommandName, CommandPrefix } from "./types.ts";

export type ParseResult<T> =
  | {
      success: true;
      value: T;
    }
  | {
      success: false;
      error: string;
    };

export type Schema = Record<string, ArgumentParser<any>>;

export type InferSchema<T extends Schema> = {
  [K in keyof T]: T[K] extends ArgumentParser<infer U> ? U : never;
};

export abstract class ArgumentParser<T> {
  abstract readonly usage: string;

  abstract parse(reader: TokenReader): ParseResult<T>;

  protected success(value: T): ParseResult<T> {
    return { success: true, value };
  }

  protected failure(error: string): ParseResult<T> {
    return { success: false, error };
  }
}

export class TokenReader {
  private readonly tokens: string[];
  private index = 0;

  constructor(tokens: string[]) {
    this.tokens = tokens;
  }

  public peek(offset = 0): string | undefined {
    return this.tokens[this.index + offset];
  }

  public read(): string | undefined {
    if (this.eof()) return undefined;
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

export class NumberParser extends ArgumentParser<number> {
  readonly usage = "<number>";

  private readonly min?: number;
  private readonly max?: number;

  constructor(min?: number, max?: number) {
    super();

    this.min = min;
    this.max = max;
  }

  parse(reader: TokenReader): ParseResult<number> {
    const token = reader.read()?.trim();

    if (!token) {
      return this.failure("Expected number.");
    }

    const value = Number(token);

    if (!Number.isFinite(value)) {
      return this.failure(`'${token}' is not a number.`);
    } else if (this.min !== undefined && value < this.min) {
      return this.failure(`Number must be at least ${this.min}.`);
    } else if (this.max !== undefined && value > this.max) {
      return this.failure(`Number must be at most ${this.max}.`);
    }

    return this.success(value);
  }
}

export class StringParser extends ArgumentParser<string> {
  readonly usage = "<string>";

  parse(reader: TokenReader): ParseResult<string> {
    const token = reader.read();

    if (!token) {
      return this.failure("Expected text.");
    }

    return this.success(token);
  }
}

export class RestParser extends ArgumentParser<string> {
  readonly usage = "<text...>";

  private readonly minLength?: number;
  private readonly maxLength?: number;

  constructor(_minLength?: number, _maxLength?: number) {
    super();

    this.minLength = _minLength;
    this.maxLength = _maxLength;
  }

  parse(reader: TokenReader): ParseResult<string> {
    const value = reader.remainingAsString();

    while (!reader.eof()) {
      reader.read();
    }

    let length = value.length;
    if (this.minLength !== undefined && length < this.minLength) {
      return this.failure(
        `Text must be at least ${this.minLength} characters long.`,
      );
    } else if (this.maxLength !== undefined && length > this.maxLength) {
      return this.failure(
        `Text must be at most ${this.maxLength} characters long.`,
      );
    }

    return this.success(value);
  }
}

export class OptionalParser<T> extends ArgumentParser<T | undefined> {
  readonly usage: string = "<optional (%s)>";

  private readonly inner: ArgumentParser<T>;

  constructor(_inner: ArgumentParser<T>) {
    super();

    this.inner = _inner;
    this.usage = this.usage.replace("%s", _inner.usage);
  }

  parse(reader: TokenReader): ParseResult<T | undefined> {
    if (reader.peek() === undefined) {
      return this.success(undefined);
    }

    const position = reader.save();

    const result = this.inner.parse(reader);

    if (result.success) {
      return result;
    }

    reader.restore(position);

    return this.success(undefined);
  }
}

export function parseSchema<S extends Schema>(
  schema: S,
  tokens: string[],
): ParseResult<InferSchema<S>> {
  const reader = new TokenReader(tokens);

  const values: any = {};

  for (const key of Object.keys(schema)) {
    const parser = schema[key];

    const result = parser.parse(reader);

    if (!result.success) {
      // throw new InvalidCommandArgumentError(key, result.error);
      return result;
    }

    values[key] = result.value;
  }

  if (!reader.eof()) {
    // throw new UnknownCommandArgumentError(reader.read() ?? "<UNKNOWN>");
    return {
      success: false,
      error: `Unexpected argument '${reader.read() ?? "<UNKNOWN>"}'.`,
    };
  }

  return {
    success: true,
    value: values,
  };
}

export type ITypedCommand<S extends Schema | undefined = undefined> =
  S extends Schema ?
    {
      name: CommandName;
      aliases?: CommandName[];
      args: S;
      description?: string;
      handler: (args: InferSchema<S>) => void;
    }
  : {
      name: CommandName;
      aliases?: CommandName[];
      args?: undefined;
      description?: string;
      handler: () => void;
    };

export interface ITypedCommandRegistry {
  /**
   * Add a command to the registry.
   * @param command
   */
  addCommand<S extends Schema | undefined>(command: ITypedCommand<S>): void;
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

export interface ISyntaxGenerator {
  generate<S extends Schema | undefined>(command: ITypedCommand<S>): string;
}

export class DefaultSyntaxGenerator implements ISyntaxGenerator {
  generate<S extends Schema | undefined>(command: ITypedCommand<S>): string {
    if (!command.args) return "";

    return Object.keys(command.args)
      .map((k) => command.args![k].usage)
      .join(" ");
  }
}

export class TypedCommandRegistry implements ITypedCommandRegistry {
  private rawRegistry: IRawCommandRegistry;
  private syntaxGenerator: ISyntaxGenerator;

  constructor(_prefix: CommandPrefix, syntaxGenerator?: ISyntaxGenerator) {
    this.rawRegistry = new RawCommandRegistry(_prefix);
    this.syntaxGenerator = syntaxGenerator ?? new DefaultSyntaxGenerator();
  }

  getPrefix(): CommandPrefix {
    return this.rawRegistry.getPrefix();
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
  public addCommand<S extends Schema | undefined>(
    command: ITypedCommand<S>,
  ): void {
    this.rawRegistry.addCommand({
      name: command.name,
      aliases: command.aliases,
      syntax: this.syntaxGenerator.generate(command),
      description: command.description,
      handler: (args?: CommandArg[]) => {
        if (!command.args) {
          command.handler();
          return;
        }

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
