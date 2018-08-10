const saveImage = require('./saveImage');

// field: any
const isImagelessObject = field => typeof field == 'object'
  && field._type !== 'image';

// field: Object<any>
const isImage = field => {
  return typeof field == 'object' &&
    field._type &&
    field._type === 'image' &&
    field.asset;
}

// field: Object<any>
const analyzeField = async (field, actions) => {
  let finalField = field;
  for (const key of Object.keys(field)) {
    let newField = field[key];
    if (isImagelessObject(field[key])) {
      // if it's an object without an image, we want to go deeper
      // into its structure to check for images there
      newField = await analyzeField(newField, actions);
    } else if (isImage(field[key])) {
      // If it's an image field with an asset, save the image
      newField = await saveImage(newField, actions);
    } else {
      // If not an object, we simply skip this key
      continue
    }

    // swap out the previous field with the new one
    finalField = Object.assign(finalField, {
      [key]: newField,
    })
  }
  return finalField;
}

const normalizeNode = async (node, actions) => {
  return analyzeField(node, actions);
}

module.exports = normalizeNode;