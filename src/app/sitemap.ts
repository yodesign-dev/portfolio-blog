import type {MetadataRoute} from 'next'
import {client} from '@/sanity/lib/client'
import {SITE_URL} from '@/lib/site'

export const revalidate = 3600

type SitemapPost = {slug: string; isCaseStudy?: boolean; _updatedAt: string}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await client
    .fetch<SitemapPost[]>(
      `*[_type == "post" && defined(slug.current)]{"slug": slug.current, isCaseStudy, _updatedAt}`,
      {},
      {next: {revalidate}}
    )
    .catch(() => [])

  const staticRoutes = ['', '/work', '/blog', '/tools', '/tools/timeline'].map((path) => ({
    url: `${SITE_URL}${path}`,
  }))

  const postRoutes = posts.map((post) => ({
    url: `${SITE_URL}${post.isCaseStudy ? '/work' : '/blog'}/${post.slug}`,
    lastModified: post._updatedAt,
  }))

  return [...staticRoutes, ...postRoutes]
}
