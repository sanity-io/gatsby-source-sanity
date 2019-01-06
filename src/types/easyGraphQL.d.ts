declare module 'easygraphql-mock' {
  type MockMap = {[key: string]: {[key: string]: any}}
  type ScalarMockMap = {[key: string]: any}

  function mockSchema(sdl: string, providedValues?: MockMap): MockMap
  function mockSchema(sdl: string, providedValues?: ScalarMockMap): MockMap

  export = mockSchema
}
