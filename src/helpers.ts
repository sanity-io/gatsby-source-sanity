const colorizeLog = (str: string) => `\x1b[36m${str}\x1b[0m`

const capitalizeFirstLetter = (str: string) =>
  `${str.substr(0, 1).toUpperCase()}${str.substr(1, str.length).toLowerCase()}`

type TStringifyMethod = (key: string, value: any) => any

// TODO: better type checking
const stringify: any = (obj: any, method: TStringifyMethod) => {
  // process Array
  if (Array.isArray(obj)) {
    return obj.map(item => stringify(item, method))
  }

  // process Object and look for attribute name match
  if (typeof obj === 'object' && obj !== null) {
    return Object.keys(obj).reduce((acc, key) => {
      acc[key] = stringify(method(key, obj[key]), method)
      return acc
    }, {})
  }

  return obj
}

export {colorizeLog, capitalizeFirstLetter, stringify}
