import { B2CPropertyDetail } from "@/b2c-snippy/components/B2CPropertyDetail"

export default function PropertyPage({ params }: { params: Promise<{ id: string }> }) {
  return <B2CPropertyDetail params={params} />
}
