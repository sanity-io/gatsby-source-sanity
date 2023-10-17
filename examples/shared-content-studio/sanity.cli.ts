import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: 'rz9j51w2',
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
    },
  ],
})
