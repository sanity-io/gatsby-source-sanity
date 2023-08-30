import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: 'jn1oq55b',
    dataset: 'production',
  },
  graphql: [
    {
      id: 'books',
      workspace: 'books',
    },
    {
      id: 'authors',
      workspace: 'authors',
    }
  ]
})
