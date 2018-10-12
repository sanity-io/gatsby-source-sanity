const { createRemoteFileNode } = require("gatsby-source-filesystem");

const saveImage = async (field: any, actions: any) => {
  const { urlFor, cache, store, createNode, createNodeId, touchNode } = actions;

  // Build the URL for the image using Sanity's package
  const imageUrl = urlFor(field.asset).url();
  if (imageUrl) {
    let fileNodeID;
    const mediaDataCacheKey = `sanity-media-${imageUrl}`;
    const cacheMediaData = await cache.get(mediaDataCacheKey);

    if (cacheMediaData) {
      fileNodeID = cacheMediaData.fileNodeID;
      touchNode({ nodeId: cacheMediaData.fileNodeID });
    }

    if (!fileNodeID) {
      try {
        const fileNode = await createRemoteFileNode({
          url: imageUrl,
          store,
          cache,
          createNode,
          createNodeId
        });

        if (fileNode) {
          fileNodeID = fileNode.id;
          await cache.set(mediaDataCacheKey, { fileNodeID });
        }
      } catch (error) {
        console.error(
          `An image failed to be saved to internal storage: ${error}`
        );
      }
    }

    if (fileNodeID) {
      // after stored in cache, add this file node id to
      // a field localFile in the root of the
      // image object and also add the imageUrl field
      // Take a look at GraphiQl to understand the data
      field = {
        ...field,
        imageUrl,
        localFile___NODE: fileNodeID
      };
    }
  } else {
    console.error(
      `An image field has an incomplete asset object or something went wrong when creating its URL`
    );
  }

  return field;
};

export default saveImage;
