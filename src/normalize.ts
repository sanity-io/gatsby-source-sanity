import saveImage from './saveImage'

// TODO: any way to achieve better type checking?
const isImagelessObject = (field: any) => typeof field == 'object' && field._type !== 'image'

const isImage = (field: any) => {
  return typeof field == 'object' && field._type && field._type === 'image' && field.asset
}

const analyzeField = async (field: any, actions: any) => {
  let finalField = field
  for (const key of Object.keys(field)) {
    let newField = field[key]
    if (isImagelessObject(field[key])) {
      // if it's an object without an image, we want to go deeper
      // into its structure to check for images there
      newField = await analyzeField(newField, actions)
    } else if (isImage(field[key])) {
      // If it's an image field with an asset, save the image
      newField = await saveImage(newField, actions)
    } else {
      // If not an object, we simply skip this key
      continue
    }

    // swap out the previous field with the new one
    finalField = Object.assign(finalField, {
      [key]: newField
    })
  }
  return finalField
}

export default analyzeField
