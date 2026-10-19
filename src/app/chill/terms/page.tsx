import {LegalPage} from '@/components/chill/LegalPage'
import {pageMetadata} from '@/lib/site'
import {getLegal} from '../legal'

export const revalidate = 300

export const metadata = pageMetadata({
  title: 'Chill · Terms & copyright',
  description: 'The rules of the /chill pixel café: who owns the art and music, how you may embed it, and what you can post.',
  path: '/chill/terms',
})

export default async function ChillTermsPage() {
  return <LegalPage kind="terms" content={await getLegal('terms', revalidate)} />
}
