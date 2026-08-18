import { LearnClient } from './LearnClient';

export default async function LearnPage({ params }: PageProps<'/learn/[topicId]'>) {
  const { topicId } = await params;
  return <LearnClient topicId={topicId} />;
}
