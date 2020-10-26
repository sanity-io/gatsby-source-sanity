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

export const CODES = {
  UnsupportedGatsbyVersion: '10000',
  SchemaFetchError: '10001',
  MissingProjectId: '10002',
  MissingDataset: '10002',
}

export const ERROR_MAP = {
  [CODES.UnsupportedGatsbyVersion]: {
    text: (context: any) => context.sourceMessage,
    level: ReporterLevel.Error,
    category: ReporterCategory.User,
  },
  [CODES.SchemaFetchError]: {
    text: (context: any) => context.sourceMessage,
    level: ReporterLevel.Error,
    category: ReporterCategory.ThirdParty,
  },
  [CODES.MissingProjectId]: {
    text: (context: any) => context.sourceMessage,
    level: ReporterLevel.Error,
    category: ReporterCategory.User,
  },
  [CODES.MissingDataset]: {
    text: (context: any) => context.sourceMessage,
    level: ReporterLevel.Error,
    category: ReporterCategory.User,
  },
}
