const colorizeLog = str => `\x1b[36m${str}\x1b[0m`;

const capitalizeFirstLetter = str => `${str.substr(0,1).toUpperCase()}${str.substr(1,str.length).toLowerCase()}`;

const stringify = (obj, method) => {
  // process Array
  if (Array.isArray(obj)) {
    return obj.map(item => stringify(item, method));
  }

  // process Object and look for attribute name match
  if (typeof obj === 'object' && obj !== null) {
    return Object.keys(obj).reduce((acc, key) => {
      acc[key] = stringify(method(key, obj[key]), method);
      return acc;
    }, {});
  }

  return obj;
};

module.exports = {
  colorizeLog,
  capitalizeFirstLetter,
  stringify,
}