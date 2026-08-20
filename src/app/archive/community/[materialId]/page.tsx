import { CommunityMaterialClient } from './CommunityMaterialClient';

export default async function CommunityMaterialPage({ params }: PageProps<'/archive/community/[materialId]'>) {
  const { materialId } = await params;
  return <CommunityMaterialClient materialId={materialId} />;
}
