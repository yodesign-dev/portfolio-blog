import {LegalPage} from '@/components/chill/LegalPage'
import {pageMetadata} from '@/lib/site'
import {getLegal} from '../legal'

export const revalidate = 300

export const metadata = pageMetadata({
  title: 'Chill · Privacy',
  description: 'What the /chill pixel café stores, where, and for how long. No account, no ads, no tracking cookies.',
  path: '/chill/privacy',
})

export default async function ChillPrivacyPage() {
  return <LegalPage kind="privacy" content={await getLegal('privacy', revalidate)} />
}
