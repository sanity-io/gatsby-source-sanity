export const pluginPrefix = 'gatsby-source-sanity'

export function prefixId(id: string) {
  return `${pluginPrefix}_${id}`
}

enum ReporterLevel {
  Error = 'ERROR',
}

enum ReporterCategory {
  // Error caused by user (typically, site misconfiguration)
  User = 'USER',
  // Error caused by Sanity plugin ("third party" relative to Gatsby Cloud)
  ThirdParty = 'THIRD_PARTY',
  // Error caused by Gatsby process
  System = 'SYSTEM',
}

export const ERROR_CODES = {
  UnsupportedGatsbyVersion: '10000',
  SchemaFetchError: '10001',
  MissingProjectId: '10002',
  MissingDataset: '10002',
  InvalidToken: '10003',
  ExpiredToken: '10004',
  WrongProjectToken: '10005',
}

export const ERROR_MAP = {
  [ERROR_CODES.UnsupportedGatsbyVersion]: {
    text: (context: any) => context.sourceMessage,
    level: ReporterLevel.Error,
    category: ReporterCategory.User,
  },
  [ERROR_CODES.SchemaFetchError]: {
    text: (context: any) => context.sourceMessage,
    level: ReporterLevel.Error,
    category: ReporterCategory.ThirdParty,
  },
  [ERROR_CODES.MissingProjectId]: {
    text: (context: any) => context.sourceMessage,
    level: ReporterLevel.Error,
    category: ReporterCategory.User,
  },
  [ERROR_CODES.MissingDataset]: {
    text: (context: any) => context.sourceMessage,
    level: ReporterLevel.Error,
    category: ReporterCategory.User,
  },
  [ERROR_CODES.InvalidToken]: {
    text: (context: any) => context.sourceMessage,
    level: ReporterLevel.Error,
    category: ReporterCategory.User,
  },
  [ERROR_CODES.ExpiredToken]: {
    text: (context: any) => context.sourceMessage,
    level: ReporterLevel.Error,
    category: ReporterCategory.User,
  },
  [ERROR_CODES.WrongProjectToken]: {
    text: (context: any) => context.sourceMessage,
    level: ReporterLevel.Error,
    category: ReporterCategory.User,
  },
}

// Map Sanity API errors to plugin errors
export const SANITY_ERROR_CODE_MAP: Record<string, string> = {
  'SIO-401-ANF': ERROR_CODES.InvalidToken,
  'SIO-401-AWH': ERROR_CODES.WrongProjectToken,
  'SIO-401-AEX': ERROR_CODES.ExpiredToken,
}

export const SANITY_ERROR_CODE_MESSAGES: Record<string, string> = {
  'SIO-401-ANF': 'The token specified is not valid or has been deleted',
  'SIO-401-AWH': 'The token specified does not belong to the configured project',
  'SIO-401-AEX':
    'The token specified is expired - use API tokens instead of user tokens to prevent this from happening',
}

export class ErrorWithCode extends Error {
  public code?: string | number

  constructor(message: string, code?: string | number) {
    super(message)
    this.code = code
  }
}
