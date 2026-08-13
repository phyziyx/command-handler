/*
 * Command Handler
 *
 * Author: phyziyx
 *
 * Date: 09 August 2026 20:44:00
 *
 * TODO:
 * - Keep using Exceptions/Errors as the main way to handle errors
 * in the command handler? OR Start using the Result pattern for error
 * handling in the command handler?
 * - Add support for command argument parsing and validation, which can be used
 * for adding different argument types and validation rules for commands.
 * - Add support for command context, which can be passed to the command handler.
 * - Add support for command middleware, which can be used to add pre and post processing
 * logic to commands.
 * - Add support for command groups, which can be used to group commands together.
 * - Add support for command permissions, which can be used to restrict access to commands.
 * - Add support for command auto-completion, which can be used to provide suggestions for
 * command names and arguments.
 * - Add support for command similarity matching, which can be used to find similar commands
 * when a command is not found with a given similarity calculation algorithm like Levenshtein distance.
 * - Add support for command overloading, which can be used to define multiple commands with
 * the same name but different argument types.
 * - Add support for command subcommands, which can be used to define commands that have subcommands.
 * - Add support for command i18n, which can be used to provide translations for command names
 * and descriptions.
 */

export {
  CommandAliasAlreadyExistsError,
  CommandAlreadyExistsError,
  CommandDoesNotExistError,
  CommandError,
  InvalidCommandArgumentError,
  InvalidCommandNameError,
  UnknownCommandArgumentError,
} from "./src/errors.ts";

export {
  type IRawCommand,
  type IRawCommandRegistry,
  RawCommandRegistry,
} from "./src/raw.ts";

export {
  ArgumentParser,
  type ITypedCommand,
  type ITypedCommandRegistry,
  type InferSchema,
  parseSchema,
  NumberParser,
  OptionalParser,
  type ParseResult,
  RestParser,
  StringParser,
  TokenReader,
  type Schema,
  TypedCommandRegistry,
} from "./src/typed.ts";

export type {
  CommandArg,
  CommandGroup,
  CommandName,
  CommandPrefix,
} from "./src/types.ts";
