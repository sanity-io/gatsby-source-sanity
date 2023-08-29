This Sanity Studio is for content models and content for the shared-content example app

The project has two datasets: production and shared. These are configured in separate workspaces in this project and there is content that links between the datasets. You can see and dereference this content with the following query against the production dataset using at least API version 2022-03-07:

https://jn1oq55b.api.sanity.io/v2022-03-07/data/query/production

```groq
* [_type == "book"] {
  title,
  author-> {name} // This is the cross-dataset reference
}
```