import * as React from 'react'
import {GatsbyImage} from 'gatsby-plugin-image'
import {graphql} from 'gatsby'

export default function Page({data}) {
  return (
    <>
      <div className="relative bg-gray-50 px-4 pb-20 pt-16 sm:px-6 lg:px-8 lg:pb-28 lg:pt-24">
        <div className="absolute inset-0">
          <div className="h-1/3 bg-white sm:h-2/3" />
        </div>
        <div className="relative mx-auto max-w-7xl">
          <div className="mx-auto mt-12 grid max-w-lg gap-5 lg:max-w-none lg:grid-cols-3">
            {data.allSanityBook.edges.map(({node}) => (
              <div key={node._id} className="flex flex-col overflow-hidden rounded-lg shadow-lg">
                <div className="flex flex-1 flex-col justify-between bg-white p-6">
                  <div className="flex-1">
                    <a className="mt-2 block">
                      <p className="text-xl font-semibold text-gray-900">{node.title}</p>
                    </a>
                  </div>
                  <div className="mt-6 flex items-center">
                    <div className="flex-shrink-0">
                      {/* <span className="sr-only">{node.author.name}</span> */}
                      {/* {node.author?.image ? (
                        <GatsbyImage
                          alt=""
                          className="h-10 w-10 rounded-full"
                          image={node.author.image.asset.gatsbyImageData}
                        />
                      ) : null} */}
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">
                        {/* <a className="hover:underline">{node.author.name}</a> */}
                      </p>
                      <div className="flex space-x-1 text-sm text-gray-500">
                        <time dateTime={node.publishedAt?.toJSON?.()}>
                          {node.publishedAt?.toLocaleDateString?.()}
                        </time>
                        <span aria-hidden="true">&middot;</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

export const Head = () => <title>gatsby-source-sanity</title>

export const query = graphql`
  query {
    allSanityBook {
      edges {
        node {
          _id
          title
        }
      }
    }
  }
`
