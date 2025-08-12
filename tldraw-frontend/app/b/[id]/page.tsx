import { redirect } from 'next/navigation'
export default function Page({ params }: { params: { id: string } }) {
  redirect(`/board/${params.id}`)
}
