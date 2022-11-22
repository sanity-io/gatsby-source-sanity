import * as React from 'react'
import {GatsbyImage} from 'gatsby-plugin-image'
import {graphql} from 'gatsby'

export default function Page({data}) {
  return (
    <>
      <div className="relative px-4 pt-16 pb-20 bg-gray-50 sm:px-6 lg:px-8 lg:pt-24 lg:pb-28">
        <div className="absolute inset-0">
          <div className="bg-white h-1/3 sm:h-2/3" />
        </div>
        <div className="relative mx-auto max-w-7xl">
          <div className="grid max-w-lg gap-5 mx-auto mt-12 lg:max-w-none lg:grid-cols-3">
            {data.allSanityPost.edges.map(({node}) => (
              <div key={node._id} className="flex flex-col overflow-hidden rounded-lg shadow-lg">
                <div className="flex-shrink-0">
                  {node.mainImage ? (
                    <GatsbyImage
                      alt=""
                      className="object-cover w-full h-48"
                      image={node.mainImage.asset.gatsbyImageData}
                    />
                  ) : null}
                </div>
                <div className="flex flex-col justify-between flex-1 p-6 bg-white">
                  <div className="flex-1">
                    <a className="block mt-2">
                      <p className="text-xl font-semibold text-gray-900">{node.title}</p>
                    </a>
                  </div>
                  <div className="flex items-center mt-6">
                    <div className="flex-shrink-0">
                      <span className="sr-only">{node.author.name}</span>
                      {node.author?.image ? (
                        <GatsbyImage
                          alt=""
                          className="w-10 h-10 rounded-full"
                          image={node.author.image.asset.gatsbyImageData}
                        />
                      ) : null}
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">
                        <a className="hover:underline">{node.author.name}</a>
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
    allSanityPost {
      edges {
        node {
          _id
          title
          slug {
            current
          }
          mainImage {
            asset {
              gatsbyImageData(placeholder: BLURRED)
            }
          }
          publishedAt
          author {
            name
            image {
              asset {
                gatsbyImageData(placeholder: BLURRED)
              }
            }
          }
        }
      }
    }
  }
`
