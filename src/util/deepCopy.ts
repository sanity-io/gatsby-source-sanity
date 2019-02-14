function isPlainObject(value: any): boolean {
  if (Object.prototype.toString.call(value) !== '[object Object]') {
    return false
  } else {
    const prototype = Object.getPrototypeOf(value)
    return prototype === null || prototype === Object.prototype
  }
}

function copyValue(value: any, maxDepth: number, currentDepth: number): any {
  const name = typeof value
  if (name === 'string' || name === 'boolean' || name === 'number') {
    return value.valueOf()
  }

  if (Array.isArray(value)) {
    if (currentDepth > maxDepth) {
      return []
    }
    return value.map(item => copyValue(item, maxDepth, currentDepth + 1))
  }

  if (isPlainObject(value)) {
    if (currentDepth > maxDepth) {
      return {}
    }
    const copiedObject: {[key: string]: any} = {}
    Object.keys(value).forEach(key => {
      const result = copyValue(value[key], maxDepth, currentDepth + 1)
      copiedObject[key] = result
    })
    return copiedObject
  }
  throw new Error(`Unable to copy value: ${value}`)
}

// Deep copy any json object. Arrays or objects deeper than maxDepth return as empty [] or {}
export function deepCopy(value: any, maxDepth: number): any {
  return copyValue(value, maxDepth, 1)
}
