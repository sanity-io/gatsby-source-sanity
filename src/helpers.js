const colorizeLog = str => `\x1b[36m${str}\x1b[0m`;

const capitalizeFirstLetter = str => `${str.substr(0,1).toUpperCase()}${str.substr(1,str.length).toLowerCase()}`;

module.exports = {
  colorizeLog,
  capitalizeFirstLetter,
}