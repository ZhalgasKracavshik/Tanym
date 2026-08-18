import { MaterialClient } from './MaterialClient';

export default async function MaterialPage({ params }: PageProps<'/archive/[materialId]'>) {
  const { materialId } = await params;
  return <MaterialClient materialId={materialId} />;
}
