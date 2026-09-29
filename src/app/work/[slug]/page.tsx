import {notFound, redirect} from 'next/navigation'
import {buildPostMetadata, getPost, PostArticle} from '@/components/PostArticle'

export const revalidate = 60

export async function generateMetadata({params}: {params: Promise<{slug: string}>}) {
  const {slug} = await params
  return buildPostMetadata(await getPost(slug, revalidate))
}

export default async function CaseStudyPage({params}: {params: Promise<{slug: string}>}) {
  const {slug} = await params
  const post = await getPost(slug, revalidate)

  if (!post) {
    notFound()
  }

  // Bài thường (chưa bật "Là case study") thuộc về Writing.
  if (!post.isCaseStudy) {
    redirect(`/blog/${post.slug.current}`)
  }

  return <PostArticle post={post} />
}
